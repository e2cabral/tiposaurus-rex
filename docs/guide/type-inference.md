# Type Inference

Tiposaurus Rex uses two layers of inference: live database metadata first, heuristics second.

## 1. Database metadata

When the generator can reach MySQL, it attempts to inspect the query result metadata directly.

That gives it better information for:

- aggregate functions like `COUNT(*)`
- computed expressions
- join-driven nullability
- SQL-native data types such as `JSON`, `DECIMAL`, `BLOB`, and `DATETIME`

For simple `SELECT` queries, the adapter appends `LIMIT 0` when possible to fetch metadata without reading rows.

## 2. Heuristic fallback

If metadata is not available for a field, the generator falls back to name-based inference.

Common patterns:

- `id`, `user_id`, `orderId` -> `number`
- `created_at`, `updated_at`, `startDate` -> `Date`
- `is_active`, `has_items`, `enabled` -> `boolean`
- `email`, `name`, `description`, `slug`, `token` -> `string`

If neither metadata nor heuristics can classify the field confidently, the fallback type is `any`.

## SQL type mapping

Built-in mappings include:

- numeric SQL types -> `number`
- `varchar`, `text`, `char`, `enum`, `set` -> `string`
- `date`, `datetime`, `timestamp` -> `Date`
- `blob`, `binary`, `varbinary` -> `Buffer`
- `json` -> `any`

You can override these mappings with `customTypes`.

## Function inference

Known SQL functions are mapped by intent when possible.

Examples:

- `COUNT(*)` -> `number`
- `SUM(total)` -> `number`
- `CONCAT(first_name, ' ', last_name)` -> `string`
- `NOW()` -> `Date`
- `JSON_OBJECT(...)` -> `Record<string, any>`

## Nullability

When MySQL provides column flags, Tiposaurus Rex marks nullable properties as optional properties in the generated interface.

Example:

```ts
export interface UserSummary {
  id: number;
  lastLoginAt?: Date;
}
```

## Alias handling

For stable TypeScript output, alias your projected columns explicitly whenever possible.

Preferred:

```sql
SELECT
  u.id AS userId,
  o.total AS orderTotal
FROM users u
JOIN orders o ON o.user_id = u.id;
```

This keeps the generated property names predictable.

## When to use explicit annotations

You should add `@return` or `@returnFunction` when:

- the query uses many joins
- you need a very specific property name
- the SQL expression is complex enough that fallback heuristics would be weak
- you want fully stable output even if SQL formatting changes
