# Deploy the documentation website

The WCI docs are a static site built with [VitePress](https://vitepress.dev), optionally bundled with the interactive demo.

## Local development

```bash
# Documentation only (http://localhost:5174)
npm run docs:dev

# Interactive demo only (http://localhost:5173)
npm run demo

# Full static website (docs + demo at /demo/)
npm run website:build
npm run website:preview   # http://localhost:4173 (or port shown in terminal)
```

During `docs:dev`, open the demo at [http://localhost:5173](http://localhost:5173) while the docs run on port 5174.

## Production build

```bash
npm run website:build
```

Output directory: `docs/.vitepress/dist`

| Path | Content |
|------|---------|
| `/` | Documentation (guides, API reference) |
| `/demo/` | Interactive demo (built from `demo/`) |

### Custom base path

For hosting under a subpath (e.g. GitHub project pages):

```bash
DOCS_BASE=/WIA_framework/ npm run website:build
```

The demo is published at `/WIA_framework/demo/`.

## GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` — the workflow `.github/workflows/deploy-website.yml` builds and deploys automatically.

Your site URL will be:

```text
https://<username>.github.io/<repository-name>/
```

## Netlify

Connect the repo and use the included `netlify.toml` (build command and publish directory are preconfigured).

## Vercel

Import the repo; `vercel.json` sets the build command and output folder.

## Manual upload

Upload the contents of `docs/.vitepress/dist` to any static host (S3, Cloudflare Pages, nginx, etc.).
