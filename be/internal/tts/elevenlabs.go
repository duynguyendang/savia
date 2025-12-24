package tts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// StreamSpeech proxies text-to-speech requests to ElevenLabs securely
func StreamSpeech(w http.ResponseWriter, text, voiceID string) error {
	apiKey := os.Getenv("ELEVENLABS_API_KEY") // Injected via Secret Manager
	if apiKey == "" {
		return fmt.Errorf("ELEVENLABS_API_KEY is not set")
	}

	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s/stream", voiceID)

	payload, _ := json.Marshal(map[string]interface{}{
		"text":     text,
		"model_id": "eleven_turbo_v2", // Optimized for low latency
		"voice_settings": map[string]float64{
			"stability":        0.5,
			"similarity_boost": 0.8,
		},
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Use a client with a timeout for production safety, though default is okay for now
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("upstream request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("TTS upstream error (status %d): %s", resp.StatusCode, string(body))
	}

	// Stream the audio back to the client
	w.Header().Set("Content-Type", "audio/mpeg")
	if _, err := io.Copy(w, resp.Body); err != nil {
		return fmt.Errorf("failed to stream response: %v", err)
	}

	return nil
}
