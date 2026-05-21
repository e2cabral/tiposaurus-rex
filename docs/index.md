---
layout: home

hero:
  name: "Tiposaurus Rex"
  text: "Type-safe SQL without giving up raw queries"
  tagline: Generate TypeScript types, query constants, and helper functions from annotated MySQL SQL files.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: CLI Reference
      link: /guide/cli
    - theme: alt
      text: GitHub
      link: https://github.com/e2cabral/tiposaurus-rex

features:
  - title: Database-aware type inference
    details: Uses live MySQL metadata when available, then falls back to heuristics when it cannot inspect a field precisely.
  - title: SQL-first workflow
    details: Keep your queries in .sql files, annotate them lightly, and let the generator create the TypeScript layer around them.
  - title: Formatter-friendly annotations
    details: Supports block-comment annotations such as /* @name ... */ so SQL formatters do not break your metadata.
  - title: Customizable output
    details: Override the built-in Handlebars templates or provide a unified template to generate code in your own style.
  - title: Watch mode
    details: Regenerate output whenever SQL files or the config file change during development.
  - title: Publish-ready CLI
    details: Distributed as a bundled CLI with smoke-tested build output and typed package exports.
---
