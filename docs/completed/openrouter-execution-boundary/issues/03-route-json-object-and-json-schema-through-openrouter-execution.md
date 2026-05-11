Status: done

# Route JSON Object and JSON Schema through OpenRouter Execution

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Extend OpenRouter Execution so JSON Object and JSON Schema modes invoke Structured Output after the initial OpenRouter response. Structured Output validation failures should be returned as discriminated data so the n8n adapter can preserve current Continue On Fail and n8n error behavior.

JSON Schema parsing and AJV compilation remain adapter-normalized in this slice; OpenRouter Execution receives plain Structured Output execution configuration.

## Acceptance criteria

- [x] OpenRouter Execution invokes Structured Output for JSON Object mode and preserves valid object and invalid non-object behavior.
- [x] OpenRouter Execution invokes Structured Output for JSON Schema mode and preserves schema validation and response-format behavior.
- [x] Structured Output failures are returned as data with a `kind: structured_output` discriminator.
- [x] API or transport failures from the OpenRouter chat sender callback still bubble to the n8n adapter.
- [x] The n8n adapter still maps Structured Output failures to the existing NodeOperationError behavior or Continue On Fail item JSON behavior.
- [x] Focused tests cover JSON Object success and Structured Output failure through the public OpenRouter Execution seam.
- [x] Existing execution-level tests remain in place.
- [x] `npm test` and `npm run lint` pass.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/02-introduce-openrouter-execution-public-seam-for-text-mode.md
