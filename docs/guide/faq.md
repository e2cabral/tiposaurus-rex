# Frequently Asked Questions

## Does it support PostgreSQL, SQLite, or SQL Server?

Not today. The current implementation is focused on MySQL-compatible workflows.

## Does it change my SQL files?

No. Tiposaurus Rex reads `.sql` files and writes generated `.ts` files only.

## Is it a runtime dependency?

Usually no. It is mainly a development and build-time tool.

Your application normally consumes the generated TypeScript files, not the CLI itself.

## Do I need a live database connection?

You need one for the most accurate type and nullability inference.

If metadata lookup fails for a field, the generator falls back to heuristics, but the output may be less precise.

## Can I use it without the generated helper functions?

Yes. Many teams use only the generated query constants and interfaces, then execute queries in their own repository or data-access layer.

## Can I customize the generated code shape?

Yes. Override the Handlebars templates through `.templates`, `templateDir`, or `--templates`.

## Does it support multiple queries in one SQL file?

Yes. Each query needs its own `@name` block.

## Why should I still annotate fields if the tool talks to the database?

Annotations help produce stable names, stable interface types, and clearer intent, especially for joins, expressions, and aggregates.
