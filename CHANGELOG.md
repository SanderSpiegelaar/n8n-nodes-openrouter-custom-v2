## 0.1.0

- Replaced the scaffolded Example node with an executable Openrouter LLM node.
- Added OpenRouter API credentials with API key, base URL, and attribution fields.
- Added package wiring, README content, and tests for the initial chat completion path.
- Added prompt assembly modes, model lookup, model variants, and fallback model payload handling.
- Added typed generation, reasoning, advanced sampling, response-healing, and session controls.
- Added custom request headers, Langfuse trace header support, and request body metadata.
- Added provider routing controls (allow/deny lists, sort, allow_fallbacks, require_parameters override) with conflict validation against `:nitro`/`:floor` model variants and overlapping allow/deny entries.
- Added structured output modes (Text / JSON Object / JSON Schema with AJV draft-07 validation and `ajv-formats`), a 1–5 attempt repair retry loop driven by a corrective system message capped at five errors, `metadata.validation_attempt` per attempt, byte-stable headers across retries, and an automatic `provider.require_parameters = true` default for structured modes when the user has not overridden it. Adds `ajv` and `ajv-formats` runtime dependencies; community node is no longer eligible for n8n Cloud verification.
