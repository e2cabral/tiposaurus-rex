# Tiposaurus Rex

Tiposaurus Rex is a CLI that generates TypeScript code from annotated MySQL SQL files.

It is built for teams that want to keep writing raw SQL while still getting:

- typed query result interfaces
- typed parameter interfaces
- generated query constants
- optional helper execution functions
- database-aware type inference

## Who it is for

Tiposaurus Rex is a good fit when you want:

- raw SQL checked into the repository
- strong TypeScript support without moving to an ORM
- a build-time generator instead of a runtime abstraction layer
- customizable generated output through templates

## Current scope

- database support: MySQL-focused
- input: `.sql` files with lightweight annotations
- output: generated `.ts` files

## Installation

Install as a development dependency:

```bash
npm install -D tiposaurus-rex
```

You can also install it globally:

```bash
npm install -g tiposaurus-rex
```

## Quick Start

### 1. Initialize the project

```bash
npx tiposaurus init
```

This creates `tiposaurus.config.json`, optionally creates default templates, and adds the config file to `.gitignore` when needed.

### 2. Configure the database

Example config:

```json
{
  "db": {
    "host": "localhost",
    "user": "root",
    "password": "secret",
    "database": "app_db",
    "port": 3306
  },
  "queryDirs": ["src/queries"],
  "outputDir": "src/generated",
  "templateDir": ".templates",
  "customTypes": {
    "decimal": "string"
  }
}
```

Security note:

`tiposaurus.config.json` may contain credentials and should stay out of version control.

### 3. Create an SQL file

`src/queries/find-user.sql`

```sql
/*
  @name FindUserById
  @description Fetch a single user
  @param userId: number
  @returnType FindUserByIdResult
  @returnSingle true
*/
SELECT
  id,
  email,
  first_name AS firstName,
  is_active AS isActive
FROM users
WHERE id = :userId;
```

### 4. Generate the TypeScript output

```bash
npx tiposaurus generate
```

## What gets generated

Depending on your templates and annotations, the generated file can include:

- result interfaces
- parameter interfaces
- SQL string constants
- helper execution functions
- custom interfaces derived from explicit return annotations

Typical example:

```ts
export interface FindUserByIdResult {
  id: number;
  email: string;
  firstName: string;
  isActive: boolean;
}

export interface FindUserByIdParams {
  userId: number;
}

export const findUserByIdQuery = `SELECT ...`;
```

## Runtime usage

The generated query constants work well with `mysql2/promise`.

```ts
import mysql from 'mysql2/promise';
import {
  findUserByIdQuery,
  FindUserByIdResult,
} from './generated/find-user';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'app_db',
  namedPlaceholders: true,
});

const [rows] = await pool.execute(findUserByIdQuery, { userId: 1 });
const users = rows as FindUserByIdResult[];
```

Important:

The built-in generated helper functions are intended for `mysql2` connections configured with `namedPlaceholders: true`.

## CLI

### `init`

Interactive project setup.

```bash
npx tiposaurus init
```

### `generate`

Generate code from SQL files.

```bash
npx tiposaurus generate [options]
```

Options:

- `-c, --config <path>`: config file path
- `-o, --output <dir>`: override output directory
- `-t, --templates <dir>`: override template directory
- `-w, --watch`: regenerate on file changes

## Watch mode

```bash
npx tiposaurus generate --watch
```

Watch mode monitors:

- SQL files under `queryDirs`
- the config file used for the current run

## Configuration summary

Supported top-level config fields:

- `db`
- `queryDirs`
- `outputDir`
- `templateDir`
- `customTypes`

## Templates

Tiposaurus Rex uses Handlebars for code generation.

Template resolution order:

1. `--templates`
2. `templateDir` in config
3. `.templates`

Supported filenames:

- `unified.hbs`
- `interface.hbs`
- `query.hbs`
- `index.hbs`

## Type inference

Tiposaurus Rex uses two strategies:

1. live MySQL metadata, when available
2. heuristic inference from field names and known SQL functions

Examples:

- `id`, `user_id` -> `number`
- `created_at` -> `Date`
- `is_active` -> `boolean`
- `COUNT(*)` -> `number`

## Documentation

Full docs in the repository:

- [Getting Started](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/getting-started.md)
- [CLI Reference](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/cli.md)
- [Configuration](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/configuration.md)
- [SQL Annotations](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/sql-annotations.md)
- [Templates](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/templates.md)
- [Generated Output](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/generated-output.md)
- [Runtime Usage](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/runtime-usage.md)
- [Troubleshooting](https://github.com/e2cabral/tiposaurus-rex/blob/main/docs/guide/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](https://github.com/e2cabral/tiposaurus-rex/blob/main/CONTRIBUTING.md).

## License

MIT. See [LICENSE](https://github.com/e2cabral/tiposaurus-rex/blob/main/LICENSE).
