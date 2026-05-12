# Extract Structured Output Node Adapter

Status: done

## Goal

Move n8n-facing Structured Output adaptation out of the n8n adapter module without changing workflow-visible behavior.

## Files

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- `nodes/OpenrouterLlm/StructuredOutputParser.ts`
- New: `nodes/OpenrouterLlm/StructuredOutputNodeAdapter.ts`
- Tests under `tests/`

## Problem

The n8n adapter module still owns Structured Output schema parsing, OpenAI-style `json_schema` wrapper normalization, diagnostic formatting, truncation, and `NodeOperationError` shaping.

This weakens locality: Structured Output workflow-visible behavior is split between the n8n adapter module and `StructuredOutputParser.ts`.

## Scope

Move these functions from `OpenrouterLlm.node.ts` into `StructuredOutputNodeAdapter.ts`:

- `compileSchema`
- `normalizeJsonSchemaResponseFormat`
- `isOpenAiJsonSchemaWrapper`
- `buildStructuredOutputError`
- `getStructuredOutputDiagnosticFields`
- `truncateForError`

Keep `StructuredOutputParser.ts` pure and n8n-independent.

## Acceptance Criteria

- `OpenrouterLlm.node.ts` delegates Structured Output schema compilation and error/diagnostic shaping to `StructuredOutputNodeAdapter.ts`.
- Structured Output behavior is unchanged for JSON Object mode, JSON Schema mode, Structured Output Repair, and Continue On Fail.
- `StructuredOutputParser.ts` does not import from `n8n-workflow`.
- Existing public n8n node wiring remains unchanged.

## Test Plan

- Run `npm test`.
- Add or preserve tests covering raw JSON Schema compilation.
- Add or preserve tests covering OpenAI-style `{ name, strict, schema }` wrapper normalization.
- Add or preserve tests covering JSON Schema parse and compile failures as `NodeOperationError`.
- Add or preserve tests covering Continue On Fail diagnostic fields after Structured Output failure.
- Add or preserve tests covering truncation of long raw/repair text in thrown errors.

## Out Of Scope

- Do not change Structured Output validation semantics.
- Do not change repair request behavior.
- Do not reorganize folders in this ticket.
