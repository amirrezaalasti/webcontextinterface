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

## GitHub Pages (optional mirror)

**Production hosting is on Vercel:** [webcontextinterface.vercel.app](https://webcontextinterface.vercel.app/)

The workflow [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml) **builds on every push** to `main` (and on PRs) so CI stays green. It does **not** deploy to Pages automatically.

To publish a GitHub Pages mirror:

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
2. **Actions → Website build → Run workflow**, enable **Deploy to GitHub Pages**, run.

Your Pages URL will be:

```text
https://<username>.github.io/<repository-name>/
```

For this repo: [https://amirrezaalasti.github.io/webcontextinterface/](https://amirrezaalasti.github.io/webcontextinterface/) (after the steps above).

## Netlify

Connect the repo and use the included `netlify.toml` (build command and publish directory are preconfigured).

## Vercel

Import the repo; `vercel.json` sets the build command and output folder.

## Manual upload

Upload the contents of `docs/.vitepress/dist` to any static host (S3, Cloudflare Pages, nginx, etc.).
