# Contributing

This document is for people who clone the repository to fix bugs, extend the node, or cut releases. For installing and using the package in n8n, see [README.md](./README.md).

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

## Useful links

- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Creating n8n nodes](https://docs.n8n.io/integrations/creating-nodes/overview/)

## Changelog

[CHANGELOG.md](./CHANGELOG.md) is the authoritative release log: UTC dates, per-version commit links, and machine-generated detail from git. It is produced by [`auto-changelog`](https://github.com/CookPete/auto-changelog).

For verbatim commit messages, duplicate tags, and exact version-to-version diffs, rely on [CHANGELOG.md](./CHANGELOG.md).
