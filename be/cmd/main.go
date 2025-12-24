package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/bigquery"
)

func main() {
	ctx := context.Background()

	// 1. Auto-Detect Project ID
	bqClient, err := bigquery.NewClient(ctx, bigquery.DetectProjectID)
	if err != nil {
		log.Fatalf("Failed to detect project: %v", err)
	}
	projectID := bqClient.Project()
	log.Printf("Detected Project ID: %s", projectID)
	// We don't strictly need to keep the client open, but we should close it.
	bqClient.Close()

	// 2. Secrets Verification
	logSecret("GOOGLE_API_KEY")
	logSecret("ELEVENLABS_API_KEY")

	// 3. File Check
	if _, err := os.Stat("./resources/"); !os.IsNotExist(err) {
		log.Println("./resources/ directory exists")
	} else {
		log.Println("./resources/ directory does NOT exist")
	}

	// 4. Handlers
	http.HandleFunc("/health", HealthHandler)
	http.HandleFunc("/v1/reason", ReasonHandler(projectID))
	http.HandleFunc("/v1/speak", SpeakHandler)

	// 5. Port Binding
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func logSecret(key string) {
	val := os.Getenv(key)
	if len(val) >= 4 {
		log.Printf("%s: %s...", key, val[:4])
	} else {
		log.Printf("%s: (not set or too short)", key)
	}
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "OK")
}

func ReasonHandler(projectID string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp := map[string]string{
			"text":              "Logic OK, Project: " + projectID,
			"voice_instruction": "neutral",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

func SpeakHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	// 100 bytes of dummy data
	data := make([]byte, 100)
	w.Write(data)
}
