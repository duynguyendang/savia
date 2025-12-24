package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/duynguyendang/manglekit/config"
	"github.com/duynguyendang/manglekit/sdk"
    "github.com/duynguyendang/manglekit/providers/google"
	"github.com/duynguyendang/savia/be/internal/utils"
)

// Global clients
var (
	mkClient *sdk.Client
)

func main() {
	ctx := context.Background()

	var err error
	// 1. (Removed BQ init)

	// 2. Secrets Verification
	logSecret("GOOGLE_API_KEY")
	elevenKey := os.Getenv("ELEVENLABS_API_KEY")
	if len(elevenKey) < 5 {
		log.Printf("Warning: ELEVENLABS_API_KEY is missing or too short")
	}

	// 3. Initialize Manglekit
	log.Println("Initializing Manglekit...")
    // Configure Policy Path
	cfg := &config.Config{
		Policy: config.PolicyConfig{
			Path: "./resources", // Directory containing .dl files
		},
	}

    // Initialize Client with Google Provider
    apiKey := os.Getenv("GOOGLE_API_KEY")
    opts := []sdk.ClientOption{
        sdk.WithConfig(cfg),
        google.Enable(apiKey, "gemini-1.5-flash", "generate"),
    }

	mkClient, err = sdk.NewClient(ctx, opts...)
	if err != nil {
		log.Fatalf("Failed to initialize Manglekit: %v", err)
	}
    log.Println("Manglekit initialized.")

	// 4. Handlers
	http.HandleFunc("/health", HealthHandler)
	http.HandleFunc("/v1/reason", ReasonHandler())
	http.HandleFunc("/v1/speak", SpeakHandler)

	// 5. Port Binding
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func logSecret(key string) {
	val := os.Getenv(key)
	if len(val) >= 4 {
		log.Printf("%s: %s...", key, val[:4])
	} else {
		log.Printf("%s: (not set or too short)", key)
	}
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "OK")
}

// Request/Response definitions
type ReasonRequest struct {
	UserID string `json:"user_id"`
	Query  string `json:"query"`
}

type ReasonResponse struct {
	Text             string `json:"text"`
	VoiceInstruction string `json:"voice_instruction"`
    VoiceID          string `json:"voice_id,omitempty"` // Internal use for SpeakHandler, but good to debug
}

func ReasonHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req ReasonRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

        // Simple keyword heuristic for intent
        intent := "unknown"
        if strings.Contains(strings.ToLower(req.Query), "balance") {
            intent = "check_balance"
        } else if strings.Contains(strings.ToLower(req.Query), "policy") {
            intent = "policy_inquiry"
        } else if strings.Contains(strings.ToLower(req.Query), "transaction") {
             intent = "transaction_history"
        }
        // Admin?
        if strings.Contains(strings.ToLower(req.Query), "admin") {
            intent = "admin_settings"
        }

		// --- Action: assess_context ---
        // Fetch user role and tenure from BigQuery
        role, tenure, err := getUserContext(ctx, req.UserID)
        if err != nil {
            log.Printf("Error fetching context: %v", err)
            // Proceed with defaults
            role = "customer"
            tenure = 1
        }

        // Construct Facts
        facts := []string{
            fmt.Sprintf("intent(\"%s\")", intent),
            fmt.Sprintf("has_role(\"%s\", \"%s\")", req.UserID, role),
            fmt.Sprintf("user_tenure_years(\"%s\", %d)", req.UserID, tenure),
            fmt.Sprintf("chat_history(\"User: %s\")", req.Query),
        }

        // --- Logic: Security Check (Halt) ---
        if mkClient == nil {
             log.Println("Manglekit Client not initialized")
             http.Error(w, "Service Unavailable", http.StatusServiceUnavailable)
             return
        }

        // Query: halt(Msg)
        resHalt, err := mkClient.Engine().Query(ctx, facts, "halt(Msg)")
        if err != nil {
             log.Printf("Manglekit Query Error: %v", err)
             http.Error(w, "Internal Server Error", http.StatusInternalServerError)
             return
        }
        if len(resHalt) > 0 {
            msg := "Access Denied"
            if m, ok := resHalt[0]["Msg"]; ok {
                msg = m
            }
            log.Printf("Halt triggered: %s", msg)
            http.Error(w, msg, http.StatusForbidden)
            return
        }

        // --- Logic: Routing (Search Strategy) ---
        // Query: search_strategy(S)
        resStrat, _ := mkClient.Engine().Query(ctx, facts, "search_strategy(S)")
        strategy := "unknown"
        if len(resStrat) > 0 {
             if s, ok := resStrat[0]["S"]; ok {
                 strategy = s
             }
        }

        // Append strategy to facts for downstream rules
        facts = append(facts, fmt.Sprintf("search_strategy(\"%s\")", strategy))

        // --- Logic: Execution ---
        var bqResultData string

        if strategy == "structured_sql" {
             queryID := ""
             if intent == "check_balance" {
                 queryID = "get_balance"
             }

             if queryID != "" {
                 // Get SQL Template
                 resSQL, _ := mkClient.Engine().Query(ctx, facts, fmt.Sprintf("query_sql(\"%s\", SQL)", queryID))
                 if len(resSQL) > 0 {
                     sqlTmpl := resSQL[0]["SQL"]
                     // Execute
                     bqResultData, err = getMockData(ctx, sqlTmpl, req.UserID)
                     if err != nil {
                         log.Printf("BQ Execution Error: %v", err)
                     }
                 }
             }
        } else if strategy == "vector_semantic" {
            bqResultData = "Policy details: Security first."
        }

        // Inject Result
        facts = append(facts, fmt.Sprintf("bq_result(\"%s\")", bqResultData))

        // --- Logic: Prompt Synthesis ---
        // Query: active_template(ID)
        resTmpl, _ := mkClient.Engine().Query(ctx, facts, "active_template(T)")
        activeTmplID := "standard_data" // default
        if len(resTmpl) > 0 {
            if t, ok := resTmpl[0]["T"]; ok {
                activeTmplID = t
            }
        }

        // Get Blueprint Content
        resBP, _ := mkClient.Engine().Query(ctx, facts, fmt.Sprintf("prompt_blueprint(\"%s\", C)", activeTmplID))
        blueprint := ""
        if len(resBP) > 0 {
            blueprint = resBP[0]["C"]
        }

        // Get Variables: prompt_var(K, V)
        vars, err := utils.ExtractPromptVars(ctx, mkClient, facts)
        if err != nil {
             log.Printf("Error extracting vars: %v", err)
        }
        // Also add explicit context vars just in case
        vars["intent"] = intent

        // Interpolate
        prompt := utils.Interpolate(blueprint, vars)

        // Generate with Gemini via Manglekit Action
        respText := prompt // Fallback
        env, err := mkClient.ExecuteByName(ctx, "generate", prompt)
        if err == nil {
            if str, ok := env.Payload.(string); ok {
                respText = str
            } else {
                 // If not string, maybe JSON or other format?
                 // Genkit response might be wrapped.
                 // But typically simple text generation returns string.
                 // Let's log if not string.
                 log.Printf("LLM Response Payload is not string: %T", env.Payload)
            }
        } else {
            log.Printf("LLM Execution Error: %v", err)
        }

        // --- Logic: Voice Steering ---
        // Query: active_voice_id(ID)
        resVoice, _ := mkClient.Engine().Query(ctx, facts, "active_voice_id(ID)")
        voiceID := "default_voice_id"
        if len(resVoice) > 0 {
             if v, ok := resVoice[0]["ID"]; ok {
                 voiceID = v
             }
        }

        // Response
		resp := ReasonResponse{
			Text:              respText,
			VoiceInstruction:  voiceID,
            VoiceID:           voiceID,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

// SpeakHandler: Proxy to ElevenLabs
type SpeakRequest struct {
    Text    string `json:"text"`
    VoiceID string `json:"voice_id"`
}

func SpeakHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

    // Parse
    var req SpeakRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Bad Request", http.StatusBadRequest)
        return
    }

    apiKey := os.Getenv("ELEVENLABS_API_KEY")
    if apiKey == "" {
        http.Error(w, "TTS Unavailable", http.StatusServiceUnavailable)
        return
    }

    voiceID := req.VoiceID
    if voiceID == "" {
        voiceID = "21m00Tcm4TlvDq8ikWAM" // Default Rachel
    }

    // Call ElevenLabs
    url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", voiceID)
    // Encode payload properly
    payloadBytes, _ := json.Marshal(map[string]string{"text": req.Text})

    proxyReq, err := http.NewRequest("POST", url, strings.NewReader(string(payloadBytes)))
    if err != nil {
        http.Error(w, "Internal Error", http.StatusInternalServerError)
        return
    }
    proxyReq.Header.Set("xi-api-key", apiKey)
    proxyReq.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    proxyResp, err := client.Do(proxyReq)
    if err != nil {
        http.Error(w, "TTS Upstream Error", http.StatusBadGateway)
        return
    }
    defer proxyResp.Body.Close()

    if proxyResp.StatusCode != 200 {
        body, _ := io.ReadAll(proxyResp.Body)
        log.Printf("ElevenLabs Error: %s", string(body))
        http.Error(w, "TTS Generation Failed", proxyResp.StatusCode)
        return
    }

	w.Header().Set("Content-Type", "audio/mpeg")
	io.Copy(w, proxyResp.Body)
}

// Helpers

func getUserContext(ctx context.Context, userID string) (string, int, error) {
    // Mock implementation for local dev
    return "manager", 2, nil
}

func getMockData(ctx context.Context, sqlTmpl string, userID string) (string, error) {
    // Mock data provider instead of BQ
    return "balance: 1000, currency: USD, status: active", nil
}
