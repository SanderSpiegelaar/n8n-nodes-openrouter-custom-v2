# OpenRouter LLM Node

This context covers the n8n community node that sends chat-completion requests to OpenRouter and turns model responses into workflow item output.

## Language

**OpenRouter Execution**:
A single n8n item run that builds an OpenRouter chat-completion request, sends it, validates the response, and returns workflow item data.
_Avoid_: Chat service, completion handler

**Structured Output**:
A model response that the workflow expects to be valid JSON in either JSON Object mode or JSON Schema mode.
_Avoid_: JSON mode, parser output

**Structured Output Repair**:
A follow-up OpenRouter request that rewrites invalid Structured Output into valid JSON after the initial response fails local validation.
_Avoid_: Retry, validation attempt, healing

**OpenRouter Model Catalog**:
The list of OpenRouter text-capable models exposed to n8n model selectors.
_Avoid_: Model options API, model list service

**Node Parameter Surface**:
The n8n-visible fields that configure an OpenRouter Execution.
_Avoid_: UI config, properties blob

## Relationships

- An **OpenRouter Execution** has exactly one initial OpenRouter chat-completion request.
- An **OpenRouter Execution** may have zero or more **Structured Output Repair** requests.
- **Structured Output** is validated locally after OpenRouter returns a response.
- **Structured Output Repair** consumes validation errors from **Structured Output** validation.
- The **Node Parameter Surface** configures **OpenRouter Execution**, **Structured Output**, and **Structured Output Repair**.
- The **OpenRouter Model Catalog** supplies selectable models for the **Node Parameter Surface**.

## Example dialogue

> **Dev:** "If **Structured Output** fails schema validation, is that another **OpenRouter Execution**?"
> **Domain expert:** "No — it is a **Structured Output Repair** inside the same **OpenRouter Execution**. The first request already happened; repair calls only try to make the response valid JSON."

## Flagged ambiguities

- "retry" can mean retrying the original model prompt or running **Structured Output Repair**. Use **Structured Output Repair** when the request is a JSON-fixing follow-up call.
- "validation attempt" previously mixed the initial response with repair calls. Use **Structured Output Repair** count for repair calls after the initial response.
