# n8n-nodes-openrouter-custom

[n8n](https://n8n.io/) community package that adds an **Openrouter LLM** node for chat completions via [OpenRouter](https://openrouter.ai/) — one HTTP API to route prompts to many hosted models.

**Package:** `n8n-nodes-openrouter-custom-v2` · **License:** MIT · **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)

## Contents

- [Features](#features)
- [Installation](#installation)
- [Credentials](#credentials)
- [Usage](#usage)
- [Contributing](./CONTRIBUTING.md)
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

## Resources

- [Install community nodes](https://docs.n8n.io/integrations/community-nodes/installation/)
- [OpenRouter documentation](https://openrouter.ai/docs)

To work on this package (build, test, compatibility, changelog policy), see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Version history

Release notes for all versions are in [CHANGELOG.md](./CHANGELOG.md). The latest published release is **0.2.3** (structured output repair settings, clearer validation errors, regression tests).

Contributors: how the changelog is generated and where to find commit-level detail is documented in [CONTRIBUTING.md](./CONTRIBUTING.md#changelog).
