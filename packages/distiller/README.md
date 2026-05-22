# @wci/distiller

Prune annotated DOM and serialize **WciView** (JSON) or Markdown for LLM context.

```bash
npm install @wci/distiller
```

```typescript
import { WciDistiller } from '@wci/distiller';

const view = new WciDistiller({ scope: 'checkout' }).distilJSON(document);
```

**Documentation:** [docs/api/distiller.md](../../docs/api/distiller.md) · [Distillation guide](../../docs/distillation.md)
