# Advanced Usage

This page covers patterns that become useful once the basic flow is already working.

## Multiple query roots

You can scan multiple parts of a monorepo or modular codebase:

```json
{
  "queryDirs": [
    "packages/api/src/queries",
    "packages/billing/src/queries",
    "packages/reporting/src/sql"
  ],
  "outputDir": "packages/shared/generated"
}
```

Because the relative path is preserved, generated files stay separated cleanly.

## Overriding `outputDir` in CI

You may want one config file but different output targets per environment:

```bash
npx tiposaurus generate --output tmp/generated
```

## Overriding templates per run

Use one config for the team, but swap templates for experiments:

```bash
npx tiposaurus generate --templates .templates/experimental
```

## Fine-tuning `customTypes`

### Monetary values as strings

```json
{
  "customTypes": {
    "decimal": "string",
    "newdecimal": "string"
  }
}
```

### Stronger JSON typing

```json
{
  "customTypes": {
    "json": "Record<string, unknown>"
  }
}
```

### Domain-specific aliases

```json
{
  "customTypes": {
    "tinyint(1)": "boolean",
    "bigint": "string"
  }
}
```

## Using explicit return annotations for complex queries

When a query contains many expressions, add explicit return metadata:

```sql
/*
  @name GetRevenueSummary
  @returnType RevenueSummary
  @returnFunction totalOrders: COUNT(*)
  @returnFunction totalRevenue: SUM(o.total)
  @returnFunction averageTicket: AVG(o.total)
  @returnSingle true
*/
SELECT
  COUNT(*) AS totalOrders,
  SUM(o.total) AS totalRevenue,
  AVG(o.total) AS averageTicket
FROM orders o;
```

## Using unified templates for alternate code styles

Unified templates are ideal when you want:

- no helper functions
- ESM-only or CJS-only shaped output
- Zod schemas next to interfaces
- framework-specific wrappers

## CI pipeline pattern

Typical CI order:

```bash
npm ci
npx tiposaurus generate
npm run lint
npm run typecheck
npm test
npm run build
```

If generation depends on a database, use a safe staging or ephemeral schema in CI.
