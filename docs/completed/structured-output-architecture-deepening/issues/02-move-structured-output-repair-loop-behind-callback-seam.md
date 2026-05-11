# Move Structured Output Repair loop behind callback seam

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Move Structured Output Repair orchestration into the Structured Output module. After the initial response fails local validation, the module should render repair prompts, build repair request bodies, count repair calls after the initial response, call a supplied repair sender callback, validate repaired text, and return either repaired success data or exhausted-repair failure data.

## Acceptance criteria

- [x] Structured Output owns the Structured Output Repair loop after initial local validation fails.
- [x] Repair calls are sent through a callback supplied by the adapter; the module does not use credentials or n8n HTTP helpers directly.
- [x] Repair prompt rendering and required placeholder validation live inside the Structured Output module and remain fail-fast for invalid custom prompts.
- [x] Repair request body construction lives inside the Structured Output module and preserves existing repair model, temperature, reasoning effort, and JSON Object response format defaults.
- [x] Max Structured Output Repair attempts means repair calls after the initial response, not total validation attempts.
- [x] Successful repair returns final repaired text, structured value, final OpenRouter response object, and repair metadata.
- [x] Exhausted repair returns failure data with original raw text, latest repair text when present, validation errors, technical details, and repair metadata.
- [x] Tests use a fake repair sender that captures request bodies and can simulate successful repair, invalid repair, and exhausted attempts.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/01-structured-output-outcome-interface-tracer-bullet.md
