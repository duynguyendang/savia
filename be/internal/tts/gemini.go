package tts

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type TTSRequest struct {
	Contents        []Content       `json:"contents"`
	GenerationConfig GenerationConfig `json:"generationConfig"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

type Part struct {
	Text       string     `json:"text,omitempty"`
	InlineData *InlineData `json:"inlineData,omitempty"`
}

type InlineData struct {
	Data     string `json:"data"`
	MIMEType string `json:"mimeType"`
}

type GenerationConfig struct {
	ResponseModalities []string     `json:"responseModalities"`
	SpeechConfig      SpeechConfig `json:"speechConfig"`
}

type SpeechConfig struct {
	VoiceConfig VoiceConfig `json:"voiceConfig"`
}

type VoiceConfig struct {
	PrebuiltVoiceConfig PrebuiltVoiceConfig `json:"prebuiltVoiceConfig"`
}

type PrebuiltVoiceConfig struct {
	VoiceName string `json:"voiceName"`
}

type TTSResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content Content `json:"content"`
}

func StreamGeminiSpeech(w http.ResponseWriter, text, voiceInstruction, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("API key is required")
	}

	voiceName := "Kore"
	if voiceInstruction == "expressive" {
		voiceName = "Kore"
	}

	reqBody := TTSRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{Text: text},
				},
			},
		},
		GenerationConfig: GenerationConfig{
			ResponseModalities: []string{"AUDIO"},
			SpeechConfig: SpeechConfig{
				VoiceConfig: VoiceConfig{
					PrebuiltVoiceConfig: PrebuiltVoiceConfig{
						VoiceName: voiceName,
					},
				},
			},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %v", err)
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}

	var ttsResp TTSResponse
	if err := json.Unmarshal(body, &ttsResp); err != nil {
		return fmt.Errorf("failed to parse response: %v", err)
	}

	if len(ttsResp.Candidates) == 0 || len(ttsResp.Candidates[0].Content.Parts) == 0 {
		return fmt.Errorf("no audio generated")
	}

	// Extract audio data from inlineData
	var audioData []byte
	for _, part := range ttsResp.Candidates[0].Content.Parts {
		if part.InlineData != nil && part.InlineData.Data != "" {
			data, err := base64.StdEncoding.DecodeString(part.InlineData.Data)
			if err != nil {
				return fmt.Errorf("failed to decode audio: %v", err)
			}
			audioData = append(audioData, data...)
		}
	}

	if len(audioData) == 0 {
		return fmt.Errorf("no audio data found")
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Write(audioData)

	return nil
}
