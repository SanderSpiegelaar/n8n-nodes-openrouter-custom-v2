Status: done

# Wire Structured Output Repair through shared chat sender

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Wire Structured Output Repair inside OpenRouter Execution through the same OpenRouter chat sender callback used for the initial request. Adapter-created Structured Output execution config should not contain transport callbacks; OpenRouter Execution injects repair sending from the shared sender.

Preserve current repair defaults, prompt behavior, metadata shape, successful repaired output text, and conditional `structuredOutputRepair` output metadata.

## Acceptance criteria

- [x] The execution-specific Structured Output config type is named `StructuredOutputExecutionConfig`.
- [x] Adapter-created Structured Output execution config does not include `repair.send`.
- [x] OpenRouter Execution injects Structured Output Repair sending from the shared OpenRouter chat sender callback.
- [x] Initial and repair requests both use the same fake sender pattern in focused tests.
- [x] Per-attempt metadata preserves the existing `validation_attempt` key and current repair metadata shape.
- [x] Repaired success output text remains the stringified structured value when repair was used.
- [x] `structuredOutputRepair` appears in success output only when repair attempts were used.
- [x] Focused tests cover Structured Output Repair success through the public OpenRouter Execution seam.
- [x] `npm test` and `npm run lint` pass.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/03-route-json-object-and-json-schema-through-openrouter-execution.md
