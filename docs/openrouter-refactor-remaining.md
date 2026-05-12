# OpenRouter node refactor/restructure remaining work

## Current state

The main n8n adapter module has been reduced from roughly 1,700 lines to roughly 325 lines. The large responsibilities now live in separate modules:

- `OpenrouterLlm.node.ts` — n8n adapter module: node description, method wiring, execution loop, n8n HTTP adapter, Continue On Fail behavior, Structured Output error translation.
- `OpenRouterNodeProperties.ts` — Node Parameter Surface property definitions.
- `OpenRouterExecutionInputBuilder.ts` — Node Parameter Surface normalization into `OpenRouterExecutionInput`.
- `OpenRouterRouting.ts` — OpenRouter model locator, model variant, fallback model, provider routing, and routing conflict rules.
- `OpenRouterExecution.ts` — OpenRouter Execution orchestration and request body construction.
- `StructuredOutputParser.ts` — Structured Output extraction, validation, and repair loop.
- `OpenRouterModelCatalog.ts` — OpenRouter Model Catalog load/search adapter.

## Remaining deepening opportunities

### 1. Extract Structured Output n8n adapter

**Files involved**

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- `nodes/OpenrouterLlm/StructuredOutputParser.ts`
- Potential new file: `nodes/OpenrouterLlm/StructuredOutputNodeAdapter.ts`

**Problem**

`StructuredOutputParser.ts` is already a deep Structured Output module, but `OpenrouterLlm.node.ts` still owns n8n-specific Structured Output adaptation:

- `compileSchema`
- `normalizeJsonSchemaResponseFormat`
- `isOpenAiJsonSchemaWrapper`
- `buildStructuredOutputError`
- `getStructuredOutputDiagnosticFields`
- `truncateForError`

This keeps schema parsing, OpenAI-style schema wrapper normalization, diagnostic formatting, and n8n error shaping in the n8n adapter module.

**Suggested solution**

Create a `StructuredOutputNodeAdapter` module that owns the n8n-facing Structured Output seam:

- Compile user-provided JSON Schema into a `CompiledStructuredSchema`
- Normalize OpenAI-style `json_schema` wrappers
- Convert Structured Output failures into `NodeOperationError`
- Extract Continue On Fail diagnostic fields from Structured Output errors

**Benefits**

- Better locality for Structured Output workflow-visible behavior.
- Better leverage for tests around schema parsing and diagnostic output without full node execution.
- Keeps `StructuredOutputParser.ts` pure and n8n-independent while moving n8n-specific adaptation out of the main adapter module.

---

### 2. Extract OpenRouter headers/attribution adapter

**Files involved**

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- Potential new file: `nodes/OpenrouterLlm/OpenRouterHeaders.ts`

**Problem**

`buildHeaders` remains in the main n8n adapter module. It owns Langfuse trace header behavior and protected custom header validation.

This is currently small, but it is a likely future growth point if attribution headers, tracing, protected headers, or request metadata rules expand.

**Suggested solution**

Create an `OpenRouterHeaders` module if header behavior grows beyond current scope. It would own:

- Langfuse trace header inclusion
- Custom header extraction
- Protected header validation
- Byte-identical header preservation across Structured Output Repair calls

**Benefits**

- Locality for request header rules.
- Tests can target protected header and trace behavior through a small interface.
- Keeps the n8n adapter module focused on orchestration.

**Priority**

Medium-low. This is only worth doing when header behavior changes again.

---

### 3. Split Node Parameter Surface properties by user-facing section

**Files involved**

- `nodes/OpenrouterLlm/OpenRouterNodeProperties.ts`
- Potential new files under `nodes/OpenrouterLlm/properties/`

**Problem**

`OpenRouterNodeProperties.ts` is now the largest source file at roughly 775 lines. This is mostly declarative n8n property data, so the size is less risky than a 775-line behavior module, but it can still be hard to navigate.

**Suggested solution**

If property editing remains frequent, split by user-facing section:

- `modelProperties.ts`
- `promptProperties.ts`
- `generationProperties.ts`
- `integrationProperties.ts`
- `providerRoutingProperties.ts`
- `structuredOutputProperties.ts`
- `structuredOutputRepairProperties.ts`

Keep `OpenRouterNodeProperties.ts` as the composition module that exports `nodeParameterSurface`.

**Benefits**

- Better locality for Node Parameter Surface changes.
- Easier review diffs when modifying one UI section.
- Avoids changing runtime behavior.

**Priority**

Medium. Do this when the Node Parameter Surface is actively changing.

---

### 4. Reduce `execute` cognitive complexity

**Files involved**

- `nodes/OpenrouterLlm/OpenrouterLlm.node.ts`
- Potential new helper module or private functions inside the same file

**Problem**

`execute` is now the main remaining complex function. It handles per-item orchestration, error handling, Continue On Fail behavior, request sending, and output shaping.

**Suggested solution**

Extract small orchestration helpers without introducing speculative seams:

- `executeItem`
- `createOpenRouterChatSender`
- `toN8nOutputItem`
- `toContinueOnFailOutputItem`
- `rethrowAsN8nError`

Keep these helpers close to `OpenrouterLlm.node.ts` unless multiple adapters appear.

**Benefits**

- Better locality for error translation and output shaping.
- Lower cognitive complexity in the n8n adapter module.
- Easier future tests around Continue On Fail behavior.

**Priority**

High. This is the next behavior-oriented cleanup after Structured Output adaptation.

---

### 5. Improve test support locality

**Files involved**

- `tests/OpenRouterNodeStructuredOutput.test.js`
- `tests/OpenRouterExecutionBoundary.test.js`
- `tests/OpenRouterExecutionInputBuilder.test.js`
- `tests/OpenRouterRouting.test.js`
- `tests/helpers/OpenRouterTestContext.js`

**Problem**

Several tests build small fake n8n execution contexts independently. The duplication is low, but test context setup knowledge is spread across files.

**Suggested solution**

Create a shared test helper for fake n8n contexts only if tests continue to grow:

- fake execution context
- fake routing context
- fake HTTP request capture
- common OpenRouter response builders

**Benefits**

- Better locality for n8n test harness assumptions.
- Less duplicated setup when adding new module tests.

**Priority**

Medium-low. Avoid over-abstracting unless more tests need the same harness.

---

### 6. Consider folder structure after module set stabilizes

**Files involved**

- `nodes/OpenrouterLlm/*`

**Problem**

All modules currently live flat under `nodes/OpenrouterLlm/`. This is acceptable while the module set is small, but navigation may degrade as more property and adapter modules are added.

**Suggested solution**

Only after the next one or two refactors, consider folders like:

```text
nodes/OpenrouterLlm/
  OpenrouterLlm.node.ts
  execution/
    OpenRouterExecution.ts
    OpenRouterExecutionInputBuilder.ts
  routing/
    OpenRouterRouting.ts
  structured-output/
    StructuredOutputParser.ts
    StructuredOutputNodeAdapter.ts
  properties/
    OpenRouterNodeProperties.ts
  catalog/
    OpenRouterModelCatalog.ts
```

**Benefits**

- Better AI navigability once module count grows.
- Clearer locality by domain concept.

**Priority**

Low right now. Folder moves create noisy diffs and import churn; wait until the remaining seams settle.

## Recommended next sequence

1. Extract `StructuredOutputNodeAdapter` from `OpenrouterLlm.node.ts`.
2. Reduce `execute` by extracting per-item orchestration helpers.
3. If Node Parameter Surface work continues, split `OpenRouterNodeProperties.ts` by section.
4. Only then consider folder restructuring.

## Current architecture health notes

- `OpenrouterLlm.node.ts` is now small enough to serve as the n8n adapter module.
- The largest remaining file, `OpenRouterNodeProperties.ts`, is mostly declarative data.
- The most valuable next depth improvement is not another line-count split; it is moving Structured Output n8n adaptation behind a clearer seam.
