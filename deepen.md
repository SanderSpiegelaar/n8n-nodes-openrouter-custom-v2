# Code Context

## Files Retrieved

1. `AGENTS.md` (lines 1-105) - project rules for n8n community-node structure, package wiring, and context docs.
2. `docs/agents/domain.md` (lines 1-48) - domain-documentation guidance; no `CONTEXT.md` or `docs/adr/` files were present.
3. `package.json` (lines 1-52) - package wiring, scripts, dependencies, and current n8n node/credential entries.
4. `.scratch/structured-output-parser-refactor/PRD.md` (lines 1-143) - structured-output target architecture and testing expectations.
5. `credentials/OpenRouterApi.credentials.ts` (lines 1-61) - credential implementation and OpenRouter auth/base URL fields.
6. `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` (lines 1-260, 580-740, 827-1036, 1066-1245, 1522-1641, 1716-1865) - node metadata, parameter surface, OpenRouter calls, execution loop, request/repair/schema/message helpers.
7. `nodes/OpenrouterLlm/StructuredOutputParser.ts` (lines 1-161) - extracted structured-output parsing and validation module.
8. `tests/openrouter-llm.test.js` (lines 1-260, 770-860, 1021-1140, 1113-1252, 1251-1350) - execution-context test harness plus structured-output/repair regression coverage.

## Key Code

- Package wiring is simple and fixed in `package.json`:

```json
"n8n": {
  "strict": false,
  "credentials": ["dist/credentials/OpenRouterApi.credentials.js"],
  "nodes": ["dist/nodes/OpenrouterLlm/OpenrouterLlm.node.js"]
}
```

- `OpenrouterLlm.node.ts` is the main implementation module. It contains the n8n `INodeType` class, a large inline property schema, load/search methods, the per-item execution loop, request builders, validation helpers, repair prompt construction, schema compilation, web plugin/routing logic, and diagnostics.

- Structured output is partly extracted:

```ts
// nodes/OpenrouterLlm/StructuredOutputParser.ts lines 3-17
export type StructuredOutputMode = 'text' | 'json_object' | 'json_schema';
export type StructuredValidationResult =
	| { ok: true; value: unknown }
	| { ok: false; errors: string[]; details: StructuredValidationIssue[] };
```

- The parser module handles extraction, wrapper unwrapping, AJV validation, and readable error formatting in one implementation module (`StructuredOutputParser.ts` lines 19-161).

- The repair seam is still inside the node implementation:
  - `OpenrouterLlm.node.ts` lines 898-1036: execution loop decides initial vs repair request, calls OpenRouter, validates output, handles diagnostics.
  - `OpenrouterLlm.node.ts` lines 1182-1245: repair model/defaults, prompt expansion, placeholder validation, and JSON Object response format.

- Tests currently combine package wiring, credential assertions, node execution, parser behavior, repair defaults, diagnostics, routing, and prompt modes in one large `tests/openrouter-llm.test.js` file.

## Architecture

Current shape:

- n8n node module: `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
  - Interface to n8n (`INodeType`, node properties, methods, `execute`).
  - Implementation for OpenRouter request body construction.
  - Implementation for prompt/message normalization.
  - Implementation for structured-output retry/repair orchestration.
  - Implementation for schema compilation and diagnostic shaping.
  - OpenRouter HTTP usage through n8n helper calls.
- Parser module: `nodes/OpenrouterLlm/StructuredOutputParser.ts`
  - Local structured-output extraction/validation implementation.
  - Good locality for JSON extraction and AJV validation, but still combines several responsibilities.
- Credential module: `credentials/OpenRouterApi.credentials.ts`
  - Thin n8n credential adapter; no obvious deepening needed.
- Tests: `tests/openrouter-llm.test.js`
  - Execution-level tests are useful, but module-level seams are weak because many helpers remain private inside the node file.

## Start Here

Start with `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` around lines 898-1036. That execution loop is the main leverage point: it coordinates n8n parameters, OpenRouter calls, structured validation, repair attempts, diagnostics, and output shaping.

## Architectural Deepening Candidates

### 1. Split the node god module into deeper implementation modules

- **Files:** `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` lines 50-825, 898-1865; `tests/openrouter-llm.test.js` broadly.
- **Problem:** `OpenrouterLlm.node.ts` is both n8n adapter and core implementation. The module has low locality: node description, parameter schema, HTTP request construction, prompt parsing, OpenRouter routing, structured-output repair, and diagnostics all change in the same file.
- **Deletion test:** Deleting or replacing any one behavior, such as repair or model loading, still requires touching the giant node module because the seams are private functions bound to `IExecuteFunctions`.
- **Solution:** Keep the node class as a thin adapter and move coherent implementations into deeper modules: request building, prompt/message building, OpenRouter transport/model catalog adapter, structured-output repair orchestration, and diagnostics.
- **Benefits:** Higher depth per module, better locality, smaller blast radius, easier focused tests, and more leverage for future OpenRouter-compatible features.

### 2. Extract repair orchestration from the execution loop

- **Files:** `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` lines 898-1036 and 1182-1245; `.scratch/structured-output-parser-refactor/PRD.md` lines 36-40, 117-124.
- **Problem:** The repair behavior is still coupled to the main execution loop and n8n parameter access. It is not a separate implementation seam, even though the PRD explicitly asks for repair orchestration separated from main request building.
- **Deletion test:** Removing repair should not disturb initial request generation, schema compilation, or output shaping. Today those concerns are interleaved in the `while` loop and private builders.
- **Solution:** Introduce a deeper repair module responsible for repair-attempt planning, prompt expansion, repair request construction, and repair outcome metadata, with the node acting as the adapter that supplies parameters and sends HTTP.
- **Benefits:** Makes repair testable without a mocked full n8n execution context, clarifies max-repair-attempt semantics, and isolates the highest-friction structured-output behavior.

### 3. Make structured-output parsing a deeper behavior module, not just utility functions

- **Files:** `nodes/OpenrouterLlm/StructuredOutputParser.ts` lines 1-161; `tests/openrouter-llm.test.js` lines 796-830 and 1021-1039.
- **Problem:** Extraction, wrapper unwrapping, AJV compilation, validation, and human-readable error formatting are grouped together. This is better than keeping them in the node, but the module is still a utility bag rather than a cohesive structured-output implementation with explicit behavior boundaries.
- **Deletion test:** Replacing AJV error rendering or JSON candidate extraction would require editing the same module and could accidentally affect unrelated parser behavior.
- **Solution:** Deepen the structured-output implementation by separating extraction, validation, and error formatting behind stable module seams while preserving the current public behavior.
- **Benefits:** More precise parser-edge tests, safer changes to extraction heuristics, and clearer alignment with the PRD’s parse/validate/format responsibilities.

### 5. Introduce an OpenRouter adapter seam for HTTP/model catalog behavior

- **Files:** `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` lines 827-896 and 943-956; `credentials/OpenRouterApi.credentials.ts` lines 1-61.
- **Problem:** OpenRouter HTTP calls are duplicated and embedded directly in n8n methods. Model catalog loading appears twice with near-identical `/models` request/filter/sort logic, and chat completion calls are built directly in the execution loop.
- **Deletion test:** Swapping the transport, caching model lists, or adding an OpenRouter-compatible base URL behavior would require edits in node methods and execution code.
- **Solution:** Add an OpenRouter adapter module for model catalog retrieval and chat completion transport, leaving credentials as the n8n authentication adapter.
- **Benefits:** Reduces duplication, improves testability of request options, and gives a clean seam for future OpenRouter API behavior without bloating the node module.

### 7. Split tests by architectural seam

- **Files:** `tests/openrouter-llm.test.js` lines 1-1644.
- **Problem:** Tests provide strong regression coverage but are concentrated in one execution-level file and mostly require building `dist` first. Parser unit tests are embedded beside n8n execution tests, and private node helpers can only be exercised through full mocked executions.
- **Deletion test:** Deleting the single test file removes coverage for package wiring, credentials, parser, repair orchestration, request bodies, routing, and execution output at once.
- **Solution:** Keep execution tests for end-to-end behavior, but add focused tests near the deeper modules: parser/extraction, repair orchestration, request building, and OpenRouter adapter behavior.
- **Benefits:** Faster feedback, clearer failure locality, and safer refactoring because each implementation seam owns its own tests.

### 8. Move parameter/property declarations closer to their behavior

- **Files:** `nodes/OpenrouterLlm/OpenrouterLlm.node.ts` lines 50-825.
- **Problem:** The large inline property declaration is shallow configuration in the same module as behavior. Related behavior, such as repair settings or provider routing, lives hundreds of lines away.
- **Deletion test:** Removing a feature such as web search or repair means deleting both property blocks and separate private implementation blocks in the same giant file, with no locality around the feature.
- **Solution:** Organize property declarations by feature module, then compose them in the node description.
- **Benefits:** Better feature locality, easier UX changes, and less friction when evolving one parameter group without scanning unrelated node behavior.
