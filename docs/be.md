# Savia-BE: Neuro-Symbolic Backend LLD

## 1. System Overview

**Savia-BE** is a high-security Neuro-Symbolic orchestration service. It utilizes **Manglekit** as its governance kernel to ensure every AI response is audited against formal logic and grounded in **BigQuery** truth.

### Key Architectural Shifts:

* **Secure Audio Proxy:** The ElevenLabs API Key is managed server-side via GCP Secret Manager. The backend acts as a streaming proxy, preventing sensitive credentials from leaking to the frontend.
* **Logic-Driven Voice Selection:** Datalog rules determine not only *what* to say but *how* to say it (Voice ID, stability, style).
* **Streaming Delivery:** Uses chunked transfer encoding to minimize perceived latency for voice output.

---

## 2. Directory Structure

```text
be/
├── cmd/
│   └── main.go                  # Entrypoint, Action Registry, and Proxy Handlers
├── internal/
│   ├── tts/
│   │   └── elevenlabs.ts        # Secure Streaming Proxy for ElevenLabs
│   └── utils/
│       └── interpolation.go     # String template engine
├── resources/
│   ├── policies.dl              # Security, RBAC, and Compliance
│   └── rules.dl                 # SQL Registry, Prompt Blueprints, and Voice Mapping
├── go.mod
└── Dockerfile

```

---

## 3. Component Specifications

### 3.1. Secure Audio Proxy (`internal/tts/elevenlabs.go`)

This component handles the secure connection to ElevenLabs and pipes the binary stream back to the client.

```go
package tts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func StreamSpeech(w http.ResponseWriter, text, voiceID string) error {
	apiKey := os.Getenv("ELEVENLABS_API_KEY") // Injected via Secret Manager
	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s/stream", voiceID)

	payload, _ := json.Marshal(map[string]interface{}{
		"text":     text,
		"model_id": "eleven_turbo_v2", // Optimized for low latency
		"voice_settings": map[string]float64{
			"stability":        0.5,
			"similarity_boost": 0.8,
		},
	})

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		return fmt.Errorf("TTS upstream error")
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "audio/mpeg")
	_, err = io.Copy(w, resp.Body) // Direct streaming to frontend
	return err
}

```

### 3.2. Main Orchestrator (`cmd/main.go`)

The host that bridges the Manglekit Kernel with external services.

```go
// ... imports ...

func main() {
	// 1. Init Manglekit Client
	mkit, _ := sdk.NewClient(ctx, 
		sdk.WithBlueprint("./resources/policies.dl"),
		sdk.WithBlueprint("./resources/rules.dl"),
	)

	// 2. Reasoning Endpoint: Determines the Logic & Response Text
	http.HandleFunc("/v1/reason", func(w http.ResponseWriter, r *http.Request) {
		// ... (Execute Manglekit actions) ...
		result, _ := mkit.ExecuteByName(ctx, "savia_agent", payload)
		
		// Return Text and the Voice ID determined by Datalog
		json.NewEncoder(w).Encode(map[string]string{
			"text":     result.GetFact("response_text"),
			"voice_id": result.GetFact("active_voice_id"),
			"trace_id": result.Metadata["trace_id"],
		})
	})

	// 3. Voice Proxy Endpoint: Securely generates audio
	http.HandleFunc("/v1/speak", func(w http.ResponseWriter, r *http.Request) {
		var req struct { Text string; VoiceID string }
		json.NewDecoder(r.Body).Decode(&req)
		
		tts.StreamSpeech(w, req.Text, req.VoiceID)
	})

	http.ListenAndServe(":8080", nil)
}

```

### 3.3. Intelligence Layer (`resources/rules.dl`)

Defines the mapping between personas and ElevenLabs Voice IDs.

```prolog
% ===========================================================
% VOICE SELECTION LOGIC
% ===========================================================

% Voice Registry
voice_data("analytical", "21m00Tcm4TlvDq8ikWAM"). % Rachel
voice_data("empathetic", "AZnzlk1XvdvUeBnXmlld"). % Domi

% Select Voice ID based on the vibe determined in synthesis
active_voice_id(ID) :- 
    voice_style(Style), 
    voice_data(Style, ID).

% Force analytical voice for financial data
voice_style("analytical") :- intent("check_balance").

```

---

## 4. Deployment & Security Strategy

### Secret Management

The `ELEVENLABS_API_KEY` must **never** be stored in `.env` files within the repository.

1. **Store:** Use Google Cloud Secret Manager.
2. **Access:** Grant the Cloud Run service account the `Secret Manager Secret Accessor` role.
3. **Injection:** Map the secret to an environment variable in the Cloud Run service configuration.

### Latency Optimization

* Use `eleven_turbo_v2` model in the TTS proxy.
* The frontend should use `HTMLAudioElement` or `Web Audio API` to play the binary stream immediately as chunks arrive.