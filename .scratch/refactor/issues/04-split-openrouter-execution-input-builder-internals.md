# Split OpenRouter Execution Input Builder Internals

Status: done

## Goal

Improve locality inside Node Parameter Surface normalization while keeping `buildOpenRouterExecutionInput` as the single caller-facing interface.

## Files

- `nodes/OpenrouterLlm/OpenRouterExecutionInputBuilder.ts`
- Possible new directory: `nodes/OpenrouterLlm/input/`
- Tests under `tests/`

## Problem

`OpenRouterExecutionInputBuilder.ts` is cohesive as a module, but its implementation contains separate concerns: messages, sampling, metadata, plugins, reasoning, and Structured Output Repair config.

Maintainers currently need to scan unrelated normalization behavior when changing one concern.

## Scope

Extract implementation modules by stable normalization concern, such as:

- `messageInput.ts`
- `samplingInput.ts`
- `metadataInput.ts`
- `pluginInput.ts`
- `reasoningInput.ts`
- `structuredOutputInput.ts`

Keep `buildOpenRouterExecutionInput` as the deep module interface. Avoid exporting every small helper unless needed by tests or another module.

## Acceptance Criteria

- Callers still use `buildOpenRouterExecutionInput`.
- Message, sampling, metadata, plugin, reasoning, and Structured Output Repair normalization behavior is unchanged.
- `OpenRouterExecutionInputBuilder.ts` reads as a composition/orchestration module rather than a mixed implementation file.
- No new shallow pass-through modules are introduced.

## Test Plan

- Run `npm test`.
- Expand or preserve `tests/openrouter-execution-input-builder.test.js` coverage for prompt/message modes.
- Expand or preserve coverage for sampling validation.
- Expand or preserve coverage for metadata conflicts and JSON parsing.
- Expand or preserve coverage for plugin construction.
- Expand or preserve coverage for reasoning modes.
- Expand or preserve coverage for Structured Output Repair defaults and metadata callback.

## Out Of Scope

- Do not change the `OpenRouterExecutionInput` shape.
- Do not move `OpenRouterExecution.ts` in this ticket.
- Do not alter request-body construction semantics.
