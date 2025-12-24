package utils

import (
	"context"
	"fmt"
	"strings"

	"github.com/duynguyendang/manglekit/sdk"
)

// Interpolate replaces {{key}} in the template with values from the facts map.
func Interpolate(template string, facts map[string]interface{}) string {
	result := template
	for key, value := range facts {
		placeholder := fmt.Sprintf("{{%s}}", key)
		valStr := fmt.Sprintf("%v", value)
		result = strings.ReplaceAll(result, placeholder, valStr)
	}
	return result
}

// GetFactValue extracts the first string argument of a predicate.
// E.g. active_template("standard_data") -> "standard_data"
func GetFactValue(facts []string, predicate string) string {
	// Simple regex: predicate("value"...)
	// Note: Datalog facts in Manglekit string list usually look like: predicate("arg1", arg2)
	prefix := predicate + "("
	for _, f := range facts {
		if strings.HasPrefix(f, prefix) {
			// Extract content inside parenthesis
			content := strings.TrimPrefix(f, prefix)
			content = strings.TrimSuffix(content, ")")
			// Split by comma to get first arg
			args := strings.Split(content, ",")
			if len(args) > 0 {
				val := strings.TrimSpace(args[0])
				// Unquote if it's a string
				val = strings.Trim(val, "\"")
				return val
			}
		}
	}
	return ""
}

// GetBlueprintContent extracts the blueprint content (second argument).
// E.g. prompt_blueprint("id", "content") -> "content"
func GetBlueprintContent(facts []string, id string) string {
	// Look for prompt_blueprint("id", "content")
	// We can do a simple prefix search or regex.
	// Regex is safer for quoted strings containing commas.
	// prompt_blueprint\("id",\s*"(.*)"\)

	// Construct regex pattern
	// pattern := fmt.Sprintf(`prompt_blueprint\("%s",\s*"(.*)"\)`, regexp.QuoteMeta(id))
	// But content might be multiline or contain escaped quotes.

	// Simple approach: iteration
	prefix := fmt.Sprintf(`prompt_blueprint("%s",`, id)
	for _, f := range facts {
		if strings.HasPrefix(f, prefix) {
			// Content starts after the prefix and specific quote
			// prompt_blueprint("id", "CONTENT")
			// start index is len(prefix) + space + "
			start := strings.Index(f, `", "`)
			if start == -1 {
				continue
			}
			start += 4 // skip `", "`
			// End is last `")`
			end := strings.LastIndex(f, `")`)
			if end == -1 || end <= start {
				continue
			}
			content := f[start:end]
			// Unescape common logic if needed, but for simple flow:
			return content
		}
	}
	return ""
}

func ExtractPromptVars(ctx context.Context, client *sdk.Client, facts []string) (map[string]interface{}, error) {
	query := `prompt_var(Key, Value)`

	solutions, err := client.Engine().Query(ctx, facts, query)
	if err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	for _, sol := range solutions {
		if k, ok := sol["Key"]; ok {
			result[k] = sol["Value"]
		}
	}
	return result, nil
}
