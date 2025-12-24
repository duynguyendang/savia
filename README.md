# Savia: The Sophisticated Neuro-Symbolic Assistant

**Savia** (from Latin *Sapientia* - Wisdom and Spanish *Savia* - Lifeblood) is a next-generation conversational AI assistant designed for high-stakes environments where accuracy, policy compliance, and human-like expression are paramount.

Unlike traditional chatbots that rely solely on probabilistic LLMs, Savia utilizes the **Manglekit** framework to wrap the "Intuition" of Gemini with the "Logic" of a Datalog reasoning engine.

---

## 1. The Core Philosophy: "Lifeblood of Logic"

In Savia, the LLM (Gemini) acts as the creative brain, while the Manglekit Reasoning Engine acts as the **Savia (Sap)**—the essential lifeblood that carries nutrients (facts) and enforces structure (logic). Every word spoken by Savia through **ElevenLabs** is first audited by the Logic Engine to ensure it is deep, accurate, and safe.

---

## 2. Key Features

* **Anti-Hallucination Guardrails:** Every response is cross-referenced against a **BigQuery** "Source of Truth" using Datalog reflection before it reaches the user.
* **Deterministic RBAC:** User permissions and roles are fetched dynamically from BigQuery and enforced via formal logic—not just system prompts.
* **Sophisticated Feedback Loops:** If a response is too shallow or misses a technical detail, the Reasoning Engine triggers a "Self-Correction" loop, forcing the LLM to rewrite the answer.
* **High-Fidelity Voice:** Integrated with **ElevenLabs** to provide a voice that matches the sophistication of the content.
* **Logical Observability:** Fully integrated with **Datadog** via OpenTelemetry. You can see exactly which **Datalog Rule** allowed or blocked an AI's action.

---

## 3. Architecture Overview

Savia is built as a **Monorepo** consisting of:

1. **Frontend (`/fe`):** A React application utilizing the ElevenLabs SDK for voice synthesis and real-time interaction.
2. **Backend (`/be`):** A Go service powered by the **Manglekit SDK**, acting as the Logic Gateway.

### The Supervised Action Lifecycle:

1. **Assess:** Fetch RBAC from BigQuery and verify if the user is allowed to perform the intent.
2. **Execute:** Route the intent to the specific BigQuery query or Knowledge Graph fact.
3. **Reflect:** Audit the generated response against the fetched data.
4. **Steer:** If valid, send to ElevenLabs; if invalid, trigger a retry with specific logical feedback.

---

## 4. Tech Stack

* **Logic Engine:** [Manglekit](https://www.google.com/search?q=https://github.com/duynguyendang/manglekit) (Go + Google Mangle)
* **Intelligence:** Google Gemini 3 Flash (Vertex AI)
* **Voice:** ElevenLabs (Flash v2.5)
* **Data Warehouse:** Google Cloud BigQuery
* **Infrastructure:** Google Cloud Run (Serverless BE), Firebase Hosting (FE)
* **Observability:** Datadog + OpenTelemetry

---

## 5. Project Structure

```text
savia/
├── be/                 # Go Backend (Savia-BE)
│   ├── cmd/main.go     # API Entry point
│   ├── internal/       # BigQuery & ElevenLabs Adapters
│   ├── resources/      # policy.dl (Logic Rules)
│   └── Dockerfile      # Cloud Run deployment
├── fe/                 # React Frontend (Savia-FE)
│   ├── src/            # ElevenLabs SDK integration
│   └── public/
└── README.md

```

---

## 6. Getting Started

### Prerequisites

* Go 1.21+
* Node.js & npm
* Google Cloud Project (with BigQuery & Vertex AI enabled)
* ElevenLabs API Key

### Backend Setup

1. Navigate to the backend folder: `cd be`
2. Install dependencies: `go mod tidy`
3. Set environment variables:
```bash
export GOOGLE_API_KEY="your-gemini-key"
export ELEVENLABS_API_KEY="your-key"

```


4. Run the service: `go run cmd/main.go`

### Frontend Setup

1. Navigate to the frontend folder: `cd fe`
2. Install dependencies: `npm install`
3. Start the app: `npm start`

---

## 7. Deployment

Savia is designed for the Google Cloud ecosystem:

**Deploy Backend to Cloud Run:**

```bash
gcloud run deploy savia-be --source ./be --env-vars-file env.yaml

```

**Deploy Frontend to Firebase:**

```bash
cd fe && npm run build && firebase deploy

```

---

## 8. Demo Scenario: The Sophisticated Wealth Advisor

1. **User:** "Can I withdraw $50,000 from my account today?"
2. **Savia Logic:**
* **Assess:** Queries BigQuery RBAC. User is "Gold Tier" -> Allowed.
* **Execute:** Queries BigQuery Balance -> Balance is $60,000.
* **Reflect:** Logic Engine detects that $50k is > 80% of total balance.
* **Steer:** Triggers a "Sophisticated Warning" feedback to Gemini.


3. **Result:** Savia responds (via ElevenLabs) with a professional, concerned tone: *"You have sufficient funds, but withdrawing 80% of your liquidity might impact your planned investment strategy. Would you like to review the implications first?"*
