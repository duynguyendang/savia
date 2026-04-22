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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Gemini-Api-Key, X-Admin-Mode, Authorization")
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

		// Get API key (user-provided or default)
		apiKey := r.Header.Get("X-Gemini-Api-Key")
		if apiKey == "" {
			apiKey = defaultAPIKey
		}

		if apiKey == "" {
			http.Error(w, "API key not configured", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()

		// Check for admin mode (via header or request body)
		isAdmin := r.Header.Get("X-Admin-Mode") == "true" || req.Role == "admin"
		userID := req.UserID
		if userID == "" {
			userID = "demo_user"
		}

		// Extract intent using LLM
		intent, intentErr := detectIntentWithLLM(ctx, apiKey, req.Message)
		if intentErr != nil {
			intent = detectIntent(req.Message)
			log.Printf("LLM intent detection failed: %v", intentErr)
		}
		log.Printf("Intent: %s, isAdmin: %v, userID: %s", intent, isAdmin, userID)

		// Get mock user data
		balance, transactions := getMockUserData(userID)

		// Process with single LLM call (intent + response combined)
		response, err := processUserQuery(ctx, apiKey, req.Message, intent, isAdmin, balance, transactions)

		if err != nil {
			log.Printf("processUserQuery failed: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
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

func processUserQuery(ctx context.Context, apiKey, query, intent string, isAdmin bool, balance string, transactions []string) (*ReasonResponse, error) {
	cl, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	model := cl.GenerativeModel("gemini-2.0-flash")
	model.Tools = []*genai.Tool{}
	model.SetTemperature(0.7)
	model.SetTopP(0.95)
	model.SetTopK(40)

	// Build context with user data and intent
	txList := strings.Join(transactions, ", ")
	role := "customer"
	accessLevel := "You cannot access sensitive user data."
	if isAdmin {
		role = "admin"
		accessLevel = fmt.Sprintf("You have admin access to user data. User's account balance: %s. Recent transactions: %s.", balance, txList)
	}

	systemPrompt := fmt.Sprintf(`You are Savia, a helpful banking assistant.
Current intent: %s
Role: %s
%s
- IMPORTANT: Never try to call tools or functions.
- IMPORTANT: Always respond directly with helpful, conversational text.
- If intent is 'check_balance' and user is admin, provide the exact balance: %s
- If intent is 'transaction_history' and user is admin, list the transactions: %s
- If user is not admin and asks for sensitive data, politely explain you need admin mode.`, intent, role, accessLevel, balance, txList)

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

	return &ReasonResponse{
		Text:             text,
		VoiceInstruction: "stable",
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

func detectIntent(query string) string {
	// Keyword-based fallback intent detection
	query = strings.ToLower(query)
	if strings.Contains(query, "balance") {
		return "check_balance"
	}
	if strings.Contains(query, "policy") {
		return "policy_inquiry"
	}
	if strings.Contains(query, "transaction") {
		return "transaction_history"
	}
	if strings.Contains(query, "admin") {
		return "admin_settings"
	}
	return "general"
}

func detectIntentWithLLM(ctx context.Context, apiKey, query string) (string, error) {
	cl, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", err
	}

	model := cl.GenerativeModel("gemini-2.0-flash")
	model.Tools = []*genai.Tool{}
	model.SetTemperature(0.1) // Low temp for consistent classification

	prompt := fmt.Sprintf(`Classify this user query into ONE of these intents:
- check_balance
- policy_inquiry
- transaction_history
- account_settings
- general

Query: "%s"

Respond with ONLY the intent name, nothing else.`, query)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	intent := "general"
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		intent = strings.TrimSpace(fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]))
	}

	return intent, nil
}

func SpeakHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "audio/wav")
	fmt.Fprint(w, "TTS not implemented - placeholder")
}
