# Update architecture language in CONTEXT.md

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Update the project architecture language after the Structured Output seam is wired. CONTEXT.md should reflect that Structured Output owns local JSON validation and Structured Output Repair orchestration, while OpenRouter Execution and the n8n adapter own initial request sending, credentials, Node Parameter Surface normalization, Continue On Fail behavior, and final workflow output shaping.

## Acceptance criteria

- [x] CONTEXT.md describes the stabilized Structured Output module responsibility without drifting from the existing glossary terms.
- [x] CONTEXT.md clarifies that Structured Output Repair requests happen inside one OpenRouter Execution and are counted after the initial response.
- [x] CONTEXT.md documents the OpenRouter chat sender callback seam at a glossary/relationship level, not as stale file-path implementation detail.
- [x] CONTEXT.md preserves the distinction between OpenRouter Execution, Structured Output, Structured Output Repair, Node Parameter Surface, and OpenRouter Model Catalog.
- [x] No ADR or domain documentation conflict is introduced.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/03-wire-openrouter-execution-adapter-to-structured-output-outcomes.md
