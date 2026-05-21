# Examples

This page collects realistic SQL and TypeScript usage patterns.

## Single-row lookup

```sql
/*
  @name FindUserById
  @param userId: number
  @returnType FindUserByIdResult
  @returnSingle true
*/
SELECT
  id,
  email,
  first_name AS firstName
FROM users
WHERE id = :userId;
```

## Joined projection

```sql
/*
  @name ListRecentOrders
  @returnType RecentOrder
  @return orders.id to orderId
  @return users.email to customerEmail
  @return orders.total to total
  @return orders.created_at to createdAt: Date
  @returnSingle false
*/
SELECT
  o.id,
  u.email,
  o.total,
  o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC;
```

## Aggregate dashboard query

```sql
/*
  @name GetDashboardSummary
  @returnType DashboardSummary
  @returnFunction totalUsers: COUNT(*)
  @returnFunction avgAge: AVG(age)
  @returnSingle true
*/
SELECT
  COUNT(*) AS totalUsers,
  AVG(age) AS avgAge
FROM users;
```

## JSON column mapping

Config:

```json
{
  "customTypes": {
    "json": "Record<string, unknown>"
  }
}
```

SQL:

```sql
/*
  @name ListFeatureFlags
  @returnType FeatureFlagRow
*/
SELECT id, payload
FROM feature_flags;
```

## Runtime usage with a pool

```ts
import mysql from 'mysql2/promise';
import {
  listRecentOrdersQuery,
  RecentOrder,
} from './generated/orders/list-recent-orders';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'app_db',
  namedPlaceholders: true,
});

export async function listRecentOrders(): Promise<RecentOrder[]> {
  const [rows] = await pool.execute(listRecentOrdersQuery);
  return rows as RecentOrder[];
}
```

## Development loop with watch mode

```bash
# terminal 1
npx tiposaurus generate --watch

# terminal 2
npm run dev
```

As you add or rename projected columns, the generated TypeScript files update in place.
