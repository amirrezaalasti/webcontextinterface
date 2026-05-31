# WCI npm packages

Monorepo packages published as `@webcontextinterface/*` on npm.

| Package | Version | Description |
|---------|---------|-------------|
| [`@webcontextinterface/spec`](./spec) | 1.1.0 | WCI 1.0 types and `readWciNodeSpec` |
| [`@webcontextinterface/distiller`](./distiller) | 1.1.0 | DOM pruning and LLM context serialization |
| [`@webcontextinterface/bridge`](./bridge) | 1.1.0 | Typed action dispatch + policy enforcement |
| [`@webcontextinterface/context`](./context) | 1.1.0 | `wci.txt` / `wci.json` / `wci.md` loader |
| [`@webcontextinterface/core`](./core) | 1.1.0 | All-in-one SDK |

## Build

```bash
npm run build
```

Build order is enforced by the root `package.json` script (spec → distiller → bridge → context → core).

## Publish

```bash
# Verify tarball contents without publishing
npm run publish:packages -- --dry-run

# Publish to npm (requires npm login or NPM_TOKEN)
npm run publish:packages -- --otp=123456
```

Packages publish in dependency order. Each package runs `prepublishOnly` → `npm run build` automatically.

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Install for agents

```bash
npm install @webcontextinterface/core
```

Or install layers individually to minimize bundle size.

## Documentation

- [WCI site](https://webcontextinterface.vercel.app/)
- [Getting started](https://webcontextinterface.vercel.app/getting-started)
- Per-package README files in each subdirectory
