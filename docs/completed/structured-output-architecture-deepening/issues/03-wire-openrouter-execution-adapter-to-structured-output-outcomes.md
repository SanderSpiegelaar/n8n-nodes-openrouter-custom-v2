# Wire OpenRouter Execution adapter to Structured Output outcomes

Status: done
Type: AFK

## Parent

.scratch/structured-output-architecture-deepening/PRD.md

## What to build

Wire OpenRouter Execution to the deepened Structured Output module while keeping the n8n node as the adapter. In the settled boundary, the n8n adapter module normalizes the Node Parameter Surface into plain Structured Output and OpenRouter Execution input, supplies an OpenRouter chat sender callback that uses existing n8n HTTP helpers and credentials, then translates OpenRouter Execution and Structured Output outcomes into normal n8n output, NodeOperationError behavior, or Continue On Fail diagnostics. OpenRouter Execution owns initial request-body construction, OpenRouter chat sender callback invocation, Structured Output handoff, and Structured Output Repair wiring.

## Acceptance criteria

- [x] OpenRouter Execution still owns exactly one initial OpenRouter chat-completion request per item and invokes it through the OpenRouter chat sender callback.
- [x] The n8n adapter module normalizes Node Parameter Surface values before calling OpenRouter Execution or Structured Output; Structured Output does not depend on n8n parameter names.
- [x] The production OpenRouter chat sender callback preserves existing OpenRouter credentials, base URL, headers, and n8n HTTP helper behavior for initial and Structured Output Repair requests.
- [x] Structured Output failure data becomes a NodeOperationError when Continue On Fail is disabled.
- [x] Structured Output failure data becomes workflow item JSON diagnostics when Continue On Fail is enabled.
- [x] Successful Structured Output Repair remains visible in output metadata.
- [x] Text mode remains unchanged: no Structured Output validation or repair, and structured value remains null.
- [x] Existing execution-level regression tests still pass for public workflow output, request bodies sent to OpenRouter, Continue On Fail behavior, and credential usage.

## Blocked by

- .scratch/structured-output-architecture-deepening/issues/01-structured-output-outcome-interface-tracer-bullet.md
- .scratch/structured-output-architecture-deepening/issues/02-move-structured-output-repair-loop-behind-callback-seam.md
