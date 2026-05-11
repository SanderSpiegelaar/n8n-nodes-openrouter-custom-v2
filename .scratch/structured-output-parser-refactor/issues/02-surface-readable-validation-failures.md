# Surface readable validation failures

Status: done
Type: AFK

## What to build

Surface structured-output validation failures in language that workflow builders can act on. Parser and AJV errors should include human-friendly messages while preserving technical details, and Continue On Fail should return enough debug fields to inspect or route failures inside the workflow.

## Acceptance criteria

- [x] AJV validation errors are converted into readable user-facing messages.
- [x] Technical validation details remain available for debugging complex schemas.
- [x] Final structured-output failures throw useful `NodeOperationError` details when Continue On Fail is disabled.
- [x] Continue On Fail returns debug fields in the item JSON for failed validation.
- [x] Failure diagnostics include original output text and latest repair text when available.
- [x] Tests assert externally observable errors and Continue On Fail output.

## Blocked by

- .scratch/structured-output-parser-refactor/issues/01-extract-and-validate-structured-json-locally.md

## Comments
