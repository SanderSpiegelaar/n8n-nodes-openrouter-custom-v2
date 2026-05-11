Status: done

# Document the settled OpenRouter Execution boundary

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Update the project architecture notes so they describe the settled OpenRouter Execution boundary in the domain language from `CONTEXT.md` and the accepted ADR. Replace stale OpenRouter Execution path notes with the current ownership split so future maintainers and AI coding agents do not move runtime behavior back into the n8n adapter module.

## Acceptance criteria

- [x] Stale architecture notes about the OpenRouter Execution path are replaced with the current boundary.
- [x] Documentation uses the glossary terms `OpenRouter Execution`, `Structured Output`, `Structured Output Repair`, `Node Parameter Surface`, `n8n adapter module`, and `OpenRouter chat sender callback` consistently.
- [x] The documentation states what the n8n adapter owns and what OpenRouter Execution owns.
- [x] The documentation notes that the split is architecture-only and preserves workflow-visible behavior.
- [x] The documentation does not contradict `docs/adr/0001-openrouter-execution-boundary.md`.
- [x] `npm test` and `npm run lint` pass if documentation changes affect checked files, or are noted as not applicable for docs-only changes.

## Implementation notes

- Replaced stale OpenRouter Execution path notes in `docs/completed/structured-output-architecture-deepening/PRD.md` with the settled ownership split from `CONTEXT.md` and ADR-0001.
- Updated the completed Structured Output issue notes that still described a repair-only sender seam so they use the current `OpenRouter chat sender callback` term.
- Verification: docs-only changes; `npm test` and `npm run lint` not run because no checked code changed.

## Blocked by

- .scratch/openrouter-execution-boundary/issues/06-keep-adapter-owned-n8n-behavior-at-the-boundary.md
