# Changelog

All notable changes to `@webcontextinterface/*` packages are documented here.

## [1.1.0] — 2026-05-31

### @webcontextinterface/bridge

- **Added** automatic `PolicyEngine` enforcement before every DOM dispatch when policy is attached via constructor `options.policy` or `setPolicy()`.
- **Added** `policy-guard` helpers: `resolveScopeId`, `enforcePolicyForDispatch`, `checkPolicyBeforeDispatch`.
- **Added** `WciBridgeOptions`, `getPolicy()`, optional `policy` argument to `dispatchAction()`.
- **Added** `HUMAN_CONFIRMATION_REQUIRED` action error code.
- **Added** dependency on `@webcontextinterface/context`.

### @webcontextinterface/core

- Re-exports new bridge policy helpers and `WciBridgeOptions`.

### @webcontextinterface/spec, @webcontextinterface/distiller, @webcontextinterface/context

- Documentation and publish metadata updates; no API changes.

## [1.0.0] — initial release

- `@webcontextinterface/spec` — WCI 1.0 types and `readWciNodeSpec`
- `@webcontextinterface/distiller` — `WciDistiller`, JSON/Markdown serialization
- `@webcontextinterface/bridge` — `WciBridge`, `ActionResult` protocol
- `@webcontextinterface/context` — `WciContextLoader`, `PolicyEngine`
- `@webcontextinterface/core` — unified SDK re-export

[1.1.0]: https://github.com/amirrezaalasti/webcontextinterface/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/amirrezaalasti/webcontextinterface/releases/tag/v1.0.0
