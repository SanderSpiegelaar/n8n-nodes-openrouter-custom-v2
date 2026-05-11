Status: ready-for-agent

# PRD: Structured Output Architecture Deepening

## Problem Statement

The OpenRouter LLM node has strong Structured Output behavior, but earlier architecture notes concentrated too much runtime behavior inside the n8n node implementation. The now-settled boundary separates the n8n-facing adapter from OpenRouter Execution so maintainers can change the highest-change runtime path without moving n8n framework behavior into the execution module.

This matters because maintainers must be able to reason about the OpenRouter Execution path without a mocked n8n runtime, while still preserving every workflow-visible behavior of the existing node.

## Solution

The settled split is architecture-only and preserves workflow-visible behavior.

The n8n adapter module owns n8n-facing behavior: node description composition, Node Parameter Surface declarations and reads, parameter validation and normalization, credentials, base URL handling, headers, n8n HTTP helper usage, Continue On Fail behavior, n8n error creation, and final workflow item wrapping.

OpenRouter Execution owns runtime orchestration from already-normalized input: OpenRouter request-body construction, OpenRouter chat sender callback invocation for the initial request and Structured Output Repair requests, Structured Output handoff, reasoning response post-processing, and workflow-ready success/failure data.

Structured Output owns local JSON extraction, wrapper unwrapping, validation, error formatting, Structured Output Repair orchestration, repair metadata, and diagnostic outcome data. The OpenRouter chat sender callback is the seam where OpenRouter Execution asks the n8n adapter module to send an OpenRouter chat-completion request while the adapter keeps credentials, base URL handling, headers, and n8n HTTP helper usage out of OpenRouter Execution.

From a maintainer's perspective, an OpenRouter Execution follows this boundary:

1. The n8n adapter module reads and normalizes the Node Parameter Surface.
2. The n8n adapter module supplies normalized input and an OpenRouter chat sender callback to OpenRouter Execution.
3. OpenRouter Execution builds the initial request body and invokes the OpenRouter chat sender callback once for the initial OpenRouter chat-completion request.
4. OpenRouter Execution hands Structured Output responses to Structured Output.
5. Structured Output validates locally and, when needed, performs Structured Output Repair through the callback wiring supplied by OpenRouter Execution.
6. OpenRouter Execution returns workflow-ready success or failure data.
7. The n8n adapter module translates that data into n8n output, Continue On Fail item data, or n8n error behavior.

## User Stories

1. As a node maintainer, I want Structured Output behavior behind one small interface, so that I can reason about parsing, validation, and repair without reading the whole node implementation.
2. As a node maintainer, I want Structured Output Repair to own its repair loop, so that repair-attempt semantics have one source of truth.
3. As a node maintainer, I want the n8n node to pass normalized config into Structured Output, so that Structured Output does not depend on n8n parameter names.
4. As a node maintainer, I want Structured Output to avoid calling n8n execution helpers, so that it can be tested without a mocked n8n runtime.
5. As a node maintainer, I want Structured Output to send repair requests through a callback adapter, so that credentials and HTTP authentication stay in the n8n adapter.
6. As a node maintainer, I want Structured Output failures returned as data, so that the n8n adapter can handle normal errors and Continue On Fail consistently.
7. As a node maintainer, I want OpenRouter Execution to own initial request-body construction and OpenRouter chat sender callback invocation, so that runtime orchestration remains outside the n8n adapter module.
8. As a node maintainer, I want Structured Output Repair to run only after the initial response fails local validation, so that repair remains distinct from the initial OpenRouter Execution request.
9. As a node maintainer, I want the OpenRouter chat sender callback to be the seam for true external OpenRouter behavior, so that tests can use a fake callback while production keeps n8n HTTP helper usage in the adapter.
10. As a node maintainer, I want the production n8n adapter module to use n8n HTTP helpers for every OpenRouter chat-completion request, including Structured Output Repair requests, so that existing credential behavior is preserved.
11. As a node maintainer, I want tests to use a fake OpenRouter chat sender callback, so that Structured Output Repair can be verified without real OpenRouter calls.
12. As a node maintainer, I want repair prompt rendering inside the Structured Output module, so that prompt placeholders and validation errors have locality.
13. As a node maintainer, I want repair request body construction inside the Structured Output module, so that repair model, temperature, reasoning effort, and response format are tested together.
14. As a node maintainer, I want Structured Output to return final repaired text, so that successful repair keeps text and structured values consistent.
15. As a node maintainer, I want Structured Output to return the final response object, so that OpenRouter response data remains available in workflow output.
16. As a node maintainer, I want Structured Output to return compact repair metadata, so that the n8n adapter does not reconstruct repair state.
17. As a node maintainer, I want Structured Output failures to include validation errors, so that users get actionable diagnostics.
18. As a node maintainer, I want Structured Output failures to include technical validation details, so that complex schema failures remain debuggable.
19. As a node maintainer, I want Structured Output failures to include original raw text, so that Continue On Fail output can show what the model first returned.
20. As a node maintainer, I want Structured Output failures to include latest repair text when repair happened, so that users can compare repair progress.
21. As a node maintainer, I want max Structured Output Repair attempts to mean repair calls after the initial response, so that the domain language stays unambiguous.
22. As a node maintainer, I want the n8n adapter to translate Structured Output failure data into NodeOperationError, so that current n8n error behavior is preserved.
23. As a workflow builder, I want Continue On Fail output to preserve Structured Output diagnostics, so that I can route or inspect invalid model output inside a workflow.
24. As a workflow builder, I want successful Structured Output Repair to remain visible in output metadata, so that I can monitor repair frequency.
25. As a workflow builder, I want JSON Object mode behavior to remain unchanged, so that existing workflows keep requiring a non-array JSON object.
26. As a workflow builder, I want JSON Schema mode behavior to remain unchanged, so that my schema decides the valid root type.
27. As a workflow builder, I want existing OpenRouter response_format behavior to remain unchanged, so that provider-native Structured Output is still requested first.
28. As a workflow builder, I want existing repair model defaults to remain unchanged, so that behavior does not shift during architecture refactoring.
29. As a workflow builder, I want existing repair temperature defaults to remain unchanged, so that repair calls remain deterministic by default.
30. As a workflow builder, I want existing repair reasoning effort defaults to remain unchanged, so that repair cost and behavior do not change unexpectedly.
31. As a workflow builder, I want custom repair prompt placeholder validation to remain fail-fast, so that misconfigured repair prompts do not spend tokens.
32. As a workflow builder, I want OpenRouter credentials and base URL behavior to remain unchanged, so that the architecture refactor does not require workflow migration.
33. As a node maintainer, I want OpenRouter Model Catalog behavior deduplicated after the Structured Output slice, so that model search and model options share one implementation.
34. As a node maintainer, I want Node Parameter Surface declarations grouped by behavior after the Structured Output slice, so that parameter changes have better locality.
35. As a node maintainer, I want OpenRouter request sending isolated behind the OpenRouter chat sender callback, so that OpenRouter Execution stays readable while credentials and n8n HTTP helper usage stay in the n8n adapter module.
36. As a node maintainer, I want existing execution-level tests to keep guarding public behavior, so that the refactor does not alter workflow-visible output.
37. As a node maintainer, I want new behavior tests at the Structured Output module interface, so that repair orchestration can change internally without rewriting tests.
38. As a node maintainer, I want tests to assert outcomes instead of private helper calls, so that the interface remains the test surface.
39. As a future contributor, I want the architecture language captured in CONTEXT.md, so that terms like Structured Output Repair and OpenRouter Execution stay consistent.
40. As a future contributor, I want the n8n node module to read like an adapter, so that AI and human maintainers can navigate the codebase quickly.

## Implementation Decisions

- Use **Structured Output** as the central deep module for local JSON extraction, wrapper unwrapping, validation, error formatting, repair prompt rendering, repair request construction, repair attempt looping, repair metadata, and failure diagnostics.
- Keep **OpenRouter Execution** responsible for request-body construction from normalized input, OpenRouter chat sender callback invocation, Structured Output handoff, Structured Output Repair callback wiring, reasoning response post-processing, and workflow-ready success/failure data.
- Keep the **n8n adapter module** responsible for node description composition, Node Parameter Surface declarations and reads, parameter validation and normalization, credentials, base URL normalization, headers, n8n HTTP helpers, Continue On Fail behavior, NodeOperationError creation, and final workflow item output.
- The Structured Output module must receive normalized config rather than n8n context.
- The Structured Output module must not call `getNodeParameter`, read credentials, call n8n HTTP helpers, or construct n8n item output directly.
- OpenRouter Execution must not call `getNodeParameter`, read credentials, call n8n HTTP helpers, inspect Continue On Fail, throw n8n framework errors, or construct n8n item output directly.
- The Structured Output module owns the Structured Output Repair loop after the initial response fails validation.
- The Structured Output module does not own retrying or resending the original initial prompt.
- OpenRouter Execution wires Structured Output Repair through the same OpenRouter chat sender callback used for the initial request.
- Treat OpenRouter as a true external dependency at the OpenRouter chat sender callback seam; production uses the n8n adapter module and tests use a fake callback.
- Return Structured Output failures as data rather than throwing framework-specific errors.
- The n8n adapter translates failure data into NodeOperationError when Continue On Fail is disabled.
- The n8n adapter translates failure data into item JSON diagnostics when Continue On Fail is enabled.
- Preserve current text mode behavior: no Structured Output validation or repair, structured value remains null.
- Preserve current JSON Object mode behavior: validated value must be a non-null, non-array object.
- Preserve current JSON Schema mode behavior: the schema decides the valid root type.
- Preserve current conservative wrapper unwrapping behavior.
- Preserve current repaired-success behavior where returned text matches the repaired structured value.
- Preserve current repair metadata shape unless a later implementation issue intentionally changes the workflow-visible contract.
- Preserve current repair defaults, including default repair model, repair temperature, repair reasoning effort, and JSON Object response format for repair calls.
- Preserve custom repair prompt placeholder validation for required placeholders.
- Normalize the Node Parameter Surface in the n8n adapter module before invoking OpenRouter Execution or Structured Output.
- Use a discriminated result shape for Structured Output outcomes. The decision-rich shape is:

```ts
StructuredOutputOutcome =
  | { ok: true; text; structured; response; repair }
  | { ok: false; error }
```

- Success outcomes include final text, structured value, final OpenRouter response, and repair metadata.
- Failure outcomes include user-readable validation errors, technical validation details, original raw text, latest repair text when present, and repair-attempt metadata.
- Start with the Structured Output architecture slice before extracting OpenRouter Model Catalog or Node Parameter Surface modules.
- After the Structured Output slice, deduplicate OpenRouter Model Catalog loading behind a focused module or adapter.
- After the Structured Output slice, group Node Parameter Surface declarations by behavior and compose them into the node description.
- Avoid introducing a broad OpenRouter transport abstraction; the OpenRouter chat sender callback is the narrow boundary seam.
- Keep public workflow behavior compatible unless an implementation issue explicitly calls out a contract change.

## Testing Decisions

- Good tests assert externally observable behavior through module interfaces or n8n execution output.
- Tests should not assert private helper structure once behavior is covered through the deep module interface.
- The Structured Output module should have focused behavior tests for valid initial Structured Output, invalid initial output repaired successfully, exhausted repair attempts, JSON Object validation, JSON Schema validation, wrapper unwrapping, prompt placeholder validation, repair request body defaults, and diagnostic data.
- Structured Output Repair tests should use a fake OpenRouter chat sender callback rather than n8n HTTP helpers.
- The fake OpenRouter chat sender callback should capture repair request bodies so tests can assert model, temperature, reasoning effort, response format, prompt content, and repair attempt count.
- Execution-level n8n tests should remain as regression coverage for public workflow output, Continue On Fail behavior, request bodies sent to OpenRouter, and credential usage.
- Existing tests in the repository provide prior art for mocked n8n execution contexts, captured OpenRouter request bodies, parser validation, repair success, repair failure, Continue On Fail diagnostics, and package wiring.
- Split tests by seam over time: Structured Output behavior tests, OpenRouter Execution tests, n8n adapter module tests, OpenRouter Model Catalog tests, and package/credential smoke tests.
- Keep build and test scripts as the regression gate.
- Prefer deleting shallow private-helper tests after equivalent behavior is covered through the Structured Output module interface.

## Out of Scope

- Changing user-facing Structured Output behavior beyond what is necessary to preserve current behavior through the new module shape.
- Changing OpenRouter credential fields or authentication flow.
- Changing the initial OpenRouter response_format behavior.
- Adding new output modes.
- Adding schema generation from example JSON.
- Changing model routing, web search, response healing, Langfuse headers, or unrelated integrations.
- Reworking the full OpenRouter transport layer before the Structured Output seam is stable.
- Publishing a package release or updating package version metadata.
- Replacing n8n execution-level tests entirely.
- Introducing a workflow migration system.

## Further Notes

The architecture goal is depth: a lot of Structured Output behavior behind a small interface and a lot of OpenRouter Execution behavior behind a small runtime seam. The deletion test should pass in all directions: deleting Structured Output should force parsing, validation, repair looping, and diagnostics to reappear elsewhere; deleting OpenRouter Execution should force request-body construction, initial chat sending, Structured Output handoff, Structured Output Repair callback wiring, reasoning cleanup, and workflow-ready result shaping to reappear elsewhere; deleting the n8n adapter module should not remove local Structured Output behavior or core OpenRouter Execution behavior tests.

This split is architecture-only. It must not change parameter names, defaults, display options, OpenRouter credential behavior, request-body compatibility, Continue On Fail behavior, Structured Output validation semantics, Structured Output Repair semantics, or final workflow item shape. The OpenRouter Model Catalog and Node Parameter Surface can be deepened independently only when that work also preserves workflow-visible behavior.
