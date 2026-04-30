# n8n-nodes-openrouter-custom-v2

This is an n8n community node for sending chat completion requests through
OpenRouter.

OpenRouter provides one API for routing prompts to many hosted language models.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- Openrouter LLM: send one prompt per incoming n8n item to
  `POST /chat/completions` and return the generated text plus the raw response.

## Credentials

Create an OpenRouter API key, then add an `OpenRouter API` credential in n8n.
The credential supports:

- API key
- Base URL override for OpenRouter-compatible endpoints
- Optional site URL for OpenRouter attribution
- Optional app name for OpenRouter attribution

## Compatibility

Built with the n8n community node tooling and tested against the package
versions in this repository.

## Usage

Add the Openrouter LLM node to a workflow, select an OpenRouter model ID, and
provide a prompt. Expressions can read each incoming item, so one node execution
can make one chat completion request per item.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [OpenRouter documentation](https://openrouter.ai/docs)

## Version history

- 0.1.0: Initial Openrouter LLM shell with API key credentials and chat
  completions support.
