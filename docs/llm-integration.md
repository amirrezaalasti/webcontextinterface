# LLM integration

This guide sketches a **closed loop**: load policy → distil page → LLM plans action → bridge executes → re-distil.

## System prompt template

```markdown
You are an agent for {{site.name}}.

{{wci.md contents}}

Rules:
- Only use node IDs from the distilled view.
- Respect denied scopes: {{denied}}.
- Scopes requiring human confirmation: {{confirm}} — ask the user first.
- On ActionResult.error, read `hint` and adjust; do not retry denied scopes.
```

Load with:

```typescript
const ctx = await WciContextLoader.load(origin);
const system = buildPrompt(ctx);
```

## Tool / function schema (example)

```json
{
  "name": "wci_dispatch",
  "description": "Interact with an WCI-annotated page",
  "parameters": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "action": { "enum": ["click", "fill", "select", "check", "submit", "navigate", "focus", "clear"] },
      "value": {}
    },
    "required": ["nodeId", "action"]
  }
}
```

Handler:

```typescript
async function handleToolCall(args: ActionRequest) {
  ctx.policy.assertScopeAllowed(inferScope(args.nodeId)); // from manifest or node.scope
  return bridge.dispatch(args);
}
```

## Context window strategy

1. **Static** — `wci.md` + `wci.json` task flow (small)
2. **Per turn** — `distiller.distilJSON()` for current scope only
3. **Feedback** — append last `ActionResult` JSON (success, `stateChange`, `sideEffects`, or `error`)

```typescript
const messages = [
  { role: 'system', content: system },
  { role: 'user', content: distiller.distilJSON(scopeRoot) },
  { role: 'user', content: JSON.stringify(lastResult) },
];
```

## Error handling

| `error.code` | Agent behavior |
|--------------|----------------|
| `NODE_NOT_FOUND` | Re-distil; page may have navigated |
| `PRECONDITION_UNMET` | Complete prerequisite fields first |
| `SCOPE_DENIED` | Stop; inform user (from PolicyEngine) |
| `UNKNOWN_ERROR` | Try alternate action or ask user |

## Rate limits

Parse `Rate-Limit-Actions` and `Rate-Limit-Distil` from `wci.txt` and throttle client-side before calling Bridge or Distiller.

## Server-side distillation

For SSR or crawlers without a browser, run `pruneDOM` + `serializeJSON` in jsdom (or emit HTML with attributes server-side and distil at the edge). The demo runs client-side only.

## See also

- [Getting started](./getting-started.md)
- [Action protocol](./action-protocol.md)
