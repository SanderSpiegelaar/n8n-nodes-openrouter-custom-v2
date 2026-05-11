# Lock compatibility for JSON Object and JSON Schema behavior

Status: ready-for-agent
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Add or update regression coverage proving the architecture deepening did not change workflow-visible Structured Output behavior. This slice should lock JSON Object mode, JSON Schema mode, provider-native response_format behavior, conservative wrapper unwrapping, repaired-success text consistency, and existing execution-level output contracts.

## Acceptance criteria

- [ ] JSON Object mode still requires a non-null, non-array object.
- [ ] JSON Schema mode still lets the schema decide the valid root type.
- [ ] Existing provider-native OpenRouter response_format behavior is preserved for initial requests.
- [ ] Conservative wrapper unwrapping behavior is preserved.
- [ ] Successful Structured Output Repair keeps returned text consistent with the repaired structured value.
- [ ] Tests assert externally observable outcomes through the Structured Output module interface or n8n execution output, not private helper calls.
- [ ] Any shallow private-helper tests made redundant by behavior coverage are deleted or rewritten against the public seam.
- [ ] Build and test scripts pass as the regression gate.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/03-wire-openrouter-execution-adapter-to-structured-output-outcomes.md

## Comments

- 2026-05-11: Added regression coverage for JSON Object root restrictions, JSON Schema root-type delegation, and repaired-success text consistency through the Structured Output public seam. Fixed repaired success outcomes to return `text` serialized from the validated structured value while preserving the raw repair response in repair metadata. `npm test` and `npm run lint` pass.
