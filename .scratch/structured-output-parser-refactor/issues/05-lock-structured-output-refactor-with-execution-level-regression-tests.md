# Lock structured-output refactor with execution-level regression tests

Status: needs-triage
Type: AFK

## What to build

Lock the structured-output parser refactor with package-level regression coverage and the normal build/test gate. The tests should assert externally observable node behavior: returned structured data, returned metadata, OpenRouter request bodies, validation failures, and user-visible error messages.

## Acceptance criteria

- [ ] Parser tests cover raw JSON, fenced JSON, JSON inside prose, invalid JSON, JSON Object root validation, JSON Schema validation, and conservative unwrapping.
- [ ] Validation error tests prove human-friendly AJV messages and technical details are both produced.
- [ ] Repair request tests prove default repair model, temperature, reasoning effort, and JSON Object response format are sent.
- [ ] Execution-flow tests prove success-after-repair and failure-after-repairs behavior.
- [ ] Continue On Fail tests prove debug fields are returned in item JSON.
- [ ] Tests reuse the existing node execution test style with mocked execution context and captured OpenRouter request bodies.
- [ ] Package build and test scripts pass as the regression gate.

## Blocked by

- .scratch/structured-output-parser-refactor/issues/01-extract-and-validate-structured-json-locally.md
- .scratch/structured-output-parser-refactor/issues/02-surface-readable-validation-failures.md
- .scratch/structured-output-parser-refactor/issues/03-add-configurable-repair-settings-and-prompt-validation.md
- .scratch/structured-output-parser-refactor/issues/04-repair-invalid-structured-output-end-to-end.md

## Comments
