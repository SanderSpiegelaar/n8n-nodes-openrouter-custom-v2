# Extract and validate structured JSON locally

Status: done
Type: AFK

## What to build

Build the local structured-output parser and validator path for OpenRouter structured responses. First-pass generation should keep using provider-native OpenRouter response formats, then locally extract JSON from common LLM output shapes, validate JSON Object and JSON Schema modes, and preserve existing output-mode compatibility.

## Acceptance criteria

- [x] JSON extraction accepts raw JSON, fenced JSON, and JSON embedded in surrounding prose.
- [x] JSON Object mode rejects arrays and other non-object roots.
- [x] JSON Schema mode lets the schema determine the valid root type, including arrays or primitives.
- [x] First-pass OpenRouter requests still send provider-native structured response format settings.
- [x] Local validation runs after the OpenRouter response before structured data is returned.
- [x] Validation remains strict: schema defaults are not inserted silently and additional properties are not removed silently.
- [x] n8n-style wrapper keys and accidental double-nested wrappers are unwrapped only when unambiguous.
- [x] Parser/validator behavior is extracted into testable helper modules with parser edge-case coverage.

## Blocked by

None - can start immediately

## Comments
