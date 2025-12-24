# Savia-BE: Neuro-Symbolic Backend LLD

## 1. System Overview
**Savia-BE** is a Neuro-Symbolic orchestration service running on **Google Cloud Run**. It decouples logic from code by using **Manglekit** as the governance kernel. 

* **Architecture Pattern:** Host-Kernel (Go Host, Manglekit Kernel).
* **Intelligence Model:** Gemini 1.5 Flash (Low latency, cost-effective).
* **Knowledge Source:** BigQuery (SQL for ground truth, Vector Search for semantics).
* **Orchestration Strategy:** Logic-driven Prompt Synthesis (Blueprints defined in Datalog).

---

## 2. Directory Structure

```text
be/
├── cmd/
│   └── main.go                  # Service entrypoint, Action Registry, HTTP Handler
├── internal/
│   └── utils/
│       └── interpolation.go     # String replacement utility for Prompt Synthesis
├── resources/
│   ├── policies.dl              # Security, RBAC, and Compliance Gates
│   └── rules.dl                 # SQL Registry, Search Routing, Prompt Blueprints
├── go.mod                       # Dependencies
└── Dockerfile                   # Cloud Run deployment config

```

---

## 3. The Governance Loop (Execution Flow)

Every request to `/v1/reason` undergoes a strict 4-phase lifecycle managed by Manglekit:

1. **Assess (Context Loading):**
* Host triggers `assess_context` action.
* Loads RBAC & Chat History from BigQuery.
* **Gate:** Policies check `halt/1`. If violated, execution stops immediately.


2. **Execute (Tool Use):**
* Kernel determines `search_strategy` (SQL vs. Vector).
* Kernel retrieves `query_sql` template.
* Host triggers `bq_executor` action using the ID and SQL provided by the Kernel.


3. **Synthesize (Prompt Assembly):**
* Kernel selects `active_template` (Blueprint).
* Kernel computes `prompt_var` (Contextual variables).
* Host performs string interpolation to create the final Prompt.


4. **Reflect (Delivery):**
* Host calls Gemini Flash with the synthesized prompt.
* Host packages the result with `voice_style` for the Frontend.



---

## 4. Component Specifications

### 4.1. Host Implementation: `cmd/main.go`

Responsible for I/O, registering actions, and executing the synthesis logic.

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

	"[cloud.google.com/go/bigquery](https://cloud.google.com/go/bigquery)"
	"[github.com/duynguyendang/manglekit/adapters/func](https://github.com/duynguyendang/manglekit/adapters/func)"
	"[github.com/duynguyendang/manglekit/sdk](https://github.com/duynguyendang/manglekit/sdk)"
	"savia-be/internal/utils" // Local utils package
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
		log.Fatal(err)
	}
	defer bqClient.Close()

	// 2. Init Manglekit Kernel with Gemini Flash
	mkit, err := sdk.NewClient(ctx,
		sdk.WithBlueprint("./resources/policies.dl"),
		sdk.WithBlueprint("./resources/rules.dl"),
		sdk.WithGemini(apiKey, "gemini-1.5-flash"),
	)
	if err != nil {
		log.Fatal(err)
	}

	// ---------------------------------------------------------
	// ACTION 1: Assess Context (RBAC & History)
	// ---------------------------------------------------------
	mkit.RegisterAction("assess_context", function.New("assess_context", func(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		// userId := input["user_id"].(string)
		// TODO: Implement actual BQ query to fetch Role and Last 3 Messages
		// Mock return for LLD:
		return map[string]interface{}{
			"role":         "manager",
			"tenure_years": 5,
			"history":      []string{"User: Hi", "Savia: Hello!"},
		}, nil
	}))

	// ---------------------------------------------------------
	// ACTION 2: Smart BQ Executor (SQL & Vector)
	// ---------------------------------------------------------
	mkit.RegisterAction("bq_executor", funcCtx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		queryID := input["query_id"].(string)
		
		// CRITICAL: Retrieve SQL Template defined in Datalog (rules.dl)
		// This prevents Hard-coded SQL in Go.
		sqlTemplate := mkit.GetFact(fmt.Sprintf("query_sql.%s", queryID))
		if sqlTemplate == "" {
			return nil, fmt.Errorf("unknown query_id: %s", queryID)
		}

		q := bqClient.Query(sqlTemplate)
		q.Parameters = []bigquery.QueryParameter{
			{Name: "user_id", Value: input["user_id"]},
			{Name: "query_text", Value: input["query_text"]}, // For Vector Search
		}
		
		// TODO: Execute Iterator and return Map
		// Mock return:
		return map[string]interface{}{
			"balance":  50000000,
			"currency": "VND",
			"status":   "active",
		}, nil
	}))

	// ---------------------------------------------------------
	// HTTP Handler
	// ---------------------------------------------------------
	http.HandleFunc("/v1/reason", func(w http.ResponseWriter, r *http.Request) {
		var req SaviaRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// A. Execute Manglekit Loop
		result, err := mkit.ExecuteByName(r.Context(), "savia_agent", map[string]interface{}{
			"user_id": req.UserID,
			"message": req.Message,
		})

		if err != nil {
			// Halt/1 triggered
			http.Error(w, fmt.Sprintf("Policy Block: %v", err), http.StatusForbidden)
			return
		}

		// B. Prompt Synthesis (The "Fancy" Logic)
		// Extract Blueprint ID and Facts
		templateID := result.GetFact("active_template")
		blueprint := result.GetFact(fmt.Sprintf("prompt_blueprint.%s", templateID))
		
		// Perform Interpolation (Replace {{vars}} in blueprint)
		finalText := utils.Interpolate(blueprint, result.Facts)

		// C. Response Construction
		resp := SaviaResponse{
			Text:             finalText,
			VoiceInstruction: result.GetFact("voice_style"),
			TraceID:          fmt.Sprintf("sv-%d", time.Now().Unix()),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	log.Println("Savia-BE listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```

### 4.2. Logic Kernel: `resources/rules.dl`

This file acts as the **Registry** for SQL, Blueprints, and Routing Logic. It empowers the Coding Agent to change behavior without recompiling Go.

```prolog
% ===========================================================
% SAVIA KNOWLEDGE REGISTRY & ROUTING
% ===========================================================

% --- 1. SEARCH STRATEGY ROUTING ---
% Structured SQL for precise data
search_strategy("structured_sql") :- intent("check_balance") ; intent("transaction_history").
% Semantic Vector Search for knowledge/policy
search_strategy("vector_semantic") :- intent("policy_inquiry") ; intent("unknown").


% --- 2. SQL TEMPLATE REGISTRY (Source of Truth) ---
% Query ID mapping for Go Host to consume
query_sql("get_balance", "SELECT balance, currency FROM `savia.finance.accounts` WHERE user_id = @user_id").

query_sql("vector_search", "SELECT text_content FROM VECTOR_SEARCH(TABLE `savia.knowledge.policies`, 'embedding_col', (SELECT ml_generate_embedding_result FROM ML.GENERATE_EMBEDDING(MODEL `savia.models.embed`, (SELECT @query_text AS content))), top_k => 2)").


% --- 3. PROMPT BLUEPRINT REGISTRY ---
% Defines how Gemini Flash should behave
prompt_blueprint("standard_data", "
    System: You are Savia. Vibe: {{vibe}}.
    Context: The user asked about {{intent}}.
    Truth Data: {{data}}.
    History: {{history}}.
    Instruction: Answer concisely using the Truth Data.
").

prompt_blueprint("missing_data", "
    System: You are Savia. Vibe: Empathetic.
    Instruction: Politely inform the user that data for {{intent}} is not available. Suggest checking 'Balance'.
").


% --- 4. SYNTHESIS LOGIC (Variable Mapping) ---
% Select active template
active_template("standard_data") :- bq_result(D), NOT is_empty(D).
active_template("missing_data")  :- bq_result(D), is_empty(D).

% Compute Variables for Interpolation
prompt_var("vibe", "Warm and Professional") :- user_tenure_years(_, Y), Y > 3.
prompt_var("vibe", "Efficient and Direct")  :- user_tenure_years(_, Y), Y <= 3.
prompt_var("data", D) :- bq_result(D).
prompt_var("history", H) :- chat_history(H).

% --- 5. VOICE STEERING ---
voice_style("stable") :- search_strategy("structured_sql").
voice_style("expressive") :- search_strategy("vector_semantic").

```

### 4.3. Security Policy: `resources/policies.dl`

```prolog
% ===========================================================
% SAVIA SECURITY GATES
% ===========================================================

% Halt execution if user lacks role for the intent
halt("SECURITY VIOLATION: Access Denied") :-
    intent(I),
    required_role(I, Role),
    NOT has_role(_, Role).

% Define Role Requirements
required_role("check_balance", "customer").
required_role("admin_settings", "admin").

```

### 4.4. Utility: `internal/utils/interpolation.go`

```go
package utils

import (
	"fmt"
	"strings"
)

// Interpolate replaces {{key}} in the template with values from the facts map.
func Interpolate(template string, facts map[string]interface{}) string {
	result := template
	for key, value := range facts {
		placeholder := fmt.Sprintf("{{%s}}", key)
		valStr := fmt.Sprintf("%v", value)
		result = strings.ReplaceAll(result, placeholder, valStr)
	}
	return result
}

```

---

## 5. Data Contract (BigQuery)

The system relies on these specific table schemas:

1. **`savia.finance.accounts`**: `user_id (STRING), balance (NUMERIC), currency (STRING)`
2. **`savia.security.rbac`**: `user_id (STRING), role (STRING), tenure_years (INT)`
3. **`savia.knowledge.policies`**: `content (STRING), embedding_col (VECTOR<768>)`

---

## 6. Implementation Notes for Coding Agent

* **Dependency Injection:** Ensure `GOOGLE_APPLICATION_CREDENTIALS` is handled implicitly by Cloud Run or explicitly in local dev.
* **Fact Flattening:** When `bq_executor` returns a Map, the Manglekit SDK automatically flattens it into Datalog facts (e.g., `balance` becomes `bq_result({"balance": ...})`).
* **Error Mapping:** Map Manglekit `halt` errors to HTTP 403. Map BQ/Gemini errors to HTTP 500.

```

```