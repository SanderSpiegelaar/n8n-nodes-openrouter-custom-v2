# Extract Shared OpenRouter Test Context

Status: ready-for-agent

## Goal

Concentrate fake n8n execution context setup in one test helper so adapter and execution-boundary tests share the same assumptions.

## Files

- `tests/openrouter-llm.test.js`
- `tests/openrouter-execution-boundary.test.js`
- New: `tests/helpers/openrouter-test-context.js`

## Problem

Several tests create similar fake n8n execution contexts, request captures, and default OpenRouter responses independently. Duplication analysis identified repeated setup across the adapter and execution-boundary tests.

## Scope

Extract only stable test harness behavior:

- fake execution context creation
- request capture
- default OpenRouter chat-completion response creation
- optional common request assertions if they reduce repeated noise

Keep test-specific assertions in the tests themselves.

## Acceptance Criteria

- Adapter and execution-boundary tests use the shared helper for fake n8n context setup.
- The helper remains small and explicit.
- Individual tests still show the behavior they are proving.
- No production code changes are required.

## Test Plan

- Run `npm test`.
- Confirm tests still assert request method, base URL, URL, body, output data, and Continue On Fail behavior where relevant.
- Confirm no behavior assertions are removed during extraction.

## Out Of Scope

- Do not split `openrouter-llm.test.js` in this ticket.
- Do not hide domain-specific assertions behind overly generic helper names.
- Do not change production modules.
