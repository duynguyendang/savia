To ensure **Savia** operates with the "Sophistication" and "Logical Rigor" you desire, we need a clear distinction between **Governance (The Law)** and **Business Logic (The Manual)**.

Here is the architectural guideline for structuring your Datalog files in Manglekit.

---

# Savia Logic Guideline: The Neuro-Symbolic Protocol

In Savia, we separate logic into two layers to ensure the system is both secure and intelligent.

## 1. `policies.dl` (The Governance Layer)

**Role:** This is the "Left Brain" gatekeeper. It defines what is **permitted**, what is **forbidden**, and who has **authority**.

### Core Responsibilities:

* **RBAC Enforcement:** Validating users against BigQuery roles.
* **Safety Guardrails:** Blocking sensitive topics or dangerous instructions.
* **Compliance:** Ensuring legal disclaimers are present in generated text.

### Implementation Patterns:

* **`allow(User, Action)`**: The primary predicate for authorization.
* **`deny(User, Reason)`**: Used in the **Assess** phase to halt execution.
* **`halt(Message)`**: A hard-stop predicate that prevents any further processing if a security violation is detected.

**Example Guideline:**

> "Every policy must have a corresponding `deny` rule that explains *why* a request was blocked, which Savia will use to inform the user gracefully via ElevenLabs."

---

## 2. `rules.dl` (The Intelligence Layer)

**Role:** This defines the "SOP" (Standard Operating Procedure). it handles **Routing**, **Data Synthesis**, and **Feedback Loops**.

### Core Responsibilities:

* **Intent Mapping:** Linking Gemini's extracted intent to specific BigQuery Query IDs.
* **Dynamic Scoring:** Calculating risk or loyalty scores based on BigQuery facts.
* **Refinement Logic:** Defining the criteria for a "Good Response" (depth, tone, accuracy).

### Implementation Patterns:

* **`target_query(QueryID)`**: Used to route the request to a specific SQL template.
* **`retry(Entity, Feedback)`**: The "Magic" predicate. If a rule detects a shallow answer, this triggers a re-generation loop.
* **`sophistication_score(N)`**: A custom predicate to weigh the depth of an answer.

---

## 3. The "Action Sandwich" Workflow

Your rules must be designed to fit into Manglekit’s three-phase lifecycle:

| Phase | File Target | Logic Objective |
| --- | --- | --- |
| **Assess** (Pre-check) | `policies.dl` | Check `deny(User, Action)`. If true, **Stop**. |
| **Execute** (Action) | `rules.dl` | Determine `target_query(ID)` and run BigQuery. |
| **Reflect** (Post-check) | `rules.dl` | Run `retry(Savia, Hint)` if the LLM output doesn't match BQ facts. |

---

## 4. Coding Standards for Savia Logic

### A. Naming Conventions

* **Predicates:** Use `snake_case` (e.g., `user_has_access`).
* **Variables:** Start with Uppercase (e.g., `User`, `Amount`).
* **Constants:** Lowercase or quoted strings (e.g., `gold_member`, `"BigQuery"`).

### B. Accessing BigQuery Data

Manglekit flattens JSON results from BigQuery into the logic engine. Access them using:

* `json_num(Data, "balance", Val)` — to get numeric values.
* `json_str(Data, "status", Status)` — to get string values.

### C. The "Fancy Feedback" Pattern

To make Savia "deep," use this pattern in `rules.dl` to force Gemini to explain its reasoning:

```prolog
% If the answer is just a number, force a retry with a "Explain why" hint
retry(Resp, "The response is too brief. Please explain the context behind this BigQuery result.") :-
    json_str(Resp, "text", T),
    string_length(T, L), L < 50.

```

---

## 5. Directory Management in Savia-BE

Store these files in `be/resources/` and load them into the Manglekit Client during initialization:

```go
// main.go
client, _ := sdk.NewClient(ctx, 
    sdk.WithBlueprint("./resources/policies.dl"), 
    sdk.WithBlueprint("./resources/rules.dl"),
)

```

**Pro Tip:** By keeping `policies.dl` separate, your **Security Auditor** only needs to review one file, while your **Product Manager** can iterate on `rules.dl` to make Savia smarter without touching security logic.