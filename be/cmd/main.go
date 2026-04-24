package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/duynguyendang/manglekit/config"
	"github.com/duynguyendang/manglekit/providers/google"
	"github.com/duynguyendang/manglekit/sdk"
	"github.com/google/generative-ai-go/genai"
	"github.com/duynguyendang/savia-be/internal/tts"
	"google.golang.org/api/option"
)

var (
	mkClient             *sdk.Client
	defaultAPIKey        string
	manglekitInitialized bool
)

func main() {
	ctx := context.Background()

	// Get default API key from environment
	defaultAPIKey = os.Getenv("GOOGLE_API_KEY")
	if defaultAPIKey == "" {
		defaultAPIKey = os.Getenv("GEMINI_API_KEY")
	}
	if defaultAPIKey != "" {
		log.Printf("Default API key found: %s...", defaultAPIKey[:4])
	} else {
		log.Println("Warning: No default API key configured (users must provide their own)")
	}

	// Initialize Manglekit (optional - will fallback if fails)
	err := initManglekit(ctx)
	if err != nil {
		log.Printf("Manglekit initialization failed (will use fallback mode): %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)

	http.HandleFunc("/health", enableCORS(HealthHandler))
	http.HandleFunc("/v1/reason", enableCORS(ReasonHandler()))
	http.HandleFunc("/v1/speak", enableCORS(SpeakHandler))

	srv := &http.Server{
		Addr: ":" + port,
	}

	go func() {
		log.Printf("Listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}

func initManglekit(ctx context.Context) error {
	if defaultAPIKey == "" {
		return fmt.Errorf("no API key available for Manglekit")
	}

	cfg := &config.Config{
		Policy: config.PolicyConfig{
			Path: "./resources/rules.dl",
		},
	}

	opts := []sdk.ClientOption{
		sdk.WithConfig(cfg),
		google.Enable(defaultAPIKey, "gemini-2.0-flash", "generate"),
	}

	var err error
	mkClient, err = sdk.NewClient(ctx, opts...)
	if err != nil {
		return fmt.Errorf("failed to create Manglekit client: %w", err)
	}

	log.Println("Manglekit initialized successfully")
	manglekitInitialized = true
	return nil
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	status := "OK"
	if !manglekitInitialized {
		status = "OK (fallback mode)"
	}
	fmt.Fprint(w, status)
}

type ReasonRequest struct {
	UserID  string `json:"user_id"`
	Message string `json:"message"`
	Role    string `json:"role,omitempty"`
}

type ReasonResponse struct {
	Text             string `json:"text"`
	VoiceInstruction string `json:"voice_instruction"`
	SearchStrategy   string `json:"search_strategy,omitempty"`
	Intent           string `json:"intent,omitempty"`
}

func ReasonHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req ReasonRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if defaultAPIKey == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Server misconfigured: API key not set"})
			return
		}
		apiKey := defaultAPIKey

		ctx := r.Context()

		// Validate API key format (basic check)
		if len(apiKey) < 10 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid API key format."})
			return
		}

		userID := req.UserID
		if userID == "" {
			userID = "demo_user"
		}

		// Extract intent using LLM
		intent, intentErr := detectIntentWithLLM(ctx, apiKey, req.Message)
		if intentErr != nil {
			log.Printf("LLM intent detection failed: %v", intentErr)
			intent = detectIntentFallback(req.Message)
		}
		log.Printf("Intent: %s, userID: %s", intent, userID)

		// Get mock user data
		balance, transactions := getMockUserData(userID)

		// Process with single LLM call (intent + response combined)
		response, err := processUserQuery(ctx, apiKey, req.Message, intent, balance, transactions)

		if err != nil {
			log.Printf("processUserQuery failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

func processWithManglekit(ctx context.Context, facts []string, query, apiKey string) (*ReasonResponse, error) {
	if mkClient == nil {
		return nil, fmt.Errorf("Manglekit not initialized")
	}

	// === VERIFY: Security Check (halt) ===
	resHalt, err := mkClient.Engine().Query(ctx, facts, "halt(Msg)")
	if err != nil {
		log.Printf("Halt query error: %v", err)
	} else if len(resHalt) > 0 {
		msg := "Access denied"
		if m, ok := resHalt[0]["Msg"]; ok {
			msg = m
		}
		return &ReasonResponse{
			Text:             fmt.Sprintf("Security Policy: %s", msg),
			VoiceInstruction: "neutral",
		}, fmt.Errorf("halted: %s", msg)
	}

	// === DECIDE: Get Search Strategy ===
	strategy := "direct"
	resStrat, err := mkClient.Engine().Query(ctx, facts, "search_strategy(S)")
	if err != nil {
		log.Printf("Strategy query error: %v", err)
	} else if len(resStrat) > 0 {
		if s, ok := resStrat[0]["S"]; ok {
			strategy = s
		}
	}

	// === Get Prompt Template ===
	templateID := "standard"
	resTmpl, _ := mkClient.Engine().Query(ctx, facts, "active_template(T)")
	if len(resTmpl) > 0 {
		if t, ok := resTmpl[0]["T"]; ok {
			templateID = t
		}
	}

	// === Get Blueprint Content ===
	blueprint := ""
	resBP, _ := mkClient.Engine().Query(ctx, facts, fmt.Sprintf(`prompt_blueprint("%s", C)`, templateID))
	if len(resBP) > 0 {
		if c, ok := resBP[0]["C"]; ok {
			blueprint = c
		}
	}

	// === Get Voice Instruction ===
	voiceID := "stable"
	resVoice, _ := mkClient.Engine().Query(ctx, facts, "active_voice_id(ID)")
	if len(resVoice) > 0 {
		if v, ok := resVoice[0]["ID"]; ok {
			voiceID = v
		}
	}

	// === ACT: Generate Response ===
	prompt := query
	if blueprint != "" {
		prompt = fmt.Sprintf("%s\n\nContext: %s", blueprint, query)
	}

	resp, err := mkClient.ExecuteByName(ctx, "generate", prompt)
	var text string
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}
	if str, ok := resp.Payload.(string); ok {
		text = str
	} else {
		text = fmt.Sprintf("%v", resp.Payload)
	}

	return &ReasonResponse{
		Text:             text,
		VoiceInstruction: voiceID,
		SearchStrategy:   strategy,
		Intent:           facts[1],
	}, nil
}

func processUserQuery(ctx context.Context, apiKey, query, intent string, balance string, transactions []string) (*ReasonResponse, error) {
	cl, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	model := cl.GenerativeModel("gemini-3-flash-preview")
	model.Tools = []*genai.Tool{}
	model.SetTemperature(0.7)
	model.SetTopP(0.95)
	model.SetTopK(40)

	// Build context with user data
	txList := strings.Join(transactions, ", ")
	accessLevel := fmt.Sprintf("User's account balance: %s. Recent transactions: %s.", balance, txList)

	// Intent-specific instructions
	intentInstructions := map[string]string{
		"check_balance":      "Provide the exact balance if admin. If not admin, explain how to access balance via the app.",
		"transaction_history": "List recent transactions if admin. If not admin, explain how to view transaction history.",
		"transfer_money":     "Explain the transfer process, limits, and how to initiate. Ask for recipient details if ready.",
		"withdraw":          "Explain withdrawal options, limits, and any fees involved.",
		"account_info":      "Provide general account information based on available data.",
		"account_settings":  "Guide user through available account settings options.",
		"security":         "Explain security features and recommend official channels for sensitive issues.",
		"card_services":     "Explain available card services, activation, and management options.",
		"loan":             "Provide general information about loan products. Recommend visiting branch for detailed advice.",
		"investments":      "Explain investment product options and risks. Recommend consulting a financial advisor.",
		"insurance":        "Explain available insurance products and coverage options.",
		"support":          "Offer helpful assistance and guide to appropriate resources.",
		"complaint":        "Acknowledge the complaint empathetically and guide to resolution process.",
		"feedback":         "Thank user for feedback and explain how it will be used.",
		"policy_inquiry":   "Explain relevant policies clearly and concisely.",
		"fraud_security":   "Urge immediate action for suspected fraud. Provide emergency contact information.",
	}

	instr := intentInstructions[intent]
	if instr == "" {
		instr = "Provide helpful, accurate, and concise information."
	}

	systemPrompt := fmt.Sprintf(`You are Savia, a professional banking assistant with neuro-symbolic reasoning capabilities.

User Data: %s

Intent: %s

Instructions: %s

Guidelines:
- Be professional, precise, and sophisticated in tone
- Provide specific numbers and account details when available
- Be helpful and comprehensive in responses
- If unsure, recommend official channels (app, branch, hotline)`, accessLevel, intent, instr)

	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(systemPrompt),
		},
	}

	resp, err := model.GenerateContent(ctx, genai.Text(query))
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	text := "I'm sorry, I couldn't process that request. Please try again."
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		text = fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
	} else {
		log.Printf("Empty or filtered response. Candidates count: %d", len(resp.Candidates))
		if len(resp.Candidates) > 0 && resp.Candidates[0].FinishReason != 0 {
			log.Printf("Finish reason: %v", resp.Candidates[0].FinishReason)
		}
	}

	voiceInstruction := "stable"
	switch intent {
	case "support", "complaint", "feedback", "general":
		voiceInstruction = "expressive"
	}

	return &ReasonResponse{
		Text:             text,
		VoiceInstruction: voiceInstruction,
		SearchStrategy:   "single_llm_call",
		Intent:           intent,
	}, nil
}

// Mock User Database
var mockUsers = map[string]struct {
	Balance     string
	Transactions []string
	Name        string
	Email       string
}{
	"demo_user": {
		Balance:    "$12,450.00",
		Transactions: []string{
			"1) Grocery Store - $85.50",
			"2) Netflix - $15.99",
			"3) Gas Station - $42.30",
			"4) Salary Deposit - $3,500.00",
			"5) Coffee Shop - $6.75",
		},
		Name:  "Demo User",
		Email: "demo@example.com",
	},
	"user_123": {
		Balance:    "$8,230.50",
		Transactions: []string{
			"1) Amazon - $156.00",
			"2) Spotify - $9.99",
			"3) Electric Bill - $89.50",
			"4) Paycheck - $2,800.00",
			"5) Restaurant - $45.00",
		},
		Name:  "John Doe",
		Email: "john@example.com",
	},
}

func getMockUserData(userID string) (string, []string) {
	if user, ok := mockUsers[userID]; ok {
		return user.Balance, user.Transactions
	}
	// Default user
	return "$5,000.00", []string{
		"1) Sample Transaction - $50.00",
		"2) Another Purchase - $25.00",
	}
}

func detectIntentFallback(query string) string {
	// Keyword-based intent detection
	q := strings.ToLower(query)

	// Financial queries
	if strings.Contains(q, "balance") || strings.Contains(q, "how much") || strings.Contains(q, "total") {
		return "check_balance"
	}
	if strings.Contains(q, "transaction") || strings.Contains(q, "history") || strings.Contains(q, "past") || strings.Contains(q, "record") {
		return "transaction_history"
	}
	if strings.Contains(q, "transfer") || strings.Contains(q, "send money") || strings.Contains(q, "pay") {
		return "transfer_money"
	}
	if strings.Contains(q, "withdraw") || strings.Contains(q, "cash out") {
		return "withdraw"
	}

	// Account queries
	if strings.Contains(q, "profile") || strings.Contains(q, "account info") || strings.Contains(q, "my info") {
		return "account_info"
	}
	if strings.Contains(q, "setting") || strings.Contains(q, "preference") || strings.Contains(q, "option") {
		return "account_settings"
	}
	if strings.Contains(q, "password") || strings.Contains(q, "pin") || strings.Contains(q, "security") {
		return "security"
	}

	// Product/service queries
	if strings.Contains(q, "card") || strings.Contains(q, "debit") || strings.Contains(q, "credit") {
		return "card_services"
	}
	if strings.Contains(q, "loan") || strings.Contains(q, "borrow") {
		return "loan"
	}
	if strings.Contains(q, "invest") || strings.Contains(q, "stock") || strings.Contains(q, "fund") {
		return "investments"
	}
	if strings.Contains(q, "insurance") || strings.Contains(q, "cover") {
		return "insurance"
	}

	// Support queries
	if strings.Contains(q, "help") || strings.Contains(q, "support") || strings.Contains(q, "assist") {
		return "support"
	}
	if strings.Contains(q, "complaint") || strings.Contains(q, "problem") || strings.Contains(q, "issue") {
		return "complaint"
	}
	if strings.Contains(q, "feedback") || strings.Contains(q, "review") || strings.Contains(q, "suggest") {
		return "feedback"
	}

	// Policy/safety queries
	if strings.Contains(q, "policy") || strings.Contains(q, "rule") || strings.Contains(q, "term") {
		return "policy_inquiry"
	}
	if strings.Contains(q, "block") || strings.Contains(q, "freeze") || strings.Contains(q, "fraud") {
		return "fraud_security"
	}

return "general"
}

func detectIntentWithLLM(ctx context.Context, apiKey, query string) (string, error) {
	cl, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", err
	}

	model := cl.GenerativeModel("gemini-3-flash-preview")
	model.Tools = []*genai.Tool{}
	model.SetTemperature(0.1)

	prompt := fmt.Sprintf(`You are an intent classifier for a banking assistant. Classify the user query into ONE of these intents:

Financial:
- check_balance
- transaction_history
- transfer_money
- withdraw

Account:
- account_info
- account_settings
- security

Products:
- card_services
- loan
- investments
- insurance

Support:
- support
- complaint
- feedback

Safety:
- policy_inquiry
- fraud_security

General:
- general (anything that doesn't fit above)

Query: "%s"

Respond with ONLY the intent name in lowercase. Example: check_balance`, query)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	intent := "general"
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		intent = strings.TrimSpace(strings.ToLower(fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])))
	}

	return intent, nil
}

func SpeakHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if defaultAPIKey == "" {
		http.Error(w, "Server misconfigured: API key not set", http.StatusInternalServerError)
		return
	}

	var req struct {
		Text             string `json:"text"`
		VoiceInstruction string `json:"voice_instruction"`
		Model            string `json:"model"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := tts.StreamGeminiSpeech(w, req.Text, req.VoiceInstruction, defaultAPIKey); err != nil {
		log.Printf("TTS error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
