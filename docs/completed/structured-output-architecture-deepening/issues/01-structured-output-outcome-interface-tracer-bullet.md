# Structured Output outcome interface tracer bullet

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Introduce the small Structured Output module interface that accepts normalized Structured Output configuration plus the initial OpenRouter response text/object, then returns success or failure as data. This tracer bullet should make local parsing, wrapper unwrapping, validation, compact repair metadata shape, and diagnostic failure data testable without a mocked n8n runtime.

Use this decision-rich outcome shape as the intended interface direction:

```ts
StructuredOutputOutcome =
  | { ok: true; text; structured; response; repair }
  | { ok: false; error }
```

## Acceptance criteria

- [x] Structured Output behavior can be invoked through one focused module interface using normalized config, initial response text, and initial response object.
- [x] The module does not call n8n execution helpers, read credentials, call HTTP helpers, or construct n8n item output.
- [x] Success outcomes include final text, structured value, final OpenRouter response object, and compact repair metadata.
- [x] Failure outcomes include user-readable validation errors, technical validation details, original raw text, and repair-attempt metadata fields even before repair is wired in.
- [x] Focused module tests cover valid initial Structured Output, invalid initial Structured Output failure data, JSON Object validation, JSON Schema validation, and conservative wrapper unwrapping.
- [x] Existing execution-level behavior remains unchanged while the adapter still owns public n8n output shaping.

## Blocked by

None - can start immediately
