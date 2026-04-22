# Savia: The Sophisticated Neuro-Symbolic Assistant

**Savia** (from Latin *Sapientia* - Wisdom and Spanish *Savia* - Lifeblood) is a next-generation conversational AI assistant designed for high-stakes environments where accuracy, policy compliance, and human-like expression are paramount.

Unlike traditional chatbots that rely solely on probabilistic LLMs, Savia utilizes the **Manglekit** framework to wrap the "Intuition" of Gemini with the "Logic" of a Datalog reasoning engine.

---

## 1. The Core Philosophy: "Lifeblood of Logic"

In Savia, the LLM (Gemini) acts as the creative brain, while the Manglekit Reasoning Engine acts as the **Savia (Sap)**—the essential lifeblood that carries nutrients (facts) and enforces structure (logic). Every word spoken by Savia through **ElevenLabs** is first audited by the Logic Engine to ensure it is deep, accurate, and safe.

---

## 2. Key Features

* **Two-Way Voice Communication:** Full duplex voice interaction using Web Speech API (STT) and Gemini 3.1 Flash TTS. Users speak and Savia responds with natural voice.
* **Anti-Hallucination Guardrails:** Every response is cross-referenced against a **BigQuery** "Source of Truth" using Datalog reflection before it reaches the user.
* **Deterministic RBAC:** User permissions and roles are fetched dynamically from BigQuery and enforced via formal logic—not just system prompts.
* **Sophisticated Feedback Loops:** If a response is too shallow or misses a technical detail, the Reasoning Engine triggers a "Self-Correction" loop, forcing the LLM to rewrite the answer.
* **High-Fidelity Voice:** Integrated with **Gemini 3.1 Flash TTS** with SynthID watermarking for audio authenticity.
* **Logical Observability:** Fully integrated with **Datadog** via OpenTelemetry. You can see exactly which **Datalog Rule** allowed or blocked an AI's action.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SAVIA SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐         ┌─────────────────────────────────────────────┐      │
│   │  USER    │         │              SAVIA-BE (Go)                 │      │
│   │  ────    │         │                                             │      │
│   │          │◀───────▶│  ┌─────────────┐    ┌──────────────────┐  │      │
│   │          │  VOICE  │  │  Assess     │───▶│  Manglekit       │  │      │
│   │          │   I/O   │  │  Handler    │    │  Engine (Datalog)│  │      │
│   │          │         │  │  /reason     │    │  ┌────────────┐  │  │      │
│   └──────────┘         │  └─────────────┘    │  │ rules.dl   │  │  │      │
│        │              │                    │  │ policies.dl│  │  │      │
│        │ Voice        │                    └──┴────────────┴──┘  │      │
│        │ Stream       │                          │               │      │
│        ▼              │                          ▼               │      │
│   ┌────────────┐       │                    ┌─────────────┐       │      │
│   │  Browser   │       │                    │  Execute    │       │      │
│   │  Web       │◀──────│                    │  Action     │       │      │
│   │  Speech    │  STT  │                    └──────┬───────┘       │      │
│   │  API       │──────▶│                           │               │      │
│   │  (Mic)     │       │    ┌──────────────────────┴───────┐       │      │
│   └────────────┘       │    │                              │       │      │
│                         │    ▼                              ▼       │      │
│   ┌────────────┐       │ ┌──────────┐               ┌────────────┐  │      │
│   │  Gemini    │◀──────────│  Gemini   │◀──────────────│  BigQuery  │  │      │
│   │  3.1       │   TTS    │  Flash   │   Query       │  (Source   │  │      │
│   │  Flash     │   Proxy │  3       │   Results     │  of Truth) │  │      │
│   │  TTS       │        │ └──────────┘               └────────────┘  │      │
│   └────────────┘       └─────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Way Voice Flow

| Direction | Technology | Description |
|-----------|------------|-------------|
| **User → Savia** | Web Speech API | Browser microphone captures voice, transcribes to text |
| **Savia → User** | Gemini 3.1 Flash TTS | Server proxies TTS audio stream to browser |

### Component Flow

| Stage | Component | Description |
|-------|-----------|-------------|
| **1. Listen** | `useSpeechRecognition` | Browser Web Speech API captures and transcribes user voice |
| **2. Assess** | `main.go:ReasonHandler` | Parses intent, fetches RBAC from BigQuery, queries `halt/1` |
| **3. Execute** | `Manglekit Engine` | Routes to SQL or vector search via `search_strategy/1` |
| **4. Reflect** | `rules.dl` | Validates LLM response against `bq_result/1` facts |
| **5. Speak** | `tts.StreamSpeech` | Gemini TTS generates audio, streamed to browser |

Savia is built as a **Monorepo** consisting of:

1. **Frontend (`/fe`):** A React application for voice synthesis and real-time interaction.
2. **Backend (`/be`):** A Go service powered by the **Manglekit SDK**, acting as the Logic Gateway.
2. **Backend (`/be`):** A Go service powered by the **Manglekit SDK**, acting as the Logic Gateway.

---

## 4. Tech Stack

* **Logic Engine:** [Manglekit](https://www.google.com/search?q=https://github.com/duynguyendang/manglekit) (Go + Google Mangle)
* **Intelligence:** Google Gemini 3 Flash (Vertex AI)
* **Voice:** Google Gemini 3.1 Flash TTS (SynthID watermarked)
* **Data Warehouse:** Google Cloud BigQuery
* **Infrastructure:** Google Cloud Run (Serverless BE), Firebase Hosting (FE)
* **Observability:** Datadog + OpenTelemetry

---

## 5. Project Structure

```text
savia/
├── be/                 # Go Backend (Savia-BE)
│   ├── cmd/main.go     # API Entry point
│   ├── internal/       # BigQuery & TTS Adapters
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

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment procedures.

**Quick Deploy:**

**Deploy Backend to Cloud Run:**

```bash
gcloud run deploy savia-be --source ./be --region=us-central1 --allow-unauthenticated
```

**Deploy Frontend to Firebase:**

```bash
cd fe && npm run build && firebase deploy --project=savia-demo
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
