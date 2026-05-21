# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-21

### Added
- Support for SQL annotations in block comments `/* @name ... */`.
- Watch Mode (`--watch`) for the `generate` command.
- Structured logging system with `LoggerService`.
- Support for custom templates with built-in fallback.
- New domain interfaces for better decoupling (SOLID).
- Comprehensive unit tests for Parser, Analyzer, Formatter, and TypeInferer.
- Documentation for contributors (`CONTRIBUTING.md`).
- CI workflow via GitHub Actions.

### Changed
- Drastic architecture refactoring to use Dependency Injection (Inversify).
- Improved type inference for SQL functions and binary types.
- Enhanced CLI with banners, progress bars, and clear error messages.
- NPM package optimization to include only necessary files.
- Packaging migrated to `tsup` with ESM/CJS outputs, typed exports, and CLI smoke validation.
- CI now runs `lint`, `typecheck`, tests, build, and CLI smoke checks.

### Fixed
- Table alias resolution in complex queries.
- SQL reserved words handling to avoid invalid aliases.
- Parser stability against automatic SQL formatters.
- Published CLI no longer depends on `package.json` at runtime.
- Generated files now preserve query directory structure and avoid basename collisions.
- `init` automatically protects `tiposaurus.config.json` via `.gitignore`.
- Direct and transitive dependency vulnerabilities reduced to the remaining unresolved VitePress chain.

## [0.1.0] - 2026-05-15
- Initial project version with basic type generation functionality.
