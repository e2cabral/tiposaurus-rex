# CLI Reference

Tiposaurus Rex currently exposes two top-level commands: `init` and `generate`.

## Global usage

```bash
tiposaurus-rex [options] [command]
```

The package is usually invoked through `npx tiposaurus` after installation, because the published `bin` name is `tiposaurus`.

## Global options

- `-v, --verbose`: enables structured logs in addition to the CLI status messages
- `-h, --help`: prints help
- `-V, --version`: prints the CLI version

## `init`

Creates or refreshes project configuration interactively.

```bash
tiposaurus init [options]
```

### Options

- `-c, --config <path>`: output path for the config file

### What it does

- shows the CLI banner
- reads an existing config when present to prefill defaults
- asks for database and folder settings
- writes the config file
- creates query and output directories
- optionally creates the default `.templates` folder
- ensures the chosen config path is listed in `.gitignore`

### Example

```bash
npx tiposaurus init
npx tiposaurus init --config ./config/tiposaurus.local.json
```

## `generate`

Generates code from SQL files.

```bash
tiposaurus generate [options]
```

### Options

- `-c, --config <path>`: path to the config file. Default: `tiposaurus.config.json`
- `-o, --output <dir>`: override `outputDir` for the current run
- `-t, --templates <dir>`: override the template directory for the current run
- `-w, --watch`: watch SQL/config changes and regenerate automatically

### Template directory precedence

When generating, the CLI resolves templates in this order:

1. `--templates`
2. `templateDir` from `tiposaurus.config.json`
3. `.templates` in the current working directory

### What happens during generation

1. the config is loaded and validated
2. a MySQL connection is opened
3. each configured query directory is scanned recursively for `.sql` files
4. each file is parsed into one or more query definitions
5. result and table metadata are enriched
6. templates are rendered and formatted with Prettier
7. generated files are written to the output directory

### Output path behavior

The generator preserves the relative folder structure of each SQL file inside `outputDir`.

Example:

- source: `src/queries/users/find-one.sql`
- output: `src/generated/users/find-one.ts`

This avoids collisions between files that share the same basename in different folders.

## Watch mode

Watch mode is intended for local development.

```bash
npx tiposaurus generate --watch
```

It watches:

- the configured SQL directories
- the config file path passed to the command

If the config file changes, the generator reloads it and updates the database connection settings before running again.

## Exit behavior

- configuration, SQL parsing, and generation errors are shown in the terminal
- the process exits with code `1` on fatal command failure
- watch mode keeps the process alive until you stop it manually
