# @webcontextinterface/context

Load `wci.txt`, `wci.json`, and `wci.md`; enforce scopes with **`PolicyEngine`**.

```bash
npm install @webcontextinterface/context
```

```typescript
import { WciContextLoader } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load('https://example.com');
ctx.policy.assertScopeAllowed('registration-form');
```

**Documentation:** [API reference](https://webcontextinterface.vercel.app/api/context) · [Site policy](https://webcontextinterface.vercel.app/site-policy) · [WCI site](https://webcontextinterface.vercel.app/)
