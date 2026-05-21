# Contributing to Tiposaurus Rex

Thank you for your interest in contributing to Tiposaurus Rex. This guide keeps the contribution flow straightforward and consistent.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/tiposaurus-rex.git
cd tiposaurus-rex
```

3. Install dependencies:

```bash
npm ci
```

## Development Workflow

### Useful Scripts

- `npm run lint`: validates code style and common correctness issues.
- `npm run typecheck`: validates TypeScript types with `tsc --noEmit`.
- `npm test`: runs the Jest test suite.
- `npm run build`: builds the CLI package with `tsup`.
- `npm run smoke:cli`: validates the built CLI entrypoint.
- `npm run docs:build`: builds the VitePress documentation site.

### Before Opening a Pull Request

Run the same checks used by CI:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:cli
```

If your change affects the docs, also run:

```bash
npm run docs:build
```

## Coding Guidelines

- Keep changes focused and cohesive.
- Add or update tests for behavior changes and bug fixes.
- Prefer small, explicit abstractions over hidden coupling.
- Preserve the CLI and generated-output experience when changing internals.

## Pull Requests

1. Create a branch for your work.
2. Keep commits organized and descriptive.
3. Explain the user-facing impact and any important tradeoffs in the PR description.
4. Link related issues when applicable.

## Reporting Issues

If you find a bug or have an idea for improvement, open an [Issue](https://github.com/e2cabral/tiposaurus-rex/issues) with reproduction steps, expected behavior, and relevant SQL examples when possible.
