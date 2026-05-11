# PRD: Structured Output Parser Refactor and Repair Visibility

## Problem Statement

The OpenRouter LLM community node currently works well for structured outputs, but the validation and repair behavior feels like a black box. Users can choose JSON Object or JSON Schema output modes, and the node validates responses with AJV, but validation failures are hard to understand, repair attempts are coupled to the original prompt retry loop, and users cannot configure the model or prompt used to fix invalid structured output.

This makes it difficult for workflow builders to diagnose why a model response failed schema validation, tune the repair behavior independently from the main generation model, or give the repair model clear natural-language instructions about what is wrong with the JSON object.

## Solution

Refactor structured output handling into a behavior-compatible local implementation of n8n's structured output parser pattern. The node should keep the existing OpenRouter structured response behavior for first-pass generation, then run a local parser/validator that extracts JSON, validates it, produces human-friendly validation errors, and optionally performs separate repair calls using a configurable fixing model.

From the user's perspective, structured output should become transparent and tunable:

- JSON extraction should handle common LLM output shapes, including fenced JSON and surrounding prose.
- JSON Schema validation errors should be shown in plain language and technical detail.
- The structured-output repair call should use its own model, temperature, reasoning effort, output format, and editable prompt template.
- The default repair settings should be optimized for deterministic JSON fixing.
- Successful repairs should clearly expose that repair happened, while failed repairs should return actionable diagnostics, especially when Continue On Fail is enabled.

## User Stories

1. As an n8n workflow builder, I want structured output validation errors to be readable, so that I can understand why my workflow failed.
2. As an n8n workflow builder, I want AJV errors converted into human-friendly messages, so that I can fix my prompt or schema without decoding validator internals.
3. As an n8n workflow builder, I want technical validation details preserved, so that I can debug complex schemas when friendly messages are not enough.
4. As an n8n workflow builder, I want the node to parse JSON inside markdown code fences, so that common model formatting does not break my workflow.
5. As an n8n workflow builder, I want the node to extract the first valid-looking JSON object from surrounding prose, so that imperfect model responses can still be validated.
6. As an n8n workflow builder, I want JSON Object mode to enforce a non-array JSON object, so that downstream workflow items receive the shape I selected.
7. As an n8n workflow builder, I want JSON Schema mode to let the schema decide the root type, so that schemas for arrays or primitives are valid when I intentionally define them.
8. As an n8n workflow builder, I want first-pass generation to keep using OpenRouter response formats, so that provider-native structured output still improves reliability.
9. As an n8n workflow builder, I want local validation after provider-native structured output, so that the node verifies the response before returning it.
10. As an n8n workflow builder, I want invalid structured output to be repaired by a separate model call, so that repair behavior is isolated from the original generation prompt.
11. As an n8n workflow builder, I want to configure the repair model, so that I can choose a model that is good at JSON correction.
12. As an n8n workflow builder, I want the default repair model to be `openai/gpt-oss-120b:nitro`, so that the default behavior is strong without additional setup.
13. As an n8n workflow builder, I want to configure the repair temperature, so that I can make repairs deterministic.
14. As an n8n workflow builder, I want repair temperature to default to `0.1`, so that repair calls are stable by default.
15. As an n8n workflow builder, I want to configure repair reasoning effort, so that I can control repair cost and behavior separately from main generation.
16. As an n8n workflow builder, I want repair reasoning effort to default to `none`, so that the repair model focuses on rewriting JSON rather than reasoning.
17. As an n8n workflow builder, I want repair calls to always request JSON Object output, so that repairs produce parseable JSON even when the original mode is JSON Schema.
18. As an n8n workflow builder, I want to edit the repair prompt template, so that I can adapt repair instructions to my workflow's domain.
19. As an n8n workflow builder, I want repair prompt templates to include the parsing instructions, failed completion, and validation error, so that the repair model has all necessary context.
20. As an n8n workflow builder, I want the node to fail fast when a custom repair prompt is missing required placeholders, so that I do not spend tokens on a misconfigured workflow.
21. As an n8n workflow builder, I want the max repair attempts setting to count repair calls after the initial response, so that the setting is intuitive.
22. As an n8n workflow builder, I want the max repair attempts label to make this behavior clear, so that I know whether the initial call is included.
23. As an existing workflow owner, I want existing parameter paths preserved where possible, so that my current workflows do not break after upgrading.
24. As an existing workflow owner, I want the current output modes to keep working, so that this refactor improves behavior without removing features.
25. As an n8n workflow builder, I want successful repaired output to return the repaired structured object, so that downstream nodes receive valid data.
26. As an n8n workflow builder, I want successful repaired output text to match the repaired JSON, so that returned text and structured data are not contradictory.
27. As an n8n workflow builder, I want metadata showing that repair happened, so that I can monitor repair frequency.
28. As an n8n workflow builder, I want compact repair metadata, so that I get useful diagnostics without bloating normal successful output.
29. As an n8n workflow builder, I want failed validation with Continue On Fail to include debug fields, so that I can route or inspect failures inside the workflow.
30. As an n8n workflow builder, I want failed validation errors to include the original text and latest repair text, so that I can compare what changed.
31. As an n8n workflow builder, I want schema validation to remain strict, so that invalid model output is repaired rather than silently coerced.
32. As an n8n workflow builder, I want schema defaults not to be inserted silently, so that returned data reflects model output or explicit repair.
33. As an n8n workflow builder, I want additional properties not to be removed silently, so that schema mismatches remain visible.
34. As an n8n workflow builder, I want n8n-style wrapper keys to be unwrapped conservatively, so that compatibility improves without surprising transformations.
35. As an n8n workflow builder, I want accidental double-nested output wrappers handled conservatively, so that common model mistakes are cleaned up only when unambiguous.
36. As a node maintainer, I want structured output parsing extracted into testable helper modules, so that validation behavior can evolve safely.
37. As a node maintainer, I want repair orchestration separated from main request building, so that fixing behavior has a simple interface and focused tests.
38. As a node maintainer, I want tests for parser edge cases, so that future changes do not reintroduce black-box behavior.
39. As a node maintainer, I want tests for repair request bodies, so that default model, temperature, reasoning, and response format are guaranteed.
40. As a node maintainer, I want tests for success-after-repair and failure-after-repairs, so that execution behavior is clear and stable.

## Implementation Decisions

- Build a local behavior-compatible structured-output parser rather than depending on n8n LangChain internals.
- Keep initial OpenRouter requests hybrid: provider-native structured output is still sent, and local parser validation runs afterward.
- Keep manual JSON Schema input only for this iteration.
- Do not add n8n-style schema generation from example JSON in this iteration.
- Rename the user-facing validation-attempt field to communicate max repair attempts, while preserving the existing internal parameter path where feasible.
- Interpret max repair attempts as the number of repair calls after the initial model response.
- Add focused structured-output fixing settings rather than full parity with all main-generation options.
- Use the same searchable OpenRouter model picker pattern for the repair model.
- Default the repair model to `openai/gpt-oss-120b:nitro`.
- Default repair temperature to `0.1` and send it by default.
- Add a repair reasoning effort option with default `none`.
- Always send repair response format as JSON Object.
- Require repair prompt templates to include `{instructions}`, `{completion}`, and `{error}`.
- Validate repair prompt placeholders before any model requests are made.
- Add hidden initial structured-output instructions for JSON Object and JSON Schema modes.
- Include the full JSON Schema in initial structured-output instructions for JSON Schema mode.
- Implement robust JSON extraction from raw JSON, line-based fenced JSON, and balanced JSON inside surrounding prose.
- Use AJV in strict validation mode for returned data behavior: no type coercion, no defaults insertion, and no removal of additional fields.
- Add `ajv-human-errors` to generate natural-language validation feedback.
- Preserve technical AJV validation data alongside human-friendly messages.
- In JSON Object mode, require a non-null, non-array object.
- In JSON Schema mode, allow the schema to determine the valid root type.
- On successful repair, return the repaired JSON text and repaired structured value.
- Preserve initial model response information while adding compact structured-output metadata for repair details.
- On failed repair with Continue On Fail, return debug fields including human errors, technical errors, original text, latest repair text, and attempt metadata.
- Implement conservative n8n-style unwrapping for known structured-output wrapper keys and unambiguous double-nested output wrappers.
- Extract a deep structured-output parser module with a small interface for parse, validate, format instructions, and format errors.
- Extract a repair orchestration helper with a small interface for prompt expansion and repair request construction.
- Keep node orchestration responsible for parameters, OpenRouter credentials, execution loop, and final n8n item output.
- Keep the public workflow surface compatible where possible by preserving existing parameter names and behavior except where the repair-attempt semantics are intentionally clarified.

## Testing Decisions

- Good tests should assert externally observable behavior: returned structured data, returned metadata, request bodies sent to OpenRouter, validation failures, and user-visible error messages.
- Tests should avoid depending on private implementation details inside helper modules beyond their public interfaces.
- Add parser tests for raw JSON, fenced JSON, JSON inside prose, invalid JSON, JSON Object root validation, JSON Schema validation, and conservative unwrapping.
- Add validation error tests proving that human-friendly AJV errors and technical details are both produced.
- Add prompt-template tests proving required placeholders are enforced and correctly substituted.
- Add repair request tests proving default repair model, temperature, reasoning effort, and JSON Object response format are sent.
- Add execution-flow tests proving invalid first output can be repaired successfully by a separate OpenRouter call.
- Add execution-flow tests proving max repair attempts means repair calls after the initial response.
- Add execution-flow tests proving final failure produces useful NodeOperationError details.
- Add Continue On Fail tests proving debug fields are returned in the item JSON.
- Reuse the existing node execution test style as prior art: mock execution context, capture OpenRouter request bodies, and assert returned n8n execution data.
- Continue running the package build and test script as the regression gate.

## Out of Scope

- Generating JSON Schema from an example JSON object.
- Directly importing or depending on n8n LangChain structured parser internals.
- Adding full main-generation provider routing, fallback models, or advanced sampling controls to repair calls.
- Making repair output format user-selectable.
- Changing the credential type or authentication flow.
- Reworking unrelated prompt modes, web search integration, provider routing, or main model sampling features.
- Implementing a workflow migration system for renamed labels, beyond preserving existing internal parameter paths where feasible.
- Publishing a new package release or updating changelog entries, unless this PRD is later converted into an implementation task that changes versioned code.

## Further Notes

This feature should make structured output feel explainable rather than opaque. The core design is to use OpenRouter's native structured-output capabilities for best first-pass reliability, then make local parser validation and repair explicit, configurable, and testable.

The highest-value deep modules are the structured-output parser/validator and the repair orchestration helper. They should encapsulate most of the complexity behind stable interfaces, allowing the node execution code to remain focused on n8n parameter handling and OpenRouter request execution.
