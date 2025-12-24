package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(HealthHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	expected := "OK"
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body.String(), expected)
	}
}

func TestReasonHandler(t *testing.T) {
	req, err := http.NewRequest("POST", "/v1/reason", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	projectID := "test-project-id"
	handler := ReasonHandler(projectID)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var resp map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	expectedText := "Logic OK, Project: " + projectID
	if resp["text"] != expectedText {
		t.Errorf("handler returned unexpected text: got %v want %v",
			resp["text"], expectedText)
	}

	if resp["voice_instruction"] != "neutral" {
		t.Errorf("handler returned unexpected voice_instruction: got %v want %v",
			resp["voice_instruction"], "neutral")
	}
}

func TestReasonHandler_MethodNotAllowed(t *testing.T) {
	req, err := http.NewRequest("GET", "/v1/reason", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := ReasonHandler("any-project")
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusMethodNotAllowed {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusMethodNotAllowed)
	}
}

func TestSpeakHandler(t *testing.T) {
	req, err := http.NewRequest("POST", "/v1/speak", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(SpeakHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	contentType := rr.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "audio/mpeg") {
		t.Errorf("handler returned wrong content type: got %v want audio/mpeg", contentType)
	}

	if len(rr.Body.Bytes()) != 100 {
		t.Errorf("handler returned wrong content length: got %d want 100", len(rr.Body.Bytes()))
	}
}
