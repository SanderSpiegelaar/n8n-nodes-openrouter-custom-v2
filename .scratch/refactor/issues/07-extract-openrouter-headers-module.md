# Extract OpenRouter Headers Module

Status: done

## Goal

Move request header rules into a focused module if header behavior is still present in the n8n adapter module after earlier cleanup.

## Files

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- New: `nodes/OpenrouterLlm/OpenRouterHeaders.ts`
- Tests under `tests/`

## Problem

Header behavior is currently small, but it owns Langfuse trace inclusion and protected custom header validation. If this behavior remains in the n8n adapter module, it is a likely future growth point for attribution, tracing, and request metadata rules.

## Scope

Move header construction and validation into `OpenRouterHeaders.ts`:

- Langfuse trace header inclusion
- custom header extraction
- protected header validation

Keep headers byte-identical across initial OpenRouter chat-completion requests and Structured Output Repair requests.

## Acceptance Criteria

- The n8n adapter module delegates header construction to `OpenRouterHeaders.ts`.
- Protected headers are still rejected before any HTTP request is made.
- Langfuse trace behavior is unchanged.
- Custom headers are preserved across Structured Output Repair requests.

## Test Plan

- Run `npm test`.
- Keep or add tests for Langfuse trace default-on behavior.
- Keep or add tests for disabling Langfuse trace.
- Keep or add tests for protected custom header rejection.
- Keep or add tests for custom headers staying byte-identical across repair requests.

## Out Of Scope

- Do not change credential attribution behavior.
- Do not add new header features.
- Skip this ticket if ticket 02 leaves header behavior clearer in place and no new header work is planned.
