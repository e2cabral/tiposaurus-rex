# Getting Started

This guide walks through the full first-run experience, from installation to using the generated output in code.

## 1. Install the package

```bash
npm install -D tiposaurus-rex
```

You can also install it globally, but using it as a dev dependency keeps the version pinned with the project.

## 2. Initialize the project

Run the interactive setup:

```bash
npx tiposaurus init
```

The prompt asks for:

1. database host
2. database user
3. database password
4. database name
5. query directories
6. generated output directory
7. whether default templates should be created

This creates `tiposaurus.config.json` and adds it to `.gitignore` when needed.

## 3. Review the generated config

Example:

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
  "outputDir": "src/generated"
}
```

## 4. Create your first SQL file

Create `src/queries/find-user.sql`:

```sql
/*
  @name FindUserById
  @description Fetch a single user by id
  @param userId: number
  @returnType FindUserByIdResult
  @returnSingle true
*/
SELECT
  u.id,
  u.email,
  u.first_name AS firstName,
  u.is_active AS isActive
FROM users u
WHERE u.id = :userId;
```

## 5. Generate the TypeScript output

```bash
npx tiposaurus generate
```

If everything goes well, the CLI will:

- connect to MySQL
- scan every configured query directory
- parse the SQL files
- infer result and parameter types
- write generated `.ts` files into `outputDir`

## 6. Inspect the generated file

For the example above, you will typically get a file similar to:

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

The exact shape depends on your templates.

## 7. Use the generated code at runtime

### Option A: Use the generated query constant manually

```ts
import mysql from 'mysql2/promise';
import {
  findUserByIdQuery,
  FindUserByIdResult,
} from '../generated/find-user';

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

### Option B: Use the generated helper function

The built-in query helper expects a `mysql2` connection configured with `namedPlaceholders: true`.

```ts
import mysql from 'mysql2/promise';
import { findUserById } from '../generated/find-user';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'app_db',
  namedPlaceholders: true,
});

const user = await findUserById(connection, { userId: 1 });
```

## 8. Enable watch mode during development

```bash
npx tiposaurus generate --watch
```

Watch mode monitors:

- changes in SQL files under `queryDirs`
- changes in the config file passed with `--config`

## Recommended next reads

- [CLI Reference](./cli)
- [Configuration](./configuration)
- [SQL Annotations](./sql-annotations)
- [Generated Output](./generated-output)
- [Runtime Usage](./runtime-usage)
