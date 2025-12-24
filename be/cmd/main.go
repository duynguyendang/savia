package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/bigquery"
	"github.com/duynguyendang/manglekit/providers/google"
	"github.com/duynguyendang/manglekit/sdk"
	"github.com/duynguyendang/savia/be/internal/actions"
	"github.com/duynguyendang/savia/be/internal/utils"
)

type SaviaRequest struct {
	UserID  string `json:"user_id"`
	Message string `json:"message"`
}

type SaviaResponse struct {
	Text             string `json:"text"`
	VoiceInstruction string `json:"voice_instruction"`
	TraceID          string `json:"trace_id"`
}

func main() {
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	apiKey := os.Getenv("GOOGLE_API_KEY")

	// 1. Init BigQuery
	bqClient, err := bigquery.NewClient(ctx, projectID)
	if err != nil {
		log.Printf("Failed to create BigQuery client (continuing for dev): %v", err)
	}
	if bqClient != nil {
		defer bqClient.Close()
	}

	// 2. Init Manglekit Kernel with Gemini Flash
	// Using WithBlueprintPath to load logic files and google.Enable for LLM
	mkit, err := sdk.NewClient(ctx,
		sdk.WithBlueprintPath("./resources/policies.dl"),
		sdk.WithBlueprintPath("./resources/rules.dl"),
		google.Enable(apiKey, "gemini-1.5-flash", ""),
	)
	if err != nil {
		log.Fatal(err)
	}

	// ---------------------------------------------------------
	// ACTION 1: Assess Context (RBAC & History)
	// ---------------------------------------------------------
	mkit.RegisterAction("assess_context", actions.NewAssessContext())

	// Define logger
	logger := mkit.Logger()

	// ---------------------------------------------------------
	// ACTION 2: Smart BQ Executor (SQL & Vector)
	// ---------------------------------------------------------
	mkit.RegisterAction("bq_executor", actions.NewBQExecutor(bqClient, logger))

	// ---------------------------------------------------------
	// HTTP Handlers
	// ---------------------------------------------------------
	http.HandleFunc("/v1/reason", ReasonHandler(mkit))
	http.HandleFunc("/health", HealthHandler())

	logger.Info("Savia-BE listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// ReasonHandler returns the http.HandlerFunc for the reasoning endpoint
func ReasonHandler(mkit *sdk.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req SaviaRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// A. Execute Manglekit Loop
		initialFacts := map[string]interface{}{
			"user_id": req.UserID,
			"message": req.Message,
			"intent":  "check_balance", // Mocked intent injection
		}

		result, err := mkit.ExecuteByName(r.Context(), "savia_agent", initialFacts)

		if err != nil {
			http.Error(w, fmt.Sprintf("Policy Block: %v", err), http.StatusForbidden)
			return
		}

		// B. Prompt Synthesis
		// Using utils to parse facts from result.Facts ([]string)
		templateID := utils.GetFactValue(result.Facts, "active_template")
		if templateID == "" {
			templateID = "standard_data"
		}

		blueprint := utils.GetBlueprintContent(result.Facts, templateID)
		if blueprint == "" {
			blueprint = "System: You are Savia. Truth Data: {{data}}."
		}

		vars, err := utils.ExtractPromptVars(r.Context(), mkit, result.Facts)
		if err != nil {
			// Log error via mkit logger if accessible, or standard log if we don't have logger in closure.
			// ReasonHandler doesn't have 'logger' in closure, only 'mkit'.
			// We can get logger from mkit.
			mkit.Logger().Error("Failed to extract prompt vars", "error", err)
			vars = make(map[string]interface{})
		}
		finalText := utils.Interpolate(blueprint, vars)

		voiceStyle := utils.GetFactValue(result.Facts, "voice_style")

		// C. Response Construction
		resp := SaviaResponse{
			Text:             finalText,
			VoiceInstruction: voiceStyle,
			TraceID:          fmt.Sprintf("sv-%d", time.Now().Unix()),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

// HealthHandler returns the http.HandlerFunc for the health check endpoint
func HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "Savia is Wise and Healthy")
	}
}
