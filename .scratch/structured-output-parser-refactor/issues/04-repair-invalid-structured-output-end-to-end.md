# Repair invalid structured output end-to-end

Status: needs-triage
Type: AFK

## What to build

Wire invalid structured output into separate OpenRouter repair calls. When local validation fails, the node should send the parsing instructions, failed completion, and validation error to the configured repair model, then return repaired structured data and compact repair metadata when repair succeeds.

## Acceptance criteria

- [ ] Invalid first-pass structured output can be repaired by a separate OpenRouter call.
- [ ] Repair calls always request JSON Object output.
- [ ] Max repair attempts is interpreted as the number of repair calls after the initial model response.
- [ ] Successful repair returns the repaired structured object to downstream nodes.
- [ ] Successful repaired output text matches the repaired JSON.
- [ ] Successful repair includes compact metadata showing that repair happened.
- [ ] Failed repair after all attempts produces useful final validation details.
- [ ] Execution-flow tests cover success-after-repair, max repair attempts, and failure-after-repairs.

## Blocked by

- .scratch/structured-output-parser-refactor/issues/02-surface-readable-validation-failures.md
- .scratch/structured-output-parser-refactor/issues/03-add-configurable-repair-settings-and-prompt-validation.md

## Comments
