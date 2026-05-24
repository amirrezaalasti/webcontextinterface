# @webcontextinterface/bridge

Typed action dispatch from agent decisions to live DOM, with **`ActionResult`** feedback.

```bash
npm install @webcontextinterface/bridge
```

```typescript
import { WciBridge } from '@webcontextinterface/bridge';

const bridge = new WciBridge();
await bridge.fill('email-input', 'user@example.com');
```

**Documentation:** [API reference](https://webcontextinterface.vercel.app/api/bridge) · [Action protocol](https://webcontextinterface.vercel.app/action-protocol) · [WCI site](https://webcontextinterface.vercel.app/)
