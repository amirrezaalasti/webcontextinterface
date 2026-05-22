# @wci/bridge

Typed action dispatch from agent decisions to live DOM, with **`ActionResult`** feedback.

```bash
npm install @wci/bridge
```

```typescript
import { WciBridge } from '@wci/bridge';

const bridge = new WciBridge();
await bridge.fill('email-input', 'user@example.com');
```

**Documentation:** [docs/api/bridge.md](../../docs/api/bridge.md) · [Action protocol](../../docs/action-protocol.md)
