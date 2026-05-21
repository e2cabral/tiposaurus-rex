# What is Tiposaurus Rex?

Tiposaurus Rex is a CLI for teams that like writing raw SQL but still want a typed TypeScript workflow around it.

It scans `.sql` files, reads lightweight annotations from comments, inspects MySQL metadata when possible, and generates `.ts` files containing:

- query result interfaces
- parameter interfaces
- query string constants
- helper execution functions
- table interfaces inferred from referenced tables

## The problem it solves

Raw SQL often forces a bad tradeoff:

- keep control over SQL, but lose TypeScript safety
- keep TypeScript safety, but move into an ORM or query builder you may not want

Tiposaurus Rex keeps SQL as the source of truth and generates the TypeScript layer from it.

## How it works

1. You store SQL in `.sql` files.
2. You annotate each query with at least `@name`.
3. The CLI parses the file and discovers parameters, return fields, and query shape.
4. If a MySQL connection is available, it fetches metadata from the database to refine types and nullability.
5. It writes generated `.ts` files into your output directory.

## Scope

Today the project is focused on MySQL-compatible workflows.

It is especially useful when you want:

- raw SQL checked into the repository
- explicit control over joins, aggregates, and query tuning
- minimal runtime abstraction
- generated types that evolve with your SQL files

## What it does not try to be

Tiposaurus Rex is not:

- a migration tool
- a schema management tool
- a full ORM
- a runtime query engine

It is a build-time and development-time generator.

## Typical workflow

The most common loop looks like this:

```bash
npx tiposaurus init
npx tiposaurus generate --watch
```

Then you edit SQL files, save, and consume the generated TypeScript files from your app code.
