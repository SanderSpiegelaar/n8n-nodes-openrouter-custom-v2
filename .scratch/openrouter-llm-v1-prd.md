# PRD: Openrouter LLM Executable Node v1

Labels: needs-triage

## Problem Statement

Internal n8n workflows need a direct replacement for a basic LLM chain that calls OpenRouter as a normal executable node. The current project is scaffolded around an example node, while the previous OpenRouter implementation described in the briefing was an AI model supplier built on n8n AI/LangChain abstractions. That shape does not execute as a standalone node, does not own prompt assembly or response validation, and leaves structured-output correctness dependent on upstream transport and provider behavior.

The user needs one internal, programmatic, executable OpenRouter node that accepts normal n8n input items, sends one OpenRouter chat-completions request per item, validates structured responses locally, supports the OpenRouter routing and observability controls used internally, and returns stable ordinary n8n item data.

## Solution

Build a single programmatic executable node named `Openrouter LLM` with an `OpenRouter API` credential. The node will replace the scaffolded example node entirely. It will call OpenRouter directly over HTTP using n8n request facilities, targeting `POST /chat/completions` for v1. It will be text-only: text input and text or JSON output.

The node will support system-plus-user prompt mode by default, a single prompt mode, and an advanced Messages JSON mode. It will support searchable model selection from `/models` for text-capable models plus a free-form manual model or OpenRouter preset ID input. It will preserve important OpenRouter features through typed UI fields, including model variants, fallback models, provider routing, advanced sampling, reasoning, structured output, web search, response healing, custom request headers, and observability metadata.

Structured output will be owned by the node. The node will send OpenRouter `response_format` when configured, automatically set `provider.require_parameters = true` for structured output by default, and locally validate model output. `json_object` mode will require parseable non-array object JSON. `json_schema` mode will validate both schema correctness and model output using AJV draft-07 unless OpenRouter implementation-time docs require a newer dialect. Structured-output failures will retry the original request with an additional corrective system message, up to three total attempts, then fail with actionable validation details.

The default output will be a stable wrapper containing assistant `text`, `structured`, `model`, `finishReason`, `usage`, response `id`, and compact response metadata. Raw OpenRouter responses are included only when explicitly enabled. Original input data is omitted by default and can be nested under `input` when enabled.

## User Stories

1. As an internal workflow builder, I want a normal executable OpenRouter node, so that I can use it where I currently use a basic LLM chain.
2. As an internal workflow builder, I want one OpenRouter request per incoming item, so that item-level data, failures, and retries stay isolated.
3. As an internal workflow builder, I want a default system-plus-user prompt UI, so that common prompting is easy without raw JSON.
4. As an internal workflow builder, I want the system prompt to be optional, so that simple calls do not need boilerplate.
5. As an internal workflow builder, I want the user prompt to require non-empty resolved text, so that broken expressions fail before spending model cost.
6. As an internal workflow builder, I want prompts to support n8n expressions, so that I can interpolate incoming item data.
7. As an internal workflow builder, I want a single prompt mode, so that simple one-field prompt workflows stay compact.
8. As an internal workflow builder, I want Messages JSON mode, so that I can send multi-turn conversations when needed.
9. As an internal workflow builder, I want Messages JSON mode to accept arrays or JSON strings from expressions, so that workflows can build messages dynamically.
10. As an internal workflow builder, I want Messages JSON mode to validate `system`, `user`, and `assistant` roles, so that unsupported v1 message shapes fail clearly.
11. As an internal workflow builder, I want the node to reject empty message arrays and empty message content, so that invalid prompts do not reach OpenRouter.
12. As an internal workflow builder, I want searchable model selection from OpenRouter `/models`, so that I can pick known text-capable models easily.
13. As an internal workflow builder, I want manual model or OpenRouter preset ID input, so that I can use internal OpenRouter-side presets and newly added models.
14. As an internal workflow builder, I want manual preset IDs to be passed through with minimal validation, so that the user remains responsible for correct OpenRouter values.
15. As an internal workflow builder, I want v1 to omit `openrouter/auto`, so that the node only implements functionality we actually use internally.
16. As an internal workflow builder, I want text-capable models shown by default, so that image/audio/embedding models do not clutter a text-only node.
17. As an internal workflow builder, I want no hard filtering by selected feature support, so that viable models are not hidden due to incomplete provider metadata.
18. As an internal workflow builder, I want model variant suffixes such as `:nitro`, `:floor`, `:free`, `:extended`, `:exacto`, and `:online`, so that I can use OpenRouter routing shortcuts.
19. As an internal workflow builder, I want primary model suffix normalization before appending a selected variant, so that stacked suffixes are avoided.
20. As an internal workflow builder, I want fallback models as fixed collection rows, so that fallback chains are readable and less error-prone.
21. As an internal workflow builder, I want fallback models passed exactly as entered, so that fallback-specific suffixes remain intentional.
22. As an internal workflow builder, I want requests with fallbacks to send `models` only, so that the payload is unambiguous.
23. As an internal workflow builder, I want requests without fallbacks to send `model` only, so that simple requests stay standard.
24. As an internal workflow builder, I want provider allow and deny lists as fixed collection rows, so that provider routing is explicit.
25. As an internal workflow builder, I want provider sorting by documented stable values, so that I can route by price, latency, or throughput.
26. As an internal workflow builder, I want `provider.allow_fallbacks` unset by default, so that the node does not change OpenRouter behavior unless requested.
27. As an internal workflow builder, I want conflicting routing settings to fail fast, so that ambiguous combinations such as `:nitro` plus throughput sort are not silently accepted.
28. As an internal workflow builder, I want `:exacto` allowed with provider allow/deny lists, so that OpenRouter can resolve the final routing behavior.
29. As an internal workflow builder, I want typed OpenRouter UI fields instead of a generic extra request body escape hatch, so that the node remains controlled and supportable.
30. As an internal workflow builder, I want core generation controls, so that I can set temperature, max tokens, top-p, penalties, stop sequences, seed, and prompt cache key.
31. As an internal workflow builder, I want stop sequences as fixed collection rows, so that commas in stop text do not break parsing.
32. As an internal workflow builder, I want an empty max-tokens field to mean unset, so that zero is not overloaded as a sentinel value.
33. As an internal workflow builder, I want the node to send `max_tokens` for output budget, so that it matches chat-completion behavior.
34. As an internal workflow builder, I want reasoning controls through an explicit mode dropdown, so that `effort` and reasoning token budget cannot conflict.
35. As an internal workflow builder, I want reasoning effort values including `minimal`, `low`, `medium`, `high`, and `xhigh`, so that OpenRouter reasoning models can be tuned.
36. As an internal workflow builder, I want reasoning token budget via `reasoning.max_tokens`, so that thinking-token usage can be capped.
37. As an internal workflow builder, I want advanced `reasoning.exclude`, so that reasoning artifacts can be hidden from responses.
38. As an internal workflow builder, I want returned reasoning content included only when present, so that answer text remains clean.
39. As an internal workflow builder, I want advanced sampling controls, so that I can set OpenRouter-specific `top_k`, `repetition_penalty`, `min_p`, `top_a`, and transforms.
40. As an internal workflow builder, I want transforms as known documented options, so that unsupported transform IDs are not invented in workflows.
41. As an internal workflow builder, I want structured output modes for text, JSON object, and JSON schema, so that workflows can choose the right contract.
42. As an internal workflow builder, I want JSON object mode to parse and require a non-array object, so that downstream structured data is predictable.
43. As an internal workflow builder, I want JSON schema mode to accept raw JSON Schema only, so that advanced schemas are not blocked by a simplified builder.
44. As an internal workflow builder, I want schema documents validated before model calls where possible, so that invalid configuration fails early.
45. As an internal workflow builder, I want OpenRouter `response_format` sent for structured output, so that capable providers are constrained upstream.
46. As an internal workflow builder, I want AJV local validation to be the authority, so that correctness does not depend only on OpenRouter or provider behavior.
47. As an internal workflow builder, I want three total validation attempts for structured output, so that transient invalid JSON can self-correct without unbounded cost.
48. As an internal workflow builder, I want retries to resend the original request with a corrective system message, so that the model re-answers the actual task.
49. As an internal workflow builder, I want corrective messages to include AJV error summaries but not duplicate the full schema, so that retries stay concise.
50. As an internal workflow builder, I want failures after validation attempts to include attempt count, validation errors, and truncated last raw text, so that debugging is actionable.
51. As an internal workflow builder, I want text mode to leave `structured` null, so that the node does not auto-parse incidental JSON.
52. As an internal workflow builder, I want the old output-parser-compatible wrapper omitted, so that the executable node owns its own stable output contract.
53. As an internal workflow builder, I want `provider.require_parameters = true` automatically for structured output, so that providers that ignore response format are avoided by default.
54. As an internal workflow builder, I want an advanced override for provider parameter support, so that broader routing remains possible when needed.
55. As an internal workflow builder, I want OpenRouter response healing as a simple advanced toggle, so that upstream repair can be used without complicating v1.
56. As an internal workflow builder, I want web search support through the plugin configuration, so that I can set enablement, max results, and search prompt.
57. As an internal workflow builder, I want the `:online` variant supported but rejected when web plugin options are also enabled, so that duplicate web-search configuration is explicit.
58. As an internal workflow builder, I want custom request headers as advanced fixed collection rows, so that Langfuse and other tracing integrations can receive correlation headers.
59. As an internal workflow builder, I want custom header values to support n8n expressions, so that trace IDs can come from execution or item data.
60. As an internal workflow builder, I want a default Langfuse trace header using the execution ID, so that internal traces group per n8n execution.
61. As an internal workflow builder, I want protected headers to be non-overridable, so that node-level custom headers cannot replace authorization, `HTTP-Referer`, or `X-Title`.
62. As an internal workflow builder, I want default OpenRouter request metadata, so that execution, workflow, node, item, model, and validation attempt information is available for observability.
63. As an internal workflow builder, I want extra metadata rows with string or JSON value modes, so that additional typed observability data can be sent.
64. As an internal workflow builder, I want metadata sent only in the request body, so that custom headers remain explicit and separate.
65. As an internal workflow builder, I want headers stable across validation attempts and metadata attempt numbers updated per retry, so that observability reflects real behavior.
66. As an internal workflow builder, I want `session_id` exposed as an advanced top-level field, so that OpenRouter session semantics can be used when needed.
67. As an internal workflow builder, I do not want a `user` field in v1, so that PII-prone identifiers are not encouraged.
68. As an internal workflow builder, I want output to include assistant `text` under a stable key, so that downstream expressions are simple.
69. As an internal workflow builder, I want parsed validated data under `structured`, so that text and structured modes share one output wrapper.
70. As an internal workflow builder, I want `usage` passed through as OpenRouter returns it, so that provider-specific token and cost details are preserved.
71. As an internal workflow builder, I want OpenRouter response IDs and compact metadata included when available, so that support and tracing are easier.
72. As an internal workflow builder, I want raw responses only when explicitly enabled, so that normal workflow output stays stable and compact.
73. As an internal workflow builder, I want original input data omitted by default, so that output fields do not collide with input fields.
74. As an internal workflow builder, I want optional input inclusion under `input`, so that original item data can be preserved without top-level merging.
75. As an internal workflow builder, I want n8n's normal `continueOnFail` behavior respected, so that the node behaves like other executable nodes.
76. As an internal maintainer, I want the scaffolded example node removed, so that the package only ships the real internal OpenRouter node.
77. As an internal maintainer, I want the credential named `OpenRouter API`, so that credential naming is simple and not tied to the old custom adapter.
78. As an internal maintainer, I want strict build, lint, and type quality, so that the internal node remains maintainable even without public marketplace polish.
79. As an internal maintainer, I want package metadata, README, and changelog updated enough to stop looking scaffolded, so that future maintenance starts from accurate project context.

## Implementation Decisions

- Build one programmatic executable n8n node named `Openrouter LLM`.
- Replace the scaffolded example node rather than shipping it beside the real node.
- Add one credential named `OpenRouter API` with API key, base URL override, optional site URL, and optional app name.
- Keep credentials focused on authentication and identity headers only.
- Use direct OpenRouter HTTP calls through n8n request helpers rather than LangChain, the OpenAI SDK, or the n8n AI model supplier SDK.
- Use `POST /chat/completions` for v1.
- Use one request per input item.
- Restrict v1 to text input and text/JSON output.
- Exclude streaming, tool/function calling, image/audio multimodal input and output, `openrouter/auto`, and the old AI-root supplier node.
- Provide prompt modes for single prompt, system-plus-user prompt, and Messages JSON.
- Make system-plus-user prompt mode the default.
- Support n8n expressions in prompt, header, metadata, and advanced observability fields.
- Reject empty resolved user prompts, empty messages arrays, and empty message content.
- Allow Messages JSON roles `system`, `user`, and `assistant` only.
- Use searchable `/models` selection for text-capable models and a free-form manual model or OpenRouter preset ID path.
- Do not hard-filter model choices by selected features such as structured output, reasoning, or web search.
- Normalize suffixes only on the primary model before appending a selected model variant.
- Preserve fallback models exactly as entered.
- Use fixed collection rows for fallback models, provider allow lists, provider deny lists, stop sequences, custom headers, and extra metadata.
- Send only `models` when fallbacks exist; send only `model` otherwise.
- Support model variants including `:nitro`, `:floor`, `:free`, `:extended`, `:exacto`, and `:online`.
- Fail fast on conflicting routing combinations such as sort-equivalent variants plus explicit provider sorting.
- Allow `:exacto` with provider allow/deny lists.
- Leave `provider.allow_fallbacks` unset by default and expose explicit configured behavior as advanced routing.
- Use typed UI fields, not a generic extra request body JSON escape hatch.
- Use optional numeric fields where empty means unset; reject zero or negative numeric limits where invalid.
- Send `max_tokens` for output budget.
- Model reasoning as a mode dropdown with `Off`, `Effort`, `Token Budget`, and `Default Enabled`.
- Send either reasoning effort or reasoning max token budget, not both.
- Include `xhigh` as a reasoning effort option.
- Expose `reasoning.exclude` as an advanced field shown only when reasoning is enabled.
- Include reasoning content in output only when present.
- Map advanced sampling controls to OpenRouter request names.
- Use known documented transform options, not free-form transform IDs.
- Implement structured-output modes for text, JSON object, and JSON schema.
- Use raw JSON Schema input only for schema mode.
- Validate JSON Schema with AJV draft-07 unless implementation-time OpenRouter docs require a newer dialect.
- Send OpenRouter `response_format` for structured output and locally validate model output.
- Automatically set `provider.require_parameters = true` for structured output by default, with an advanced override.
- Apply three total validation attempts to both JSON object and JSON schema modes.
- Retry structured-output validation failures by resending the original request with an added corrective system message.
- Include AJV or parse error summaries in corrective messages; do not duplicate the full schema.
- Do not retry ordinary HTTP, network, or OpenRouter errors as part of the structured-output retry loop.
- Include the final validation attempt count, validation errors, and truncated last raw model text in validation failure errors.
- Add a simple advanced toggle for OpenRouter response healing.
- Expose web search plugin enablement, max results, and search prompt.
- Support `:online` but reject it when explicit web plugin configuration is also enabled.
- Expose custom request headers for observability/tracing, with expression support.
- Add a default Langfuse trace header using the n8n execution ID, controlled by a visible toggle defaulting on.
- Reject custom header overrides of authorization, `HTTP-Referer`, and `X-Title` case-insensitively.
- Include default OpenRouter metadata for execution ID, workflow ID, workflow name, node name, item index, model, and validation attempt.
- Allow extra metadata rows with string and JSON value modes.
- Send metadata only in the request body, not mirrored into headers.
- Keep headers stable across validation attempts and update metadata per attempt.
- Expose `session_id` as an advanced top-level field.
- Do not expose a `user` field in v1.
- Return only the stable output wrapper by default.
- Use `text` for assistant content and `structured` for parsed validated output.
- Include `model`, `finishReason`, `usage`, response `id`, and compact response metadata when available.
- Pass `usage` through without normalization.
- Include the full OpenRouter response under `raw` only when enabled.
- Add an advanced `Include Input Data` option that nests original input JSON under `input`.
- Follow n8n normal item failure and `continueOnFail` behavior.
- Update package metadata, README, and changelog enough for internal maintenance accuracy.
- Prefer internal ergonomics over public marketplace polish while preserving strict build, lint, type, and credential security standards.

## Testing Decisions

- Tests should cover external behavior and stable contracts rather than private implementation details.
- The strongest candidates for isolated tests are deep modules for prompt/message assembly, model resolution and routing validation, request body construction, structured-output parsing and validation, retry decision behavior, header construction, metadata construction, and output mapping.
- Model resolution tests should cover searchable model IDs, manual preset IDs, primary suffix normalization, fallback pass-through, and `model` versus `models` payload selection.
- Routing validation tests should cover provider allow/deny mapping, provider sort values, `allow_fallbacks` unset behavior, structured-output `require_parameters`, and conflict failures.
- Structured-output tests should cover text mode, JSON object parse success, JSON object array/null rejection, JSON schema validation success/failure, schema parse failure, and failure details after three total attempts.
- Retry tests should assert that validation failures retry the original request with a corrective system message and updated metadata attempt number.
- Header tests should cover default Langfuse trace header, expression-resolved headers, protected header rejection, and credential-level header precedence.
- Metadata tests should cover default metadata, extra string metadata, extra JSON metadata, protected default-key behavior if implemented, and per-attempt updates.
- Output mapping tests should cover default wrapper, optional raw response inclusion, optional nested input inclusion, usage pass-through, response IDs, compact response metadata, and reasoning content when present.
- Credential tests should cover secure API key handling, base URL defaulting, optional `HTTP-Referer` and `X-Title`, and credential test behavior against `/models`.
- Integration-level verification should build and lint through the `n8n-node` CLI.
- Manual verification should run the node in n8n dev mode and exercise at least a text response, JSON object response, JSON schema response, fallback model configuration, custom Langfuse trace header, and one validation failure.
- Existing prior art is minimal because the current repo contains only a scaffolded example node; tests should be shaped around extracted helper modules where possible.

## Out of Scope

- The old `OpenRouter Chat Model (Custom)` AI-root supplier node.
- n8n AI graph or LangChain model supplier compatibility.
- Streaming responses.
- Tool/function calling.
- Multimodal image/audio input or output.
- `openrouter/auto`.
- Generic extra request body JSON override.
- User-defined local reusable presets stored inside the node or credentials.
- Public marketplace approval polish beyond strict build, lint, type, and credential-security hygiene.
- Automatic retries for HTTP/network/OpenRouter errors.
- Output parser compatibility wrappers from the old AI node path.
- A schema-builder UI.
- Mirroring metadata into custom headers.
- Exposing the OpenRouter `user` field.
- Including exact request bodies in normal output or raw response output.

## Further Notes

- This PRD assumes OpenRouter chat completions remain the normalized text-generation endpoint for the internal use cases.
- OpenRouter docs should be checked during implementation for current request fields, model variant behavior, reasoning field names, web plugin shape, response healing shape, and any JSON Schema dialect requirements.
- The root `AGENTS.md` references `RTK.md`, but that file was not present in this checkout during PRD creation.
- The previous briefing references old source paths that are not present in this checkout; this repo currently appears to be scaffolded with an `Example` node and package metadata pointing to that example.
- Because no GitHub remote or `docs/agents` issue-tracker configuration was available, this PRD was published locally as markdown with a `needs-triage` label marker.
