# Reduce OpenRouter Node Execute Complexity

Status: done

## Goal

Reduce the cognitive complexity of the n8n adapter module's `execute` method while preserving the same adapter responsibilities and workflow-visible behavior.

## Files

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- Tests under `tests/`

## Problem

`execute` handles item iteration, credentials, base URL normalization, model routing, provider routing, input construction, OpenRouter chat sender callback creation, Structured Output failure translation, Continue On Fail output, and n8n error remapping in one function.

The module is no longer huge, but this function still mixes multiple adapter-level responsibilities.

## Scope

Extract small private helpers, preferably in `OpenrouterLlm.node.ts` first:

- `executeItem`
- `createOpenRouterChatSender`
- `toN8nOutputItem`
- `toContinueOnFailOutputItem`
- `rethrowAsN8nError`

Use the deletion test before adding any new exported module. If deleting a helper would only inline one obvious expression, keep it inline.

## Acceptance Criteria

- `execute` is primarily an input-item loop plus high-level error handling.
- The n8n adapter module still owns credentials, n8n HTTP helper usage, Continue On Fail behavior, and final workflow output shaping.
- No new speculative external seam is introduced.
- Request count, request options, headers, output data, and error behavior remain unchanged.

## Test Plan

- Run `npm test`.
- Existing tests must still cover one request per item.
- Existing tests must still cover base URL and request option construction.
- Existing tests must still cover `pairedItem` preservation.
- Existing tests must still cover Continue On Fail item output.
- Existing tests must still cover `NodeOperationError` and `NodeApiError` remapping.
- Existing tests must still cover Structured Output failure handling.

## Out Of Scope

- Do not extract `OpenRouterHeaders` here unless it is necessary to keep `execute` readable.
- Do not change `OpenRouterExecution` or Structured Output semantics.
- Do not split tests in this ticket.
