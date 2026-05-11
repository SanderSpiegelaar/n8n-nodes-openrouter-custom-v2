# Add configurable repair settings and prompt validation

Status: done
Type: AFK

## What to build

Add focused structured-output repair configuration and validate repair prompt templates before any model request is made. Repair behavior should be isolated from main generation while preserving existing workflow parameter paths where feasible.

## Acceptance criteria

- [x] User-facing max repair attempts label clearly communicates that attempts are repair calls after the initial response.
- [x] Existing internal parameter paths are preserved where feasible for current workflows.
- [x] Repair model uses the searchable OpenRouter model picker pattern.
- [x] Default repair model is `openai/gpt-oss-120b:nitro`.
- [x] Repair temperature is configurable and defaults to `0.1`, and the default is sent on repair requests.
- [x] Repair reasoning effort is configurable and defaults to `none`.
- [x] Custom repair prompt templates require `{instructions}`, `{completion}`, and `{error}`.
- [x] Missing required repair prompt placeholders fail fast before any OpenRouter request.
- [x] Tests cover prompt placeholder validation/substitution and repair request defaults.

## Blocked by

- .scratch/structured-output-parser-refactor/issues/01-extract-and-validate-structured-json-locally.md

## Comments
