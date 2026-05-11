# n8n-nodes-openrouter-custom

[n8n](https://n8n.io/) community package that adds an **Openrouter LLM** node for chat completions via [OpenRouter](https://openrouter.ai/) — one HTTP API to route prompts to many hosted models.

**Package:** `n8n-nodes-openrouter-custom-v2` · **License:** MIT

## Contents

- [Features](#features)
- [Installation](#installation)
- [Credentials](#credentials)
- [Usage](#usage)
- [Development](#development)
- [Compatibility](#compatibility)
- [Resources](#resources)
- [Version history](#version-history)

## Features

- **Chat completions** — Calls OpenRouter `POST /chat/completions` and returns assistant text plus the raw API response on each output item.
- **Model selection** — Pick a model from a searchable list (loaded from OpenRouter) or enter a model ID / expression.
- **Model options** — Fallback models, OpenRouter model variants (e.g. `:nitro`, `:online`), with validation where combinations conflict.
- **Prompt modes** — Simple prompt, system + user split, or full **Messages JSON** for multi-turn chats.
- **Generation & reasoning** — Common sampling params, optional reasoning controls (where supported).
- **Structured output** — Optional JSON Schema with AJV validation and retry behaviour for reliable machine-readable results.
- **Provider routing** — Allow/deny providers, sort order, and related OpenRouter routing fields.
- **Integrations** — Custom headers, metadata, Langfuse trace ID, web search–related options where applicable.

## Installation

Install as a [community node](https://docs.n8n.io/integrations/community-nodes/installation/) from the n8n UI, or add the package to your n8n environment per the same guide.

Package name for npm-style installs: `n8n-nodes-openrouter-custom-v2`.

## Credentials

In n8n, create **OpenRouter Custom V2 API** credentials (tested against `GET /models`).

| Field    | Purpose                                                                 |
| -------- | ----------------------------------------------------------------------- |
| API key  | Bearer token for OpenRouter                                             |
| Base URL | OpenRouter-compatible API base (default `https://openrouter.ai/api/v1`) |
| Site URL | Optional; sent for OpenRouter attribution (`HTTP-Referer`)              |
| App name | Optional; sent as `X-OpenRouter-Title`                                  |

## Usage

1. Add the **Openrouter LLM** node and attach **OpenRouter Custom V2 API** credentials.
2. Choose a model (list or ID).
3. Set prompts using expressions so each **input item** can drive its own request — one completion per item.

See [OpenRouter docs](https://openrouter.ai/docs) for model IDs, pricing, and provider-specific behaviour.

## Development

Requires Node.js and npm. From the repository root:

| Command                             | Description                    |
| ----------------------------------- | ------------------------------ |
| `npm run build`                     | Build with `n8n-node`          |
| `npm run dev`                       | Development mode for local n8n |
| `npm run lint` / `npm run lint:fix` | ESLint                         |
| `npm test`                          | Build then run tests           |

Built artifacts are emitted under `dist/` and are what n8n loads (see `package.json` → `n8n.nodes` / `n8n.credentials`).

## Compatibility

Built with [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli) (`n8n-node`). Peer dependency: `n8n-workflow` (version resolved by your n8n install).

## Resources

- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Creating n8n nodes](https://docs.n8n.io/integrations/creating-nodes/overview/)
- [OpenRouter documentation](https://openrouter.ai/docs)

## Version history

Summary below; full notes are in [CHANGELOG.md](./CHANGELOG.md).

- **0.1.3** — Project cleanup; credential type renamed to **OpenRouter Custom V2 API** (`openRouterCustomV2Api`) for compatibility with the Openrouter LLM node.
- **0.1.2** — README and metadata aligned with package name `n8n-nodes-openrouter-custom-v2`.
- **0.1.1** — Structured output (AJV), provider routing, model variants & fallbacks, web search plugin (`:online`) conflict handling, and related UX.

Initial **0.1.0** release introduced the Openrouter LLM node with chat completions and API key credentials.
