Status: done

# Move reasoning response cleanup into OpenRouter Execution

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Move reasoning-field exclusion into OpenRouter Execution so response post-processing stays in the runtime path. When the normalized reasoning input requests exclusion, OpenRouter Execution must delete both `reasoning` and `reasoning_content` from each final choice message exactly as before.

This slice must preserve request reasoning fields and all workflow-visible output compatibility.

## Acceptance criteria

- [ ] Reasoning request fields are still attached to the OpenRouter request body when configured.
- [ ] Reasoning exclusion is represented by an `excludeFromResponse` flag in normalized input.
- [ ] OpenRouter Execution deletes both `reasoning` and `reasoning_content` from each final choice message when exclusion is enabled.
- [ ] Reasoning cleanup applies to final responses without changing unrelated response fields.
- [ ] Focused tests cover reasoning exclusion through the public OpenRouter Execution seam.
- [ ] Existing execution-level tests remain in place.
- [ ] `npm test` and `npm run lint` pass.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/02-introduce-openrouter-execution-public-seam-for-text-mode.md
