# Deduplicate OpenRouter Model Catalog loading

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

After the Structured Output seam is stable, deduplicate OpenRouter Model Catalog loading behind a focused module or adapter. Model search and model options should share one implementation while preserving the existing Node Parameter Surface behavior and avoiding a broad OpenRouter transport abstraction.

## Acceptance criteria

- [ ] OpenRouter Model Catalog loading has one shared implementation for model search and model option generation.
- [ ] Existing model selector behavior, labels, values, filtering, and fallback behavior remain unchanged unless already covered by existing tests as intentionally different.
- [ ] The extraction does not introduce a broad OpenRouter transport abstraction beyond what this slice needs.
- [ ] Focused tests or updated regression tests cover the shared catalog behavior.
- [ ] Package wiring and n8n node loading remain unchanged.
- [ ] Build and test scripts pass.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/04-lock-compatibility-for-json-object-and-json-schema-behavior.md
