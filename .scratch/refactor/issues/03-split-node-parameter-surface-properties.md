# Split Node Parameter Surface Properties

Status: done

## Goal

Split the large declarative Node Parameter Surface file into focused user-facing property section modules without changing the parameter surface.

## Files

- `nodes/OpenrouterLlm/OpenRouterNodeProperties.ts`
- New directory: `nodes/OpenrouterLlm/properties/`
- Tests under `tests/`

## Problem

`OpenRouterNodeProperties.ts` is the largest source file. It is mostly declarative data, so it is less risky than a large behavior module, but editing one Node Parameter Surface section requires navigating unrelated sections.

## Scope

Create focused property modules under `nodes/OpenrouterLlm/properties/`, such as:

- `modelProperties.ts`
- `promptProperties.ts`
- `generationProperties.ts`
- `integrationProperties.ts`
- `providerRoutingProperties.ts`
- `structuredOutputProperties.ts`
- `structuredOutputRepairProperties.ts`

Keep `OpenRouterNodeProperties.ts` as the composition module that exports `nodeParameterSurface`.

Preserve exact property objects unless an import path must change.

## Acceptance Criteria

- The top-level `nodeParameterSurface` order is unchanged.
- Property names, defaults, descriptions, `displayOptions`, `typeOptions`, and load/search method names are unchanged.
- `OpenRouterNodeProperties.ts` only composes and exports property arrays.
- No runtime behavior changes.

## Test Plan

- Run `npm test`.
- Keep the existing property order test passing.
- Add or preserve assertions for key defaults.
- Add or preserve assertions that Structured Output and Structured Output Repair fields are still gated by `outputMode`.
- Add or preserve assertions that model locator load/search method names are unchanged.

## Out Of Scope

- Do not rename Node Parameter Surface fields.
- Do not change n8n UX copy in this ticket.
- Do not move non-property modules in this ticket.
