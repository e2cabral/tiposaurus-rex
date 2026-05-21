# Configuration

Tiposaurus Rex reads a JSON config file, usually named `tiposaurus.config.json`.

## Full schema

```json
{
  "db": {
    "host": "localhost",
    "user": "root",
    "password": "secret",
    "database": "my_app_db",
    "port": 3306
  },
  "queryDirs": ["src/queries", "modules/billing/queries"],
  "outputDir": "src/generated",
  "templateDir": ".templates",
  "customTypes": {
    "decimal": "string",
    "json": "Record<string, unknown>"
  }
}
```

## Properties

### `db`

Database connection settings used for schema and query metadata inspection.

Fields:

- `host`: MySQL host
- `user`: MySQL user
- `password`: MySQL password
- `database`: default database/schema name
- `port`: optional, defaults to `3306`

### `queryDirs`

Array of folders scanned recursively for `.sql` files.

Example:

```json
{
  "queryDirs": ["src/queries", "packages/api/sql"]
}
```

### `outputDir`

Base directory where generated `.ts` files are written.

The generator keeps the relative path from the source query directory to avoid filename collisions.

### `templateDir`

Optional default template directory for generation.

If omitted, the CLI falls back to `.templates` in the current working directory.

This can be overridden per run with `--templates`.

### `customTypes`

Optional map of SQL types to TypeScript types.

Examples:

```json
{
  "customTypes": {
    "decimal": "string",
    "bigint": "string",
    "json": "MyJsonDocument",
    "tinyint(1)": "boolean"
  }
}
```

The mapper checks both the exact SQL type and its base type. So a rule for `varchar` applies to `varchar(255)` as well.

## Security recommendations

- keep the config file out of version control
- prefer local or staging credentials during generation
- use a separate config file per environment when needed

Example:

```bash
npx tiposaurus generate --config config/tiposaurus.staging.json
```

## Path resolution

- `queryDirs`, `outputDir`, and `templateDir` are treated as filesystem paths
- relative paths are resolved from the current working directory where the CLI is executed

## Validation

The config is validated with Zod before generation starts. Invalid or missing fields stop the command early with a config error.
