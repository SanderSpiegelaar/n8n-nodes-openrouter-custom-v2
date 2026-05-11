# n8n-nodes-openrouter-custom-v2

[n8n](https://n8n.io/) community package that adds an **Openrouter LLM** node for chat completions via [OpenRouter](https://openrouter.ai/) — one HTTP API to route prompts to many hosted models.

## Contents

- [Quick start](#quick-start)
- [Credentials](#credentials)
- [Capabilities](#capabilities)
- [Links](#links)

## Quick start

1. Install as a [community node](https://docs.n8n.io/integrations/community-nodes/installation/) from the n8n UI, or add the package `n8n-nodes-openrouter-custom-v2` to your environment (same guide).
2. Create **OpenRouter Custom V2 API** credentials in n8n ([Credentials](#credentials)).
3. Add the **Openrouter LLM** node, attach those credentials, and pick a model (searchable list or model ID / expression).
4. Set prompts with expressions so each **input item** drives its own request — one completion per item.

For model IDs, pricing, and provider behaviour, see [OpenRouter documentation](https://openrouter.ai/docs).

## Credentials

In n8n, create **OpenRouter Custom V2 API** credentials (tested against `GET /models`).

| Field    | Purpose                                                                 |
| -------- | ----------------------------------------------------------------------- |
| API key  | Bearer token for OpenRouter                                             |
| Base URL | OpenRouter-compatible API base (default `https://openrouter.ai/api/v1`) |
| Site URL | Optional; sent for OpenRouter attribution (`HTTP-Referer`)              |
| App name | Optional; sent as `X-OpenRouter-Title`                                  |

## Capabilities

### Chat and prompts

- **`POST /chat/completions`** — Assistant text plus the raw API response on each output item.
- **Prompt modes** — Simple prompt, system + user split, or full **Messages JSON** for multi-turn chats.
- **Generation** — Sampling parameters and optional reasoning controls where the model supports them.

### Models and routing

- **Model selection** — Searchable list (from OpenRouter) or manual model ID / expression.
- **Model options** — Fallback models and OpenRouter variants (e.g. `:nitro`, `:online`); conflicting combinations are validated.
- **Provider routing** — Allow/deny providers, sort order, and related OpenRouter routing fields.

### Structured output

- **JSON Schema** — Optional schema with AJV validation and retries for machine-readable output.

### Integrations and observability

- **Headers and metadata** — Custom headers and request metadata where needed.
- **Tracing and search** — Langfuse trace ID and web-search-related options when applicable.

## Links

- [Installing community nodes (n8n)](https://docs.n8n.io/integrations/community-nodes/installation/)
- [OpenRouter documentation](https://openrouter.ai/docs)
- [CHANGELOG.md](./CHANGELOG.md) — release notes; see npm or this file for the current published version.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — local development, compatibility, and changelog policy for contributors.

---

**Package:** `n8n-nodes-openrouter-custom-v2` · **License:** MIT · **Repository:** [SanderSpiegelaar/n8n-nodes-openrouter-custom-v2](https://github.com/SanderSpiegelaar/n8n-nodes-openrouter-custom-v2) · **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
