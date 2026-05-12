# Restructure OpenRouter Node Folders

Status: ready-for-agent

## Goal

Move stabilized OpenRouter LLM modules into domain-oriented folders to improve navigation after the main seams have settled.

## Files

- `nodes/OpenrouterLlm/*`
- Imports in affected source files
- Tests under `tests/`

## Problem

All OpenRouter LLM modules currently live flat under `nodes/OpenrouterLlm/`. This is acceptable while the module set is small, but after Structured Output adapter, property, and input-builder splits, the flat folder will become harder for humans and AI agents to navigate.

## Scope

After tickets 01 through 07 are complete or intentionally skipped, move modules into folders such as:

```text
nodes/OpenrouterLlm/
  OpenrouterLlm.node.ts
  catalog/
  execution/
  input/
  properties/
  routing/
  structured-output/
```

Preserve the package entry point at `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` so `package.json` does not need to change.

## Acceptance Criteria

- Modules are grouped by domain concept using project vocabulary.
- Import paths are updated and build successfully.
- `package.json` still points to `dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js`.
- No behavior changes are made during folder moves.

## Test Plan

- Run `npm test`.
- Run `npm run lint`.
- Confirm package wiring tests still pass.
- Confirm all node, credential, and helper imports resolve after build.

## Out Of Scope

- Do not combine this with behavior refactors.
- Do not rename the n8n node file or package entry point.
- Do not move credentials in this ticket.
