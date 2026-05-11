Status: implemented

# Baseline guardrails for OpenRouter Execution split

## Parent

.scratch/openrouter-execution-boundary/PRD.md

## What to build

Establish regression guardrails before splitting OpenRouter Execution from the n8n adapter module. Capture the current baseline test and lint state, then add focused public-seam coverage that protects the existing OpenRouter Execution behavior before runtime logic is extracted from the adapter.

This slice should not change workflow-visible behavior or package scripts.

## Acceptance criteria

- [ ] Baseline `npm test` and `npm run lint` have been run and their results are recorded in the issue comments or implementation notes.
- [ ] Focused tests are added in a separate test file that follows the existing pattern of importing built JavaScript from `dist`.
- [ ] The new tests use behavior-seam assertions and avoid testing private adapter helpers.
- [ ] Request compatibility is asserted with focused field checks rather than broad snapshots.
- [ ] Existing execution-level tests remain in place.
- [ ] No package script changes are introduced.
- [ ] Post-change `npm test` and `npm run lint` pass, or any pre-existing failures are clearly identified.

## Blocked by

None - can start immediately

## Comments

### Implementation notes - 2026-05-11

- Baseline `npm test` was run before changes. Result: failed with 73 passing / 1 failing test. The pre-existing failure is `tests/openrouter-llm.test.js` > `Openrouter LLM keeps the workflow-compatible top-level parameter surface`, where the current built node default model is `openai/gpt-oss-120b` but the existing test expects `openai/gpt-4o-mini`.
- Baseline `npm run lint` was run before changes. Result: passed with exit code 0.
- Added focused public-seam request compatibility coverage in `tests/openrouter-execution-boundary.test.js`, importing the built node from `dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js`.
- New coverage asserts field-level request compatibility for the initial OpenRouter chat-completion request and Structured Output Repair request, avoiding broad snapshots and private adapter helpers.
- Post-change focused check `npm run build && node --test tests/openrouter-execution-boundary.test.js` passed with 2 passing tests.
- Post-change `npm test` was run. Result: failed with 75 passing / 1 failing test; the only failure remains the same pre-existing default-model mismatch in `tests/openrouter-llm.test.js`.
- Post-change `npm run lint` passed with exit code 0.
