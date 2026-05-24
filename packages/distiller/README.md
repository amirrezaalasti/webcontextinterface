# @webcontextinterface/distiller

Prune annotated DOM and serialize **WciView** (JSON) or Markdown for LLM context.

```bash
npm install @webcontextinterface/distiller
```

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const view = new WciDistiller({ scope: 'checkout' }).distilJSON(document);
```

**Documentation:** [API reference](https://webcontextinterface.vercel.app/api/distiller) · [Distillation guide](https://webcontextinterface.vercel.app/distillation) · [WCI site](https://webcontextinterface.vercel.app/)
