# SQL Annotations

Annotations tell Tiposaurus Rex how to name and shape the generated TypeScript output.

They live inside SQL comments and are read before the SQL body is processed.

## Supported annotations

### `@name`

Required. Defines the base identifier for the query.

```sql
/* @name FindUserById */
SELECT * FROM users WHERE id = :userId;
```

### `@description`

Optional. Adds a human-readable description that can be used by templates.

```sql
/* @description Fetch a single user */
```

### `@param`

Optional but recommended. Declares a parameter and its intended type.

Syntax:

```sql
/* @param userId: number */
```

If the type is omitted, it defaults to `any`.

### `@returnType`

Optional. Controls the generated result interface name.

```sql
/* @returnType UserSummary */
```

If omitted, the default is `any`.

### `@returnSingle`

Optional. Controls whether the generated result type is treated as a single item or an array.

```sql
/* @returnSingle true */
/* @returnSingle false */
```

### `@return`

Optional. Declares a result field explicitly.

Syntax patterns:

```sql
/* @return users.id */
/* @return users.id to userId */
/* @return users.created_at to createdAt: Date */
```

Use `@return` when you want to:

- force stable aliases
- help the parser with ambiguous expressions
- override the inferred TypeScript type

### `@returnFunction`

Optional. Declares a result field based on an SQL function or expression.

Syntax:

```sql
/* @returnFunction totalUsers: COUNT(*) */
/* @returnFunction totalAmount: SUM(o.total) */
```

## Recommended format

Use block comments for metadata:

```sql
/*
  @name FindUserById
  @description Fetch a user
  @param userId: number
  @returnType FindUserByIdResult
  @returnSingle true
*/
SELECT *
FROM users
WHERE id = :userId;
```

Block comments are the most resilient choice when SQL formatters or IDE extensions are active.

## Single-line comments

Single-line comments are also supported:

```sql
-- @name FindUserById
-- @param userId: number
SELECT * FROM users WHERE id = :userId;
```

## Multiple queries per file

A single `.sql` file can contain multiple annotated queries.

```sql
/* @name FindUser */
SELECT * FROM users WHERE id = :userId;

/* @name ListUsers */
SELECT id, email FROM users;
```

Each `@name` starts a new query block.

## Named parameters

Tiposaurus Rex expects SQL parameters in `:paramName` form:

```sql
WHERE id = :userId
  AND status = :status
```

The generated helper function is designed for `mysql2` connections configured with `namedPlaceholders: true`.

## Practical advice

- always include `@name`
- include `@param` for every named placeholder you expect consumers to pass
- include `@returnType` for stable generated interface names
- use `@return` and `@returnFunction` for joins, aggregates, or custom aliases
