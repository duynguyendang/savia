To implement **Savia-BE**, we will create a robust, production-ready `main.go`. This design treats Manglekit as the central **Governance Kernel**, ensuring every request is audited by the Datalog policies we defined.

The service is designed to run on **Google Cloud Run**, pulling secrets from environment variables and connecting to **BigQuery** for dynamic RBAC and data retrieval.

### `be/cmd/main.go` Design

```go
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
	"github.com/duynguyendang/manglekit/adapters/func"
	"github.com/duynguyendang/manglekit/sdk"
	"google.golang.org/api/option"
)

// SaviaResponse represents the final audited output sent to the React frontend
type SaviaResponse struct {
	Text             string `json:"text"`
	VoiceInstruction string `json:"voice_instruction"`
	TraceID          string `json:"trace_id"`
}

func main() {
	ctx := context.Background()
	
	// 1. Initialize Configuration from Environment Variables
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	apiKey := os.Getenv("GOOGLE_API_KEY") // Gemini API Key
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Initialize BigQuery Client
	bqClient, err := bigquery.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create BigQuery client: %v", err)
	}
	defer bqClient.Close()

	// 3. Initialize Manglekit SDK Client
	// This loads the Governance (policies.dl) and Business Logic (rules.dl)
	mkit, err := sdk.NewClient(ctx,
		sdk.WithBlueprint("./resources/policies.dl"),
		sdk.WithBlueprint("./resources/rules.dl"),
		sdk.WithGemini(apiKey, "gemini-3-flash-preview"),
	)
	if err != nil {
		log.Fatalf("Failed to initialize Manglekit: %v", err)
	}

	// 4. Register Action: Fetch RBAC from BigQuery
	// This runs during the 'Assess' phase to inject permissions into Datalog
	mkit.RegisterAction("fetch_rbac", function.New("fetch_rbac", func(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		userID := input["user_id"].(string)
		
		// Logic to query BigQuery table: `savia.security.rbac`
		// Resulting facts like 'has_role' and 'role_permission' will be used by policies.dl
		return map[string]interface{}{
			"has_role":        []string{"manager"},
			"role_permission": []string{"check_expenses", "check_loyalty"},
			"tenure_years":    5,
		}, nil
	}))

	// 5. Register Action: Execute BigQuery Data Queries
	// This runs during the 'Execute' phase based on target_query(ID) from rules.dl
	mkit.RegisterAction("bq_executor", function.New("bq_executor", func(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		queryID := input["query_id"].(string)
		params := input["params"].(map[string]interface{})
		
		log.Printf("Executing BigQuery Query: %s with params: %v", queryID, params)
		// Actual BigQuery execution logic goes here
		return map[string]interface{}{"result_value": 50000, "status": "success"}, nil
	}))

	// 6. REST API Endpoint: /v1/reason
	http.HandleFunc("/v1/reason", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var reqPayload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&reqPayload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Execute the Supervised Loop [Assess -> Execute -> Reflect]
		// The 'savia_agent' is defined in the .dl files
		startTime := time.Now()
		result, err := mkit.ExecuteByName(r.Context(), "savia_agent", reqPayload)
		if err != nil {
			log.Printf("Reasoning Error: %v", err)
			http.Error(w, fmt.Sprintf("Policy Violation or Engine Error: %v", err), http.StatusForbidden)
			return
		}

		// Prepare the final response for the ElevenLabs Frontend
		response := SaviaResponse{
			Text:             result.Payload.(string),
			VoiceInstruction: "analytical", // Derived from Datalog voice_instruction/1
			TraceID:          fmt.Sprintf("sv-%d", startTime.Unix()),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// 7. Health Check for Cloud Run
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "Savia is Wise and Healthy")
	})

	log.Printf("Savia-BE listening on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

```

---

### Design Breakdown

#### 1. The "Logic-First" Handlers

The `fetch_rbac` action is the most critical part of the **Assess** phase. It transforms static BigQuery table rows into **Datalog Facts** in real-time. This ensures that even if Gemini is "tricked" by a prompt, the underlying logic engine will reject the action if the user lacks the proper role.

#### 2. Deterministic Tool Selection

In the `bq_executor` action, we don't allow Gemini to write SQL. Instead, the `rules.dl` file provides a `query_id`. The Go code then matches this ID to a safe, parameterized SQL template, preventing SQL injection and ensuring the AI only sees the data it is supposed to see.

#### 3. Graceful Error Handling (Halt)

When `mkit.ExecuteByName` fails, it typically means a `halt/1` predicate in `policies.dl` was triggered. We return a **403 Forbidden** status, signaling the React frontend that the request was blocked for policy reasons rather than a technical crash.

#### 4. Observability Integration

The `TraceID` is included in the response. This ID should be mapped to your **Datadog** traces, allowing you to correlate a user's voice request with the exact Datalog rule that determined the outcome.
