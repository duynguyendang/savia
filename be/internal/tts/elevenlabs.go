package tts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ElevenLabsRequest struct {
	Text             string  `json:"text"`
	ModelID          string  `json:"model_id"`
	VoiceSettings    VoiceSettings `json:"voice_settings"`
}

type VoiceSettings struct {
	Stability        float64 `json:"stability"`
	SimilarityBoost float64 `json:"similarity_boost"`
	Style           float64 `json:"style"`
	UseSpeakerBoost bool    `json:"use_speaker_boost"`
}

type ElevenLabsResponse struct {
	AudioBase64 string `json:"audio_base64"`
}

func StreamSpeech(w http.ResponseWriter, text, voiceInstruction, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("ElevenLabs API key is required")
	}

	voiceID := "EXAVITQu4vr4xnSDxMaL" // Default voice
	modelID := "eleven_flash_v2_5"

	if voiceInstruction == "expressive" {
		voiceID = "pFZP5JQG7iQjIQuC4Bku" // Different voice for expressive
	}

	reqBody := ElevenLabsRequest{
		Text:    text,
		ModelID: modelID,
		VoiceSettings: VoiceSettings{
			Stability:        0.5,
			SimilarityBoost:  0.8,
			Style:           0.0,
			UseSpeakerBoost:  true,
		},
	}

	payloadBytes, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", voiceID)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Accept", "audio/mpeg")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("upstream request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ElevenLabs error (status %d): %s", resp.StatusCode, string(body))
	}

	// ElevenLabs returns audio directly, not base64
	w.Header().Set("Content-Type", "audio/mpeg")
	io.Copy(w, resp.Body)

	return nil
}