# OpenRouter Replacement Briefing

## Summary

This package currently exposes one AI root node, `OpenRouter Chat Model (Custom)`, plus one credential, `OpenRouter (Custom) API`. It is not a general-purpose executable n8n action node and it does not replace the basic LLM chain directly. Instead, it supplies an `AiLanguageModel` output by calling `supplyModel()` from `@n8n/ai-node-sdk`.

At runtime, the node uses OpenRouter through an OpenAI-compatible transport and attaches OpenRouter-specific features through `additionalParams`. The current package is useful as a feature-rich OpenRouter chat-model adapter, but it still inherits important behavior and limitations from n8n's AI node SDK, LangChain/OpenAI-compatible transport handling, and provider support behind OpenRouter routing.

This briefing is intended as a handoff for a new project that should preserve the useful OpenRouter feature surface while replacing the current chatmodel-only integration shape with a real executable n8n node.

## Current Functional Surface

### Package Shape

- One node: `OpenRouter Chat Model (Custom)`  
- One credential: `OpenRouter (Custom) API`  
- Node output type: `AiLanguageModel`  
- Integration style: model supplier built on `@n8n/ai-node-sdk`

### Credentials

The credential stores and applies:

- API key as a bearer token  
- Overrideable base URL, defaulting to `https://openrouter.ai/api/v1`  
- Optional `HTTP-Referer` header via `siteUrl`  
- Optional `X-Title` header via `appName`

The credential test request calls `GET /models` against the configured base URL.

### Model Selection

The node supports two model-selection paths:

- Searchable list mode backed by `GET /models`  
- Manual model ID entry mode for direct values such as `anthropic/claude-3-opus`

The `/models` lookup is filtered client-side by model ID or display name and returned as a sorted list.

### Core Generation Controls

The main `Options` collection exposes:

- `temperature`  
- `maxTokens`  
- `topP`  
- `frequencyPenalty`  
- `presencePenalty`  
- `stop`  
- `seed`  
- `promptCacheKey`

These values are forwarded through the `supplyModel()` configuration, with special handling for unset-style defaults such as `maxTokens = 0` and `seed = 0`.

### Reasoning Controls

The `Reasoning` collection exposes:

- `effort` with values `none`, `minimal`, `low`, `medium`, `high`  
- `maxThinkingTokens`

Reasoning effort is configured on the supplied model only when reasoning is explicitly enabled. Thinking-token limits are passed through via OpenRouter-specific additional parameters.

### Advanced Sampling

The `Sampling (Advanced)` collection exposes OpenRouter-specific controls beyond the OpenAI-style base options:

- `topK`  
- `repetitionPenalty`  
- `minP`  
- `topA`  
- `transforms`

Current transform support in the UI is limited to `middle-out`.

### Structured Output

The `Structured Output` collection exposes:

- `responseFormat` with `text`, `json_object`, `json_schema`  
- `schemaName`  
- `strict`  
- `schema`  
- `outputParserCompatible`

Current behavior:

- `text` leaves structured output unset  
- `json_object` forwards `response_format: { type: "json_object" }`  
- `json_schema` parses the provided JSON and forwards a `json_schema` wrapper with `name`, `strict`, and `schema`  
- `outputParserCompatible` wraps the user schema so the enforced response shape becomes `{ "output": ... }`

The node validates that the schema field is present, parses as JSON, and is an object rather than an array, primitive, or `null`.

### Routing / Provider Controls

The `Routing` collection exposes free-form OpenRouter routing controls:

- `modelVariant`  
- `fallbackModels`  
- `sort`  
- `allowProviders`  
- `denyProviders`  
- `allowFallbacks`

Current model variant options in the UI are:

- `:beta`  
- `:extended`  
- `:floor`  
- `:free`  
- `:nitro`  
- `:online`  
- default empty suffix

Current routing behavior supports:

- appending a selected variant suffix to the model ID  
- sending a fallback chain through `models`  
- sorting providers by `price`, `latency`, or `throughput`  
- preferred-provider allow list via `provider.order`  
- excluded-provider deny list via `provider.ignore`  
- explicit provider fallback allowance via `provider.allow_fallbacks`

### OpenRouter Web Search Plugin

The `Web Search` collection exposes:

- `enable`  
- `maxResults`  
- `searchPrompt`

When enabled, the node adds an OpenRouter web plugin entry with ID `web` and optional `max_results` and `search_prompt`.

### Custom Headers

The `Custom Headers` collection allows arbitrary extra headers to be attached to model requests. The intended use is observability or request-correlation integrations such as Langfuse session tracing, but the implementation is generic key/value passthrough.

This is separate from the credential-level `HTTP-Referer` and `X-Title` headers.

## Behavior Notes / Runtime Details

- The node strips any existing suffix after the first `:` from the chosen model ID before appending the selected `modelVariant`. This prevents stacked suffixes when the user picks a variant from the UI.  
- Stop sequences are comma-split, trimmed, filtered for empties, and capped at 4 before being sent as `stopSequences`.  
- `fallbackModels` is split on commas and sent as `models: [primary, ...fallbacks]`.  
- Custom headers are gathered into `defaultHeaders` and passed into the supplied model configuration.  
- Reasoning is omitted entirely when `effort` is `none`. The implementation comment explicitly states this avoids triggering the `@langchain/openai` Responses API path.  
- `maxThinkingTokens` is attached through `additionalParams.reasoning.max_tokens`, merged with any reasoning effort already configured.  
- Structured output enables `provider.require_parameters = true` so OpenRouter only routes to providers that honor `response_format`.  
- `outputParserCompatible` wraps the schema in:

{

  "type": "object",

  "properties": {

    "output": {}

  },

  "required": \["output"\],

  "additionalProperties": false

}

with the user schema inserted as the value of `properties.output`.

## Known Problems / Rewrite Drivers

### JSON Schema Handling Is Partial

The current implementation only:

- checks that the schema field is present when `responseFormat = json_schema`  
- parses JSON  
- verifies the parsed value is an object

It does not use AJV to validate that the schema itself is a valid JSON Schema document, and it does not perform node-owned runtime validation of model output against the schema.

### Structured Output Depends on Upstream Transport Behavior

Structured output is currently enforced by forwarding `response_format` through an OpenAI-compatible model transport and relying on OpenRouter plus the routed provider to honor it correctly. That means structured-output behavior is not owned end-to-end by this node.

### The Current Node Is Not a Real LLM Chain Replacement

This package supplies a chat model into n8n's AI graph. It does not execute as a standalone node that accepts normal items, performs prompt assembly and output validation under its own control, and returns ordinary n8n item data in the way a direct replacement for the basic LLM chain would.

### LangChain Compatibility Is Fragile Enough to Require Workarounds

The implementation contains an explicit workaround for `reasoning = none` because sending reasoning data can trigger the `@langchain/openai` Responses API path, which changes message formatting in a way that n8n's downstream agent-step parsing does not reliably handle. The inline comment mentions failures such as `Failed to parse agent steps` when an output parser is connected.

This is a strong signal that the current package is constrained by LangChain/OpenAI-compatible transport behavior rather than owning its execution contract directly.

### Provider Routing and Structured Output Still Depend on Provider Support

Even with `provider.require_parameters = true`, correctness still depends on what OpenRouter and the selected providers actually support at runtime. Provider routing, reasoning support, response-format support, and web/plugin behavior are not guaranteed solely by the node's local configuration.

## Important Non-Features

- There is no explicit provider preset feature in the current repo. The implementation exposes free-form provider routing controls, not named provider presets.  
- There is no standalone execution node that directly replaces the basic LLM chain.  
- There is no chain orchestration layer in this package.  
- There is no AJV-backed response validation layer.  
- There is no node-owned schema enforcement beyond basic schema JSON parsing and object-shape checks.

## Carry Forward Into New Project

- Preserve the useful OpenRouter feature surface rather than collapsing to a generic OpenAI-style subset.  
- Preserve credential-level OpenRouter headers and request-level custom headers.  
- Preserve model discovery from `/models` and manual model ID override.  
- Preserve routing controls such as model variants, fallback models, provider ordering, provider exclusion, and provider fallback behavior.  
- Preserve OpenRouter-only controls such as advanced sampling parameters and the web search plugin.  
- Replace the current chatmodel-only integration shape with a real executable n8n node that can act as a direct basic LLM chain replacement.  
- Move schema validation responsibility into the node layer with AJV so schema correctness and output validation are not delegated to LangChain/OpenAI transport assumptions.

## Sources of Truth

This briefing is based on the current implementation and recent commit history in this repository, primarily:

- `nodes/OpenRouterChatModel/OpenRouterChatModel.node.ts`  
- `credentials/OpenRouterApi.credentials.ts`  
- commit summaries describing the initial OpenRouter integration and later schema/reasoning refactors

It does not rely on the placeholder `README.md` as a feature source.  
