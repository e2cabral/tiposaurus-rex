# Templates

Tiposaurus Rex renders code with Handlebars templates.

You can rely on the built-in templates or replace them with your own files.

## Resolution order

During generation, the template directory comes from:

1. `--templates`
2. `templateDir` in config
3. `.templates`

## Supported template files

### `unified.hbs`

If this file exists, it is used as the single source of output for the generated file.

This is the highest-level customization option.

### Partial file strategy

If `unified.hbs` does not exist, Tiposaurus Rex renders these files individually when present:

- `interface.hbs`
- `query.hbs`
- `index.hbs`

When any of them is missing, the built-in fallback template for that file is used automatically.

## Available context

At render time, templates can receive:

- `timestamp`
- `tables`
- `queries`
- `customInterfaces`
- `inSingleFile`

### Table fields

Each table entry contains:

- `tableName`
- `interfaceName`
- `fields`

Each field contains:

- `name`
- `type`
- `nullable`

### Query fields

Each query entry can contain:

- `name`
- `description`
- `sql`
- `params`
- `returnType`
- `returnSingle`
- `returnFields`
- `customTypes`

## Built-in Handlebars helpers

The default template engine registers these helpers:

- `capitalize`
- `singular`
- `pascalCase`
- `camelCase`
- `isArray`
- `baseType`

## Example `unified.hbs`

```handlebars
{{#if customInterfaces}}
{{#each customInterfaces}}
{{{this}}}

{{/each}}
{{/if}}

{{#each queries}}
export interface {{pascalCase name}}Params {
{{#each params}}
  {{name}}: {{type}};
{{/each}}
}

export const {{camelCase name}}Query = `{{{sql}}}`;
{{/each}}
```

## Example partial override

`.templates/query.hbs`

```handlebars
export interface {{pascalCase query.name}}Params {
{{#each query.params}}
  {{name}}: {{type}};
{{/each}}
}

export const {{camelCase query.name}}Query = `{{{query.sql}}}`;
```

## Recommendations

- start with a single `unified.hbs` only if you want full control
- prefer partial overrides if you want to keep most built-in behavior
- keep generated files deterministic so they diff cleanly in Git
