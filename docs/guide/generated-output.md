# Generated Output

Each `.sql` file produces one `.ts` file in the output directory.

## Path structure

The generator preserves the source file's relative path within its query directory.

Example:

- source query: `src/queries/admin/find-user.sql`
- output file: `src/generated/admin/find-user.ts`

## What a generated file can contain

Depending on the query and template strategy, the generated file can include:

- table interfaces for referenced tables
- custom interfaces built from `@return` and `@returnFunction`
- parameter interfaces
- result aliases and result type aliases
- SQL string constants
- helper execution functions

## Parameter interfaces

These are based on `@param` annotations.

Example:

```ts
export interface FindUserByIdParams {
  userId: number;
}
```

## Result interfaces

These are based on:

- explicit `@returnType`
- optional `@return` and `@returnFunction`
- metadata and heuristic enrichment

Example:

```ts
export interface FindUserByIdResult {
  id: number;
  email: string;
  createdAt?: Date;
}
```

## Query constants

The built-in templates generate a string constant for the SQL:

```ts
export const findUserByIdQuery = `SELECT ...`;
```

## Helper functions

The built-in query template also generates a helper function that accepts:

- a `mysql2` connection
- a typed params object

Important:

The helper expects the runtime connection to support named placeholders.

That means your `mysql2` connection or pool should be created with:

```ts
namedPlaceholders: true
```

## Custom interfaces

When you define result fields explicitly, Tiposaurus Rex can synthesize an interface body and include it in `customInterfaces`.

This is especially useful for aggregate queries and join projections.
