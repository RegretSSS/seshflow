# Seshflow v1.4.2

`v1.4.2` is a focused hotfix release for npm-installed CLI users.

## Highlights

- Fixed the published runtime dependency from `@seshflow/cli` to `@seshflow/shared`.
- Restored contract, RPC shell, handoff, and other shared-surface commands for users who install `@seshflow/cli` directly from npm.

## Why this release exists

`@seshflow/cli@1.4.1` referenced shared runtime modules but did not declare `@seshflow/shared` as a published dependency. In local monorepo development this was masked by workspace linking, but npm-installed users could hit runtime failures such as:

```text
Cannot find module '@seshflow/shared/constants/integration.js'
```

`v1.4.2` fixes that packaging issue without changing CLI behavior.

## Scope

This hotfix does **not** add new workflow features. It only restores expected runtime availability for the published CLI package.
