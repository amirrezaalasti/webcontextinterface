# @wci/context

Load `wci.txt`, `wci.json`, and `wci.md`; enforce scopes with **`PolicyEngine`**.

```bash
npm install @wci/context
```

```typescript
import { WciContextLoader } from '@wci/context';

const ctx = await WciContextLoader.load('https://example.com');
ctx.policy.assertScopeAllowed('registration-form');
```

**Documentation:** [docs/api/context.md](../../docs/api/context.md) · [Site policy](../../docs/site-policy.md)
