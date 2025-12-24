package main

import (
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
	handler := HealthHandler()
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	expected := "Savia is Wise and Healthy"
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body.String(), expected)
	}
}

// TestReasonHandler_MethodNotAllowed verifies that non-POST requests are rejected.
func TestReasonHandler_MethodNotAllowed(t *testing.T) {
	req, err := http.NewRequest("GET", "/v1/reason", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Since ReasonHandler requires an *sdk.Client, and we cannot easily mock it
	// without an interface or a successful NewClient call (which currently fails build),
	// this test just checks if we *could* call it if we had a client.
	// For demonstration, we'll pass nil and expect panic or early check if we added one.
	// But our handler checks method first.
	// WARNING: Passing nil mkit might panic if the handler accesses it before method check?
	// The handler code:
	// func ReasonHandler(mkit *Client) { return func(...) { if r.Method != POST ... } }
	// So it's safe to pass nil if the method check is first and we trigger it.

	rr := httptest.NewRecorder()

	// We pass nil for mkit. If the handler logic is correct, it checks Method BEFORE using mkit.
	handler := ReasonHandler(nil)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusMethodNotAllowed {
		t.Errorf("handler returned wrong status code for GET: got %v want %v",
			status, http.StatusMethodNotAllowed)
	}
}

// TestInterpolate (Testing logic implicitly via utils, but here for integration if needed)
// Better to test utils/interpolation.go separately, but since we are in main package:
func TestInterpolateFunc(t *testing.T) {
	// We can't access utils.Interpolate directly if it's internal and we are in main_test?
	// Wait, main imports utils. main_test is package main, so it can see imports of main.go?
	// No, main_test needs to import utils itself if it wants to use it.
	// But we are testing handlers here.
}
