# Contributing

Tiposaurus Rex is an open-source project, and we would love to receive your contribution!

## How to help?

- **Reporting Bugs:** If you find an error, open an issue detailing the problem and, if possible, providing an example of the SQL that caused the error.
- **Suggesting Improvements:** Have an idea for a new feature? Open an issue for us to discuss.
- **Submitting Pull Requests:**
  1. Fork the repository.
  2. Create a branch for your modification (`git checkout -b feature/new-feature`).
  3. Make sure the validation suite is passing (`npm run lint`, `npm run typecheck`, `npm test`).
  4. Submit the PR!

## Local Development

To run the project locally:

```bash
# Install dependencies
npm ci

# Run validations
npm run lint
npm run typecheck
npm test

# Build
npm run build

# Smoke-test the built CLI
npm run smoke:cli
```

## Project Architecture

The project uses Clean Architecture and SOLID principles:
- **`src/core`**: Contains the core business logic and interfaces (infrastructure independent).
- **`src/infra`**: Concrete implementations (MySQL, FileSystem, Handlebars).
- **`src/cli`**: Commands and command-line interface.
- **`src/utils`**: Parsing and inference utilities.

We use **InversifyJS** for Dependency Injection, which makes the code highly testable and decoupled.
