Status: done

# Keep adapter-owned n8n behavior at the boundary

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Refactor the n8n adapter module so it owns n8n-specific behavior only while delegating runtime orchestration to OpenRouter Execution. The adapter remains responsible for node description composition, Node Parameter Surface reads, parameter validation, parameter normalization, credentials, base URL handling, headers, n8n HTTP helper usage, Continue On Fail behavior, n8n error creation, and final n8n item wrapping.

OpenRouter Execution must not call `getNodeParameter`, read credentials, call n8n HTTP helpers, construct n8n item data, inspect Continue On Fail, or throw n8n framework errors.

## Acceptance criteria

- [ ] The n8n adapter delegates request-body construction, chat sender invocation, Structured Output handoff, Structured Output Repair wiring, reasoning cleanup, and workflow-ready result shaping to OpenRouter Execution.
- [ ] The n8n adapter still owns Node Parameter Surface reads, validation, normalization, credentials, base URL handling, headers, and n8n HTTP helper usage.
- [ ] Metadata extras are parsed and validated in the adapter before crossing the execution boundary as `Record<string, unknown>` values.
- [ ] Provider routing and plugin objects are prebuilt by adapter normalization before being passed to OpenRouter Execution.
- [ ] Continue On Fail diagnostics for invalid Structured Output remain workflow-compatible.
- [ ] API or transport failures from the sender are still converted by the adapter using existing n8n API-error behavior.
- [ ] OpenRouter Execution has no dependency on n8n parameter group names or framework-specific item wrapping.
- [ ] Existing public workflow tests continue to pass.
- [ ] `npm test` and `npm run lint` pass.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/03-route-json-object-and-json-schema-through-openrouter-execution.md
- .scratch/openrouter-execution-boundary/issues/04-wire-structured-output-repair-through-shared-chat-sender.md
- .scratch/openrouter-execution-boundary/issues/05-move-reasoning-response-cleanup-into-openrouter-execution.md
