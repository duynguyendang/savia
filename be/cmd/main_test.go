package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func TestReasonHandler_ServiceUnavailable(t *testing.T) {
    // mkClient is nil in tests
	body := map[string]string{
        "user_id": "test_user",
        "query": "check balance",
    }
    bodyBytes, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", "/v1/reason", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := ReasonHandler("test-project")
	handler.ServeHTTP(rr, req)

	// Expect 503 because mkClient is nil
	if status := rr.Code; status != http.StatusServiceUnavailable {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusServiceUnavailable)
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

func TestSpeakHandler_NoAPIKey(t *testing.T) {
    // No env var set, expecting 503
	body := map[string]string{
        "text": "hello",
        "voice_id": "voice",
    }
    bodyBytes, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", "/v1/speak", bytes.NewReader(bodyBytes))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(SpeakHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusServiceUnavailable {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusServiceUnavailable)
	}
}
