# Savia Architecture Document

## Overview

**Savia** (Sophisticated Neuro-Symbolic Assistant) is a next-generation conversational AI system that combines neural language models with symbolic reasoning for high-stakes environments where accuracy, policy compliance, and human-like expression are paramount.

### Core Philosophy
- **Neural Intuition**: Gemini 3 Flash for natural language understanding and generation
- **Symbolic Logic**: Manglekit Datalog engine for policy enforcement and factual verification
- **Lifeblood (Savia)**: The reasoning engine that carries facts and enforces structure

---

## System Architecture

### High-Level Architecture

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
│   │  Flash     │   Proxy  │  3        │   Results     │  of Truth) │  │      │
│   │  TTS       │        │ └──────────┘               └────────────┘  │      │
│   └────────────┘       └─────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend (`/fe`) - React TypeScript Application

**Technology Stack:**
- React 19 with TypeScript
- Vite 6 (build tool)
- TailwindCSS 4 (styling)
- Web Speech API (STT)
- Firebase Hosting

**Key Components:**

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Main application component, voice mode overlay |
| `components/Settings.tsx` | User settings (simplified - no API key input) |
| `services/api.ts` | Axios client for backend communication |
| `services/elevenlabs.ts` | TTS service (calls backend `/v1/speak`) |
| `hooks/useSaviaBrain.ts` | Core brain logic hook |
| `lib/gemini.ts` | Deprecated - API key now managed by backend |

**Frontend Flow:**
```
User Speech → Web Speech API (STT) → /v1/reason → Display Text
                                                ↓
                                    /v1/speak → Audio Playback
```

### 2. Backend (`/be`) - Go Service with Manglekit

**Technology Stack:**
- Go 1.21+ (backend language)
- Manglekit SDK (logic engine)
- Google Gemini API (text + TTS)
- Cloud Run (deployment)

**Key Modules:**

| Module | File | Purpose |
|--------|------|---------|
| Main API | `cmd/main.go` | HTTP handlers, routing, CORS |
| TTS Service | `internal/tts/gemini.go` | Gemini 3.1 Flash TTS integration |
| TTS (Legacy) | `internal/tts/elevenlabs.go` | ElevenLabs TTS (deprecated) |
| Logic Engine | `resources/rules.dl` | Datalog rules for policy enforcement |

**Backend API Endpoints:**

| Method | Endpoint | Model Used | Purpose |
|--------|----------|------------|---------|
| GET | `/health` | - | Health check |
| POST | `/v1/reason` | `gemini-3-flash-preview` | Main chat endpoint, generates text response |
| POST | `/v1/speak` | `gemini-3.1-flash-tts-preview` | Text-to-speech, returns audio/wav |

---

## Data Flow

### Two-Way Voice Communication

#### 1. User → Savia (Speech-to-Text)
```
Browser Microphone → Web Speech API → Text Transcription → POST /v1/reason
```

#### 2. Savia Processing (Backend)
```
Request Received
    ↓
Extract Intent ( LLM: gemini-3-flash-preview)
    ↓
Get User Data (mock database)
    ↓
Generate Response (LLM: gemini-3-flash-preview)
    ↓
Return JSON {text, voice_instruction, intent}
```

#### 3. Savia → User (Text-to-Speech)
```
Response Text → POST /v1/speak
    ↓
Gemini 3.1 Flash TTS (REST API)
    ↓
Audio/WAV Stream → Browser Audio Playback
```

---

## Model Usage

### Gemini 3 Flash Preview
- **Endpoint**: `/v1/reason`
- **Purpose**: Text generation, intent detection
- **Temperature**: 0.7 (responses), 0.1 (intent classification)
- **Context**: User balance, transaction history, intent-specific instructions

### Gemini 3.1 Flash TTS Preview
- **Endpoint**: `/v1/speak`
- **Purpose**: High-quality text-to-speech with controllable expression
- **Voices**: Kore (stable), additional voices for expressive mode
- **Output**: WAV audio format
- **Features**: Audio tags, multi-speaker support, SynthID watermarking

---

## Authentication & Security

### API Key Management (Updated)
- **Before**: Frontend stored API key in localStorage, sent via `X-Gemini-Api-Key` header
- **After**: Backend-only API key via `GOOGLE_API_KEY` environment variable
- **Benefit**: No sensitive keys exposed to client-side code

### Admin Mode (Removed)
- **Before**: Admin mode toggle in Settings, `X-Admin-Mode` header
- **After**: All users have full access to data (no role-based restrictions)
- **Simplified**: Single user experience without permission levels

### CORS Configuration
```go
Headers: Content-Type, Authorization
Methods: POST, GET, OPTIONS
Origin: Configurable (currently allows all for dev)
```

---

## Deployment Architecture

### Backend (Cloud Run)
```bash
Service: savia-be
Region: us-central1
Environment:
  - GOOGLE_API_KEY: Gemini API key (required)
  - PORT: 8080 (default)
```

**Deployment Command:**
```bash
gcloud run deploy savia-be \
  --source ./be \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_API_KEY=your-key"
```

### Frontend (Firebase Hosting)
```bash
Project: savia-demo
Environment:
  - VITE_API_URL: Backend URL
```

**Deployment Command:**
```bash
cd fe && npm run build && firebase deploy --project=savia-demo
```

---

## Data Models

### ReasonRequest
```json
{
  "user_id": "demo_user",
  "message": "What is my balance?"
}
```

### ReasonResponse
```json
{
  "text": "Your balance is $12,450.00",
  "voice_instruction": "stable",
  "search_strategy": "single_llm_call",
  "intent": "check_balance"
}
```

### SpeakRequest
```json
{
  "text": "Your balance is $12,450.00",
  "voice_instruction": "stable"
}
```

### TTSResponse
- Content-Type: `audio/wav`
- Body: Binary WAV audio data

---

## Intent Classification

The system classifies user queries into 15+ intents:

| Category | Intents |
|----------|---------|
| Financial | `check_balance`, `transaction_history`, `transfer_money`, `withdraw` |
| Account | `account_info`, `account_settings`, `security` |
| Products | `card_services`, `loan`, `investments`, `insurance` |
| Support | `support`, `complaint`, `feedback` |
| Safety | `policy_inquiry`, `fraud_security` |
| General | `general` |

---

## Logic Engine (Manglekit)

### Datalog Rules (`resources/rules.dl`)
- **halt/1**: Security policy violations
- **search_strategy/1**: Determines query approach (direct, sql, vector)
- **active_template/1**: Prompt template selection
- **active_voice_id/1**: Voice configuration
- **prompt_blueprint/2**: Dynamic prompt construction

### Fallback Mode
If Manglekit initialization fails (missing `rules.dl`), the system operates in **fallback mode**:
- Direct Gemini API calls without logic enforcement
- Health endpoint returns: `"OK (fallback mode)"`
- All functionality preserved, minus policy checks

---

## Mock Data (Development)

### User Database (`mockUsers`)
```go
demo_user: Balance $12,450.00
            Transactions: Grocery, Netflix, Gas, Salary, Coffee

user_123:  Balance $8,230.50
            Transactions: Amazon, Spotify, Electric, Paycheck, Restaurant
```

---

## Error Handling

### Common Error Responses

| Error | Cause | Solution |
|-------|-------|-----------|
| 401 Unauthorized | API key not set in backend | Set `GOOGLE_API_KEY` env var |
| 429 Quota Exceeded | Gemini API rate limit | Wait or enable billing |
| 400 Invalid Argument | Wrong model name or request format | Check model IDs |
| Empty Response | Filtered by safety settings | Adjust safety thresholds |

---

## Observability

### Logging
- Go standard `log` package
- Structured logs for: intent detection, API calls, errors
- Datadog + OpenTelemetry integration (planned)

### Health Check
```bash
curl <backend-url>/health
# Returns: "OK" or "OK (fallback mode)"
```

---

## Future Enhancements

1. **Manglekit Integration**: Full Datalog reasoning with BigQuery facts
2. **BigQuery Connector**: Real user data instead of mocks
3. **Multi-Speaker TTS**: Dialog mode with different voices
4. **Voice Activity Detection**: Interrupt current speech with new input
5. **Caching Layer**: Redis for frequent queries
6. **Rate Limiting**: Per-user request throttling
7. **Audit Logs**: All interactions logged for compliance

---

## File Structure

```
savia/
├── be/                         # Go Backend
│   ├── cmd/
│   │   └── main.go            # API entrypoint, handlers
│   ├── internal/
│   │   ├── tts/
│   │   │   ├── gemini.go     # Gemini 3.1 Flash TTS
│   │   │   └── elevenlabs.go # ElevenLabs (deprecated)
│   │   ├── actions/          # BigQuery, assessments
│   │   └── utils/           # Interpolation, helpers
│   ├── resources/
│   │   └── rules.dl         # Datalog logic rules
│   ├── Dockerfile            # Container definition
│   └── go.mod               # Go dependencies
│
├── fe/                         # React Frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/
│   │   │   └── useSaviaBrain.ts  # Core logic hook
│   │   ├── services/
│   │   │   ├── api.ts       # Backend API client
│   │   │   └── elevenlabs.ts # TTS service
│   │   ├── lib/
│   │   │   └── gemini.ts    # Deprecated
│   │   └── types.ts         # TypeScript types
│   ├── public/
│   └── package.json          # Node dependencies
│
├── docs/
│   ├── ADD.md                # This architecture document
│   └── ...                 # Other documentation
│
├── README.md                 # Project overview
└── DEPLOYMENT.md            # Deployment procedures
```

---

**Last Updated**: April 24, 2026  
**Version**: 1.0  
**Maintainers**: duynguyendang
