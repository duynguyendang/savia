package actions

import (
	"context"

	mkitfunc "github.com/duynguyendang/manglekit/adapters/func"
	"github.com/duynguyendang/manglekit/core"
)

// NewAssessContext creates the assess_context action.
func NewAssessContext() core.Action {
	return mkitfunc.New("assess_context", func(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error) {
		// Mock return for LLD:
		return map[string]interface{}{
			"role":         "customer",
			"tenure_years": 5,
			"history":      []string{"User: Hi", "Savia: Hello!"}, // Note: Datalog sees string array
		}, nil
	})
}
