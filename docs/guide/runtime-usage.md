# Runtime Usage

This page focuses on consuming the generated code inside your application.

## Using `mysql2`

The simplest runtime target is `mysql2/promise`.

### Recommended pool setup

```ts
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  namedPlaceholders: true,
});
```

## Manual execution with generated query constants

```ts
import { pool } from './db';
import {
  findUserByIdQuery,
  FindUserByIdParams,
  FindUserByIdResult,
} from './generated/find-user';

export async function findUserById(params: FindUserByIdParams) {
  const [rows] = await pool.execute(findUserByIdQuery, params);
  return rows as FindUserByIdResult[];
}
```

This is the most explicit style and is often the easiest to adapt to your repository or service layer.

## Using the generated helper function

If you keep the built-in query template, you also get an execution helper.

```ts
import { pool } from './db';
import { findUserById } from './generated/find-user';

const result = await findUserById(pool, { userId: 123 });
```

## Repository pattern example

```ts
import { injectable } from 'inversify';
import mysql from 'mysql2/promise';
import {
  listUsersQuery,
  ListUsersResult,
} from '../generated/users/list-users';

@injectable()
export class UserRepository {
  constructor(private readonly db: mysql.Pool) {}

  async listUsers(): Promise<ListUsersResult[]> {
    const [rows] = await this.db.execute(listUsersQuery);
    return rows as ListUsersResult[];
  }
}
```

## Express route example

```ts
import { Request, Response } from 'express';
import { userRepository } from '../repositories/user-repository';

export async function getUsers(_req: Request, res: Response) {
  const users = await userRepository.listUsers();
  res.json(users);
}
```

## Notes on parameter ordering

The generated code is intended for named placeholders, not manual positional arrays.

Prefer:

```ts
await pool.execute(findUserByIdQuery, { userId: 1 });
```

Instead of:

```ts
await pool.execute(findUserByIdQuery, [1]);
```

unless you fully control the query transformation yourself through custom templates.
