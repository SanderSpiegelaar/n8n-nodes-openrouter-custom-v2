# Group Node Parameter Surface declarations by behavior

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Reorganize Node Parameter Surface declarations by behavior so the n8n node reads more like an adapter. The declarations should be grouped around OpenRouter Execution, Structured Output, Structured Output Repair, and OpenRouter Model Catalog concerns without changing public fields or workflow compatibility.

## Acceptance criteria

- [ ] Node Parameter Surface declarations are grouped by behavior with clear locality for OpenRouter Execution, Structured Output, Structured Output Repair, and OpenRouter Model Catalog settings.
- [ ] Public parameter names, defaults, display behavior, and options remain compatible with existing workflows.
- [ ] Structured Output normalization remains the boundary between n8n parameter names and the Structured Output module.
- [ ] The n8n node module is easier to scan as an adapter rather than a mixed behavior module.
- [ ] Existing package wiring and n8n node description loading remain valid.
- [ ] Build and test scripts pass.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/04-lock-compatibility-for-json-object-and-json-schema-behavior.md

## Comments

- 2026-05-11: Grouped the Openrouter LLM node parameter surface into behavior-local arrays for OpenRouter Model Catalog, OpenRouter Execution, Structured Output, and Structured Output Repair, then composed the node description from those groups. Added a workflow-compatible top-level parameter-surface regression test. `npm test` and `npm run lint` pass.
