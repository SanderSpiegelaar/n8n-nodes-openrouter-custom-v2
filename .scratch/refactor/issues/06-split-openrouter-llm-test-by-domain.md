# Split OpenRouter LLM Test By Domain

Status: done

## Goal

Split the monolithic adapter regression test into focused test files organized by domain concept.

## Files

- `tests/openrouter-llm.test.js`
- New test files under `tests/`
- `tests/helpers/openrouter-test-context.js`

## Problem

`tests/openrouter-llm.test.js` is roughly 2,000 lines and mixes package wiring, credentials, prompt modes, routing, metadata, headers, Structured Output, Structured Output Repair, plugins, and reasoning.

This makes review and navigation expensive for humans and AI agents.

## Scope

Split tests into focused files, such as:

- `openrouter-node-wiring.test.js`
- `openrouter-node-prompts.test.js`
- `openrouter-node-routing.test.js`
- `openrouter-node-headers-metadata.test.js`
- `openrouter-node-structured-output.test.js`
- `openrouter-node-plugins-reasoning.test.js`

Preserve assertions and test behavior. Use the shared test context helper from ticket 05.

## Acceptance Criteria

- `openrouter-llm.test.js` is reduced or removed as a monolithic catch-all file.
- Tests are grouped by domain concept using project vocabulary.
- No assertions are intentionally dropped.
- `npm test` discovers all split test files via `tests/*.test.js`.

## Test Plan

- Run `npm test`.
- Confirm package wiring and credential tests still run.
- Confirm prompt, routing, metadata/header, Structured Output, plugin, and reasoning tests still run.
- Confirm test count is not unexpectedly reduced.

## Out Of Scope

- Do not change production code.
- Do not rewrite assertions beyond what is needed for file movement and helper usage.
- Do not introduce snapshot tests unless there is already a clear reason.
