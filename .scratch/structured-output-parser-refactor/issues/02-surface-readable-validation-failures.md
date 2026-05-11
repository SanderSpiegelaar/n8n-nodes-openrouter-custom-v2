# Surface readable validation failures

Status: needs-triage
Type: AFK

## What to build

Surface structured-output validation failures in language that workflow builders can act on. Parser and AJV errors should include human-friendly messages while preserving technical details, and Continue On Fail should return enough debug fields to inspect or route failures inside the workflow.

## Acceptance criteria

- [ ] AJV validation errors are converted into readable user-facing messages.
- [ ] Technical validation details remain available for debugging complex schemas.
- [ ] Final structured-output failures throw useful `NodeOperationError` details when Continue On Fail is disabled.
- [ ] Continue On Fail returns debug fields in the item JSON for failed validation.
- [ ] Failure diagnostics include original output text and latest repair text when available.
- [ ] Tests assert externally observable errors and Continue On Fail output.

## Blocked by

- .scratch/structured-output-parser-refactor/issues/01-extract-and-validate-structured-json-locally.md

## Comments
