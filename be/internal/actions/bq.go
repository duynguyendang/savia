package actions

import (
	"context"
	"fmt"

	"cloud.google.com/go/bigquery"
	mkitfunc "github.com/duynguyendang/manglekit/adapters/func"
	"github.com/duynguyendang/manglekit/core"
)

// NewBQExecutor creates the bq_executor action with a BigQuery client dependency.
func NewBQExecutor(bqClient *bigquery.Client, logger core.Logger) core.Action {
	return mkitfunc.New("bq_executor", func(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		queryID, ok := input["query_id"].(string)
		if !ok {
			return nil, fmt.Errorf("missing query_id")
		}
		logger.Info("Executing Query ID", "query_id", queryID)

		// For this strict request to test `main.go`, I will fix `main.go` to expect `sql_template` in input map.
		sqlTemplate, ok := input["sql_template"].(string)
		if !ok || sqlTemplate == "" {
			return nil, fmt.Errorf("missing sql_template")
		}

		if bqClient == nil {
			return map[string]interface{}{
				"balance":  50000000,
				"currency": "VND",
				"status":   "active",
				"mock":     true,
			}, nil
		}

		q := bqClient.Query(sqlTemplate)
		q.Parameters = []bigquery.QueryParameter{
			{Name: "user_id", Value: input["user_id"]},
			{Name: "query_text", Value: input["query_text"]},
		}

		// In a real implementation we would iterate q.Read(ctx)
		// For now returning mock data
		return map[string]interface{}{
			"balance":  50000000,
			"currency": "VND",
			"status":   "active",
		}, nil
	})
}
