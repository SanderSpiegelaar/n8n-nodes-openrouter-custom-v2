Status: implemented

# Introduce OpenRouter Execution public seam for text mode

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Introduce the `OpenRouterExecution` module and route the narrow text-mode success path through it. The module receives strict normalized input, builds the compatible initial OpenRouter chat-completion request body, calls one OpenRouter chat sender callback, and returns workflow-ready success data with `structured: null` for text mode.

The n8n adapter must continue to own Node Parameter Surface reads, parameter validation and normalization, credentials, base URL handling, headers, n8n HTTP helper usage, Continue On Fail behavior, n8n errors, and final n8n item wrapping.

## Acceptance criteria

- [ ] `OpenRouterExecution` exists as a flat module in the OpenRouter node module directory.
- [ ] The module exposes the public execution seam, including project-owned normalized input types and exported `ChatMessage`.
- [ ] The OpenRouter chat sender callback hides credentials, base URL handling, headers, and n8n HTTP helper usage from OpenRouter Execution.
- [ ] Text mode bypasses Structured Output and returns workflow-ready success data with `structured: null`.
- [ ] Normalized model routing supports primary model plus fallback models and emits the compatible OpenRouter `model` or `models` request shape.
- [ ] Sampling options omit unset fields from the request body.
- [ ] Provider routing and plugin objects are attached only when already normalized and present.
- [ ] Focused tests cover text success and request-body compatibility through the public OpenRouter Execution seam.
- [ ] Existing n8n workflow-visible behavior remains unchanged.
- [ ] `npm test` and `npm run lint` pass.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/01-baseline-guardrails-for-openrouter-execution-split.md

## Comments

### Implementation notes - 2026-05-11

- Added flat `nodes/OpenrouterLlm/OpenRouterExecution.ts` module with exported `ChatMessage`, normalized text-mode execution input, chat sender callback seam, request-body construction, and `OpenRouterExecutionResult` success data.
- Routed adapter text mode through `executeOpenRouter`; credentials, base URL, headers, n8n HTTP helper usage, Continue On Fail, n8n item wrapping, and validation/normalization stay adapter-owned.
- Added focused public-seam coverage for text success and request-body compatibility in `tests/openrouter-execution-boundary.test.js`.
- Verified `npm test` passes: 77 passing / 0 failing.
- Verified `npm run lint` exits successfully.
