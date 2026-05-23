# Deploy the documentation website

The WCI docs are a static site built with [VitePress](https://vitepress.dev), bundled with the interactive demo.

## Live sites

| Host | URL | Base path |
|------|-----|-----------|
| **Vercel** (root paths) | [webcontextinterface.vercel.app](https://webcontextinterface.vercel.app/) | `/` |
| **GitHub Pages** | [amirrezaalasti.github.io/webcontextinterface](https://amirrezaalasti.github.io/webcontextinterface/) | `/webcontextinterface/` |

Demo paths: `/demo/` on Vercel · `/webcontextinterface/demo/` on GitHub Pages.

---

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

---

## Production build

```bash
npm run website:build
```

Output directory: `docs/.vitepress/dist`

| Path | Content |
|------|---------|
| `/` | Documentation (guides, API reference) |
| `/demo/` | Interactive demo (built from `demo/`) |

### Custom base path (GitHub project Pages)

```bash
DOCS_BASE=/webcontextinterface/ npm run website:build
```

The demo is published at `/webcontextinterface/demo/`. The GitHub Actions workflow sets this automatically via `GITHUB_REPOSITORY`.

### Root base path (Vercel)

```bash
DOCS_BASE=/ npm run website:build
```

Vercel sets `DOCS_BASE=/` in [`vercel.json`](../vercel.json).

---

## GitHub Pages

### One-time enable (required)

If deploy fails with **404 / Failed to create deployment**, Pages is not enabled yet:

1. Open [github.com/amirrezaalasti/webcontextinterface/settings/pages](https://github.com/amirrezaalasti/webcontextinterface/settings/pages)
2. Under **Build and deployment → Source**, select **GitHub Actions** (not “Deploy from a branch”)
3. Save

### Automatic deploy

On every push to `main`, [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml):

1. Runs `npm ci` and `node scripts/build-website.mjs` with `GITHUB_REPOSITORY` (subpath build)
2. Uploads `docs/.vitepress/dist` and deploys via `actions/deploy-pages@v4`

Pull requests only **build** (no deploy).

Manual re-run: **Actions → Deploy website (GitHub Pages) → Run workflow**

### Set repo Website link on GitHub

```bash
gh repo edit --homepage https://amirrezaalasti.github.io/webcontextinterface/
```

Or **Settings → General → Website** → `https://amirrezaalasti.github.io/webcontextinterface/`

---

## Vercel

Import the repo at [vercel.com](https://vercel.com); [`vercel.json`](../vercel.json) sets:

- **Build command:** `npm run website:build`
- **Output directory:** `docs/.vitepress/dist`
- **Env:** `DOCS_BASE=/` (root paths; demo at `/demo/`)

Vercel and GitHub Pages use different base paths — each platform runs its own build with the correct `DOCS_BASE`.

---

## Netlify

Connect the repo and use the included `netlify.toml` (build command and publish directory are preconfigured).

---

## Manual upload

Upload the contents of `docs/.vitepress/dist` to any static host (S3, Cloudflare Pages, nginx, etc.).
