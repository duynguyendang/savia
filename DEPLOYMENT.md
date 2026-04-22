# Savia Deployment Guide

## Overview

Savia is a neuro-symbolic AI assistant with two deployment targets:
- **Frontend:** Firebase Hosting (`savia-demo` project)
- **Backend:** Google Cloud Run (`savia-be` service)

---

## Project Structure

```
savia/
├── be/                         # Go Backend (Cloud Run)
│   ├── cmd/main.go            # API entrypoint, handlers, routes
│   ├── internal/              # Business logic (actions, tts, utils)
│   ├── resources/             # Datalog rules (rules.dl, policies.dl)
│   └── Dockerfile             # Container definition
├── fe/                         # React Frontend (Firebase)
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── lib/              # Gemini Live audio utilities
│   │   ├── services/api.ts    # API client (axios)
│   │   └── App.tsx           # Main app component
│   └── .env                   # Environment variables
└── ref/                        # Reference design (do not modify)
```

---

## Architecture

### API Communication

```
Browser (FE) ────► Cloud Run (BE) ────► Gemini API
                     │
                     └──► Manglekit Engine (optional, fallback to direct Gemini)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check, returns "OK" or "OK (fallback mode)" |
| POST | `/v1/reason` | Main chat endpoint |
| POST | `/v1/speak` | TTS placeholder (not implemented) |

### Request/Response Format

**POST /v1/reason**
```json
// Request
{ "user_id": "demo_user", "message": "What is my balance?" }

// Response
{
  "text": "Your balance is $12,450.00",
  "voice_instruction": "stable",
  "search_strategy": "single_llm_call",
  "intent": "check_balance"
}
```

### Authentication

Frontend sends API key via header:
- `X-Gemini-Api-Key`: User's Gemini API key (from Settings UI)
- `X-Admin-Mode`: `true` enables admin access to sensitive data

---

## Deployment Procedures

### Backend (Cloud Run)

**Prerequisites:**
- `gcloud` CLI authenticated
- Google Cloud project with Cloud Run API enabled

**Deploy:**
```bash
cd savia/be
gcloud run deploy savia-be \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated
```

**Environment Variables (set in Cloud Run):**
- `GOOGLE_API_KEY` or `GEMINI_API_KEY`: Default Gemini API key (optional, users can provide their own)
- `PORT`: HTTP port (default: 8080)

**Get Backend URL:**
```bash
gcloud run services describe savia-be --region=us-central1 --format='value(status.url)'
```

---

### Frontend (Firebase)

**Prerequisites:**
- `firebase` CLI authenticated to `savia-demo` project

**Configure API URL:**
Edit `fe/.env`:
```
VITE_API_URL=https://savia-be-xxxx-uc.run.app
```

**Deploy:**
```bash
cd savia/fe
npm run build
firebase deploy --project=savia-demo
```

**Firebase Project:** `savia-demo` (Project ID: `savia-demo`)

---

## Environment Variables

### Frontend (`fe/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend URL |

### Backend (Cloud Run)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Gemini API key (optional, users can provide their own) |
| `GEMINI_API_KEY` | Alternative Gemini API key |
| `PORT` | HTTP port (default: 8080) |

---

## Local Development

### Backend
```bash
cd savia/be
go mod tidy
go run cmd/main.go
# Server runs on http://localhost:8080
```

### Frontend
```bash
cd savia/fe
npm install
npm run dev
# App runs on http://localhost:5173
```

**Note:** Frontend expects backend at `VITE_API_URL`. For local dev, set `.env` to `http://localhost:8080`.

---

## Key Files Reference

### Frontend API Client (`fe/src/services/api.ts`)
- Base URL from `VITE_API_URL` env var
- Sends `X-Gemini-Api-Key` and `X-Admin-Mode` headers
- User settings stored in `localStorage`

### Backend Main Handler (`be/cmd/main.go`)
- `ReasonHandler()` - Main chat endpoint
- `HealthHandler()` - Health check
- `processUserQuery()` - Direct Gemini API call (fallback mode)
- `processWithManglekit()` - Manglekit engine (requires rules.dl)

### Important Notes
- Manglekit is optional and falls back to direct Gemini calls if initialization fails
- Backend uses mock user data for demo purposes
- Voice mode (VoiceModeOverlay) uses Gemini Live API - requires `@google/genai` package

---

## Troubleshooting

**Frontend cannot reach backend:**
- Check `VITE_API_URL` is set correctly
- Verify Cloud Run service is running: `curl https://savia-be-xxxx.run.app/health`

**"API key not configured":**
- Either set `GOOGLE_API_KEY` in Cloud Run, OR
- User must add their own API key in the Settings UI

**Admin mode not working:**
- Toggle admin mode in Settings UI
- Verify `X-Admin-Mode: true` header is sent (check browser console)

---

## GCP Resources

| Resource | Project | Region |
|----------|---------|--------|
| Cloud Run (savia-be) | gca-hackathon | us-central1 |
| Firebase Hosting | savia-demo | - |

**Backend URL:** `https://savia-be-180036253374.us-central1.run.app`
**Frontend URL:** `https://savia-demo.web.app`