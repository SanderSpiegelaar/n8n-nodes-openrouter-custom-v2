Status: ready-for-agent

# PRD: OpenRouter Execution Boundary

## Problem Statement

The OpenRouter LLM node still concentrates too much runtime behavior inside the n8n adapter module. The current adapter module owns n8n node description and parameter reads, but also coordinates OpenRouter request-body construction, chat-completion sending, Structured Output handoff, Structured Output Repair wiring, response reasoning cleanup, workflow output shaping, diagnostics, and error conversion.

This makes the codebase slower and less accurate for humans, LLMs, and AI coding agents to navigate. A maintainer who wants to change the OpenRouter Execution path must read a large mixed-concern module, and focused behavior tests are hard because much of the runtime logic is private and coupled to mocked n8n execution functions.

## Solution

Split OpenRouter Execution behind a deep runtime orchestration module while preserving all workflow-visible behavior. The n8n adapter module remains responsible for node description composition, Node Parameter Surface reads, parameter validation, parameter normalization, credentials, base URL handling, headers, n8n HTTP helper usage, Continue On Fail behavior, n8n error creation, and final n8n item wrapping.

The new OpenRouter Execution module owns runtime orchestration from normalized input: building the initial OpenRouter chat-completion request body, invoking one OpenRouter chat sender callback, bypassing Structured Output in text mode, handing JSON Object and JSON Schema responses to Structured Output, wiring Structured Output Repair through the same chat sender callback, applying reasoning-field exclusion to the final response, and returning workflow-ready success data or Structured Output validation failure data.

The refactor is strictly architecture-only. It must not change parameter names, defaults, display behavior, OpenRouter request body behavior, output JSON shape, repair metadata shape, credential/base URL behavior, Continue On Fail behavior, or workflow-visible error behavior.

## User Stories

1. As a node maintainer, I want OpenRouter Execution behind a small runtime orchestration interface, so that I can reason about request sending and Structured Output handoff without reading the whole n8n adapter module.
2. As a node maintainer, I want the n8n adapter module to own n8n-specific concerns only, so that framework behavior stays localized.
3. As a node maintainer, I want Node Parameter Surface reads isolated before OpenRouter Execution runs, so that behavior modules can be tested without mocked n8n parameter access.
4. As a node maintainer, I want normalized input to cross the adapter/execution boundary, so that OpenRouter Execution does not depend on n8n parameter group names.
5. As a node maintainer, I want OpenRouter Execution to build the initial request body from normalized input, so that request behavior has a focused home.
6. As a node maintainer, I want OpenRouter Execution to use one OpenRouter chat sender callback, so that initial and repair chat-completion calls share a simple transport seam.
7. As a node maintainer, I want the OpenRouter chat sender callback to hide credentials, base URL handling, headers, and n8n HTTP helper usage, so that execution tests can use a fake sender.
8. As a node maintainer, I want actual OpenRouter API or transport failures to bubble from the sender, so that existing n8n API-error wrapping remains adapter-owned.
9. As a node maintainer, I want Structured Output validation failures returned as data, so that the adapter can preserve current Continue On Fail and n8n error behavior.
10. As a workflow builder, I want existing text mode behavior preserved, so that text responses still bypass Structured Output and return `structured: null`.
11. As a workflow builder, I want existing JSON Object behavior preserved, so that valid object responses and invalid non-object responses behave the same after the split.
12. As a workflow builder, I want existing JSON Schema behavior preserved, so that schema validation and response-format behavior do not change.
13. As a workflow builder, I want Structured Output Repair behavior preserved, so that invalid Structured Output can still be repaired using the current repair defaults and prompt behavior.
14. As a workflow builder, I want successful repaired output text preserved exactly, so that repaired successes still use the current stringified structured value behavior.
15. As a workflow builder, I want `structuredOutputRepair` output metadata to appear only when repair was used, so that existing workflows do not receive new fields.
16. As a workflow builder, I want Continue On Fail diagnostics preserved, so that invalid Structured Output remains inspectable in workflow output.
17. As a node maintainer, I want reasoning-field exclusion to live in OpenRouter Execution, so that response post-processing stays in the runtime path.
18. As a workflow builder, I want reasoning-field exclusion to delete both `reasoning` and `reasoning_content` exactly as before, so that output compatibility is preserved.
19. As a node maintainer, I want model routing represented as primary model plus fallback models, so that normalized input uses domain language rather than raw UI or API payload language.
20. As a node maintainer, I want sampling options represented as an omitted-unset behavior cluster, so that request-body construction is explicit and avoids empty fields.
21. As a node maintainer, I want integrations split into metadata, plugins, session, and sender/header concerns, so that the normalized execution input is not a vague integrations bag.
22. As a node maintainer, I want metadata represented as a metadata context, so that per-attempt metadata can preserve `validation_attempt` while avoiding n8n parameter reads.
23. As a node maintainer, I want metadata extras parsed and validated in the adapter, so that OpenRouter Execution receives `Record<string, unknown>` values instead of raw parameter rows.
24. As a node maintainer, I want provider routing and plugin objects prebuilt by adapter normalization, so that OpenRouter Execution only attaches validated OpenRouter extension objects.
25. As a node maintainer, I want JSON Schema parsing and AJV compilation to remain adapter-normalized for this slice, so that Structured Output receives plain configuration.
26. As a node maintainer, I want repair settings normalized before OpenRouter Execution, so that repair defaults and model resolution do not depend on n8n parameter access in the core module.
27. As a node maintainer, I want OpenRouter Execution to inject the repair sender from the shared chat sender, so that adapter-created Structured Output config does not contain transport callbacks.
28. As a node maintainer, I want focused OpenRouter Execution tests in a separate test file, so that the giant existing test file stops accumulating unrelated coverage.
29. As a node maintainer, I want behavior-seam tests rather than private-helper tests, so that internal functions can keep changing without test churn.
30. As a node maintainer, I want a fake chat sender that captures request bodies and returns queued responses, so that initial and repair calls can be tested deterministically.
31. As a node maintainer, I want request compatibility asserted with focused field checks, so that tests guard important behavior without brittle snapshots.
32. As a node maintainer, I want existing execution-level tests retained during the first slice, so that public n8n behavior remains protected while focused tests are added.
33. As a future contributor, I want this boundary recorded in domain language and an ADR, so that the n8n adapter module does not slowly absorb runtime behavior again.
34. As an AI coding agent, I want cohesive modules with small public interfaces, so that I can modify one behavior without scanning unrelated n8n node configuration.
35. As a human reviewer, I want architecture-only changes verified by baseline and post-change test/lint gates, so that regressions are easier to diagnose.
36. As a maintainer, I want no package script changes for this slice, so that the existing build-and-test workflow remains stable.
37. As a maintainer, I want old giant-file coverage duplicated before deletion or movement, so that test splitting can happen safely later.
38. As a maintainer, I want Node Parameter Surface declarations to stay in the adapter during the first execution split, so that UI compatibility is not mixed with runtime extraction.
39. As a maintainer, I want strict project-owned types at the new seam, so that the boundary is useful to TypeScript, humans, and agents.
40. As a maintainer, I want n8n `IDataObject` kept at boundaries where possible, so that core module contracts are not unnecessarily coupled to n8n framework types.

## Implementation Decisions

- Respect the accepted ADR: OpenRouter Execution is split from the n8n adapter module.
- The n8n adapter module owns node description composition, Node Parameter Surface reads, parameter validation, parameter normalization, credentials, base URL handling, headers, n8n HTTP helper usage, Continue On Fail behavior, n8n error creation, and final n8n item wrapping.
- OpenRouter Execution owns request-body construction from normalized input, OpenRouter chat sender callback invocation, Structured Output handoff, reasoning response post-processing, and workflow-ready success/failure data.
- The refactor is strictly architecture-only and must preserve workflow-visible behavior.
- The first new behavior module is named `OpenRouterExecution` and uses the existing PascalCase module naming style.
- New modules stay flat in the OpenRouter node module directory for this slice.
- `OpenRouterExecution` receives plain normalized input and must not call `getNodeParameter`, read credentials, call n8n HTTP helpers, construct n8n item data, inspect Continue On Fail, or throw n8n framework errors.
- Parameter reads remain in the adapter module for the first slice. A dedicated normalizer file can be considered later, but is not part of this PRD.
- The top-level normalized input is grouped by behavior clusters rather than by current UI parameter groups or raw OpenRouter request-body shape.
- Normalized model routing is represented as primary model plus fallback models. Execution emits the compatible OpenRouter `model` or `models` body shape.
- Normalized sampling options are grouped under `sampling` and omit unset fields.
- The current broad integrations group is normalized into separate concerns: metadata context, plugins, session ID, and sender/header concerns.
- Headers are not part of OpenRouter Execution input. The OpenRouter chat sender callback closes over credentials, base URL, and headers.
- The item index is not a top-level execution concept. It appears only inside metadata context defaults.
- Metadata context uses nested defaults plus extras. Defaults include the current workflow, execution, node, item, and model metadata needed to preserve existing request metadata. Extras are already validated and parsed by the adapter.
- Metadata extras use `Record<string, unknown>` after adapter validation/parsing.
- Execution derives final per-attempt metadata, including the existing `validation_attempt` key, for initial and repair requests.
- `validation_attempt` is preserved exactly as current behavior, even though domain language distinguishes Structured Output Repair counts from validation attempts.
- Provider routing is validated and prebuilt by adapter normalization. Execution attaches the provider object only when present.
- Plugin objects are validated and prebuilt by adapter normalization. Execution attaches the plugins array only when non-empty.
- Provider and plugin objects use generic project-owned record types rather than n8n `IDataObject` in the core contract.
- Stop sequences are represented as `string | string[]` and included only when set.
- Transforms are represented as `string[]` and included only when non-empty.
- Reasoning input is represented as request fields plus an `excludeFromResponse` flag. Execution attaches request reasoning to the request body and applies response cleanup from the flag.
- Reasoning exclusion deletes both `reasoning` and `reasoning_content` from each final choice message, preserving current behavior.
- Structured Output response-format behavior is represented through a cohesive Structured Output execution config. Execution builds the OpenRouter `response_format` from the Structured Output mode and compiled schema response format.
- Text mode bypasses the Structured Output module and returns `structured: null` after the initial response.
- JSON Object and JSON Schema modes invoke Structured Output after the initial response.
- Adapter-created Structured Output execution config does not include `repair.send`; OpenRouter Execution injects repair sending from the shared OpenRouter chat sender callback.
- The execution-specific Structured Output config type is named `StructuredOutputExecutionConfig`.
- The OpenRouter chat sender callback returns both final response and extracted text.
- The chat sender extracts `choices[0].message.content`, centralizing OpenRouter response-text extraction.
- Chat-completion response typing should model the minimal known response shape plus extra unknown fields, not the entire OpenRouter API response.
- Request body typing should use strict known core fields plus an index signature for additional OpenRouter-compatible fields.
- `ChatMessage` is exported from the OpenRouter Execution module as part of the execution input contract.
- Successful OpenRouter Execution returns workflow-ready plain data matching current output fields, but does not wrap it as n8n item data.
- The result type is named `OpenRouterExecutionResult` and is discriminated.
- Structured Output failures include a `kind: structured_output` discriminator so the adapter can map them explicitly.
- API or transport failures from the chat sender bubble to the adapter. They are not converted into OpenRouter Execution failure data in this slice.
- Structured Output validation failures are returned as data. The adapter translates them to current NodeOperationError behavior or Continue On Fail item JSON behavior.
- Repaired success output text remains the stringified structured value when repair was used.
- `structuredOutputRepair` appears in success output only when repair attempts were used.
- The adapter continues to build Continue On Fail diagnostic fields from Structured Output failure data.
- Positive-number and range validation errors remain adapter-owned so current n8n error behavior and messages can be preserved.
- OpenRouter Execution may keep minimal defensive assertions for normalized invariants, but must not duplicate all adapter validation.
- Existing Node Parameter Surface declarations stay in the adapter module during the first implementation wave.
- Existing package wiring and credentials stay unchanged.
- `deepen.md` should be updated to replace stale architecture notes with this current plan.

## Testing Decisions

- Good tests assert externally observable behavior through public module seams or n8n execution output; they do not assert private helper structure.
- Add focused OpenRouter Execution behavior tests in a new test file rather than adding to the giant existing test file.
- New tests import built JavaScript from `dist`, matching the current project pattern where `npm test` builds first.
- No package script changes are required because the current test script already runs multiple `tests/*.test.js` files.
- Use a fake OpenRouter chat sender that captures each request body in an array and returns queued responses.
- Mandatory first-slice OpenRouter Execution tests cover text success, JSON Object success, Structured Output Repair success, Structured Output failure, reasoning exclusion, and request body compatibility.
- Request body compatibility should be asserted with focused field assertions rather than full snapshots.
- Tests should target the OpenRouter Execution public seam, not exported private helpers.
- Do not temporarily export moved helpers from the n8n adapter module for tests.
- Existing execution-level tests remain in place during the first slice as public workflow regression coverage.
- Duplicate new focused coverage before deleting or moving equivalent old giant-file coverage.
- Long-term test grouping should be by behavior seam: OpenRouter Execution, Structured Output, OpenRouter Model Catalog, Node Parameter Surface, and credentials/package smoke.
- Baseline `npm test` and `npm run lint` should run before implementation begins.
- After each implementation slice, run `npm test` and `npm run lint`.
- Prior art exists in the current execution-level tests for mocked n8n execution contexts, captured OpenRouter request bodies, Structured Output validation, Structured Output Repair success/failure, Continue On Fail diagnostics, routing, credentials, and package wiring.

## Out of Scope

- Changing any workflow-visible behavior.
- Changing parameter names, defaults, display options, option values, or Node Parameter Surface behavior.
- Moving Node Parameter Surface declarations out of the n8n adapter module in the first implementation wave.
- Changing credentials, authentication, base URL behavior, protected header behavior, or package wiring.
- Changing OpenRouter Model Catalog behavior.
- Changing Structured Output parsing, validation, wrapper unwrapping, error formatting, or repair semantics except as needed to wire the existing behavior through the new execution boundary.
- Changing repair defaults, repair prompt behavior, repair metadata shape, or max repair-attempt semantics.
- Replacing n8n execution-level tests.
- Moving/deleting old giant-file tests before equivalent focused coverage exists.
- Introducing a broad OpenRouter transport abstraction beyond the OpenRouter chat sender callback.
- Creating subfolder-based module layout or moving behavior modules into a shared `src` directory.
- Adding targeted npm scripts or changing the test runner setup.
- Publishing a package release or changing package version metadata.

## Further Notes

This PRD supersedes the stale parts of the earlier deepening notes for the OpenRouter Execution path. The previous Structured Output deepening work remains valuable and should be treated as an existing dependency, not redone.

The core deletion test is: deleting OpenRouter Execution should require request-body construction, initial chat sending, Structured Output handoff, repair sender wiring, reasoning response cleanup, and workflow-ready result shaping to reappear somewhere else. Deleting the n8n adapter module should not delete the core OpenRouter Execution behavior tests.

The first implementation should be a tracer bullet through the new OpenRouter Execution seam with strict compatibility checks. Broader cleanup, including moving property declarations and splitting existing tests by behavior seam, should follow only after the OpenRouter Execution boundary is stable.
