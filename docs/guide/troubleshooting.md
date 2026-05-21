# Troubleshooting

This page focuses on common generation and runtime issues.

## The generator cannot connect to MySQL

Symptoms:

- `Access denied for user`
- `ENOTFOUND`
- connection timeout errors

Checks:

- verify `db.host`, `db.user`, `db.password`, `db.database`
- confirm the database is reachable from the machine running the CLI
- confirm the database user can inspect metadata for the referenced tables

## SQL files are not being found

Checks:

- confirm `queryDirs` points to the correct folders
- confirm files end with `.sql`
- confirm you are running the CLI from the expected working directory

## Generated types fall back to `any`

Usually this means one of these:

- the generator could not inspect metadata from the database
- the field name did not match any heuristic
- the expression needs explicit `@return` or `@returnFunction`

Try:

- confirming the DB connection is working
- aliasing complex expressions
- adding `customTypes`
- adding explicit return annotations

## Watch mode does not react

Checks:

- make sure the process is still running
- edit a file inside one of the configured `queryDirs`
- if you changed the config file path, make sure it matches the `--config` path used to start watch mode

## A generated helper function fails at runtime

If you use the built-in helper function, the `mysql2` connection should be configured with:

```ts
namedPlaceholders: true
```

Without that, named SQL parameters such as `:userId` may not execute correctly.

## Two SQL files used to overwrite each other

This now happens only if the files truly resolve to the same relative output path.

The generator preserves the source folder structure under `outputDir`, so files with the same basename in different directories stay separate.

## Templates are not being picked up

Remember the precedence:

1. `--templates`
2. `templateDir` in config
3. `.templates`

Also check the filenames exactly:

- `unified.hbs`
- `interface.hbs`
- `query.hbs`
- `index.hbs`

## Docs build vulnerabilities still appear in `npm audit`

At the moment, the remaining audit items come from the VitePress toolchain and do not have a published fix available in the current dependency chain. The main CLI and generator dependencies were already updated to remove the directly fixable issues.
