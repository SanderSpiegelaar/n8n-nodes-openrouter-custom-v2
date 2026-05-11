# OpenRouter LLM Node

This context covers the n8n community node that sends chat-completion requests to OpenRouter and turns model responses into workflow item output.

## Language

**OpenRouter Execution**:
A single n8n item run that normalizes the Node Parameter Surface, sends exactly one initial OpenRouter chat-completion request, hands Structured Output responses to local validation and repair, then translates the outcome into n8n workflow item data or n8n error behavior.
_Avoid_: Chat service, completion handler

**Structured Output**:
A model response that the workflow expects to be valid JSON in either JSON Object mode or JSON Schema mode. As a module responsibility, Structured Output owns local JSON extraction, wrapper unwrapping, validation, error formatting, Structured Output Repair orchestration, repair metadata, and diagnostic outcome data.
_Avoid_: JSON mode, parser output

**Structured Output Repair**:
A follow-up OpenRouter request that rewrites invalid Structured Output into valid JSON after the initial response fails local validation. Structured Output Repair requests happen inside the same OpenRouter Execution and are counted after the initial response, not as total validation attempts.
_Avoid_: Retry, validation attempt, healing

**OpenRouter Model Catalog**:
The list of OpenRouter text-capable models exposed to n8n model selectors.
_Avoid_: Model options API, model list service

**Node Parameter Surface**:
The n8n-visible fields that configure an OpenRouter Execution. The n8n adapter normalizes these fields into plain Structured Output configuration before invoking Structured Output behavior.
_Avoid_: UI config, properties blob

**repair sender callback**:
The seam where Structured Output asks the n8n adapter to send a Structured Output Repair request to OpenRouter. Structured Output builds the repair request body and consumes the returned text and response object; the n8n adapter owns credentials, base URL handling, headers, and n8n HTTP helper usage.
_Avoid_: transport abstraction, HTTP client wrapper

## Relationships

- An **OpenRouter Execution** has exactly one initial OpenRouter chat-completion request.
- An **OpenRouter Execution** may have zero or more **Structured Output Repair** requests after that initial response.
- The n8n adapter owns the initial request, OpenRouter credentials, Node Parameter Surface normalization, Continue On Fail behavior, and final workflow output shaping.
- **Structured Output** is validated locally after OpenRouter returns the initial response.
- **Structured Output** returns success or failure as outcome data rather than n8n framework-specific errors.
- **Structured Output Repair** consumes validation errors from **Structured Output** validation.
- **Structured Output Repair** requests are sent through a **repair sender callback** supplied by the n8n adapter.
- The **Node Parameter Surface** configures **OpenRouter Execution**, **Structured Output**, and **Structured Output Repair**.
- The **OpenRouter Model Catalog** supplies selectable models for the **Node Parameter Surface**.

## Example dialogue

> **Dev:** "If **Structured Output** fails schema validation, is that another **OpenRouter Execution**?"
> **Domain expert:** "No — it is a **Structured Output Repair** inside the same **OpenRouter Execution**. The first request already happened; repair calls only try to make the response valid JSON."

## Flagged ambiguities

- "retry" can mean retrying the original model prompt or running **Structured Output Repair**. Use **Structured Output Repair** when the request is a JSON-fixing follow-up call.
- "validation attempt" previously mixed the initial response with repair calls. Use **Structured Output Repair** count for repair calls after the initial response.
