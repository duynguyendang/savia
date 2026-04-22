package tts

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type GeminiTTSRequest struct {
	Model  string                 `json:"model"`
	Input  map[string]string      `json:"input"`
	Config map[string]interface{} `json:"config,omitempty"`
}

type GeminiTTSResponse struct {
	AudioContent string `json:"audioContent"`
}

func StreamSpeech(w http.ResponseWriter, text, voiceInstruction string) error {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GOOGLE_API_KEY is not set")
	}

	config := map[string]interface{}{
		"voice": map[string]string{
			"languageCode": "en-US",
			"name":         "en-US-Standard-A",
		},
		"audioConfig": map[string]string{
			"audioEncoding": "MP3",
		},
	}

	if voiceInstruction != "" {
		config["voice"].(map[string]string)["ssmlGender"] = voiceInstruction
	}

	reqBody := map[string]interface{}{
		"input":  map[string]string{"text": text},
		"config": config,
	}

	payloadBytes, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("https://texttospeech.googleapis.com/v1/text:synthesize?key=%s", apiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

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

	var result GeminiTTSResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %v", err)
	}

	audioBytes, err := base64.StdEncoding.DecodeString(result.AudioContent)
	if err != nil {
		return fmt.Errorf("failed to decode audio: %v", err)
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Write(audioBytes)

	return nil
}
