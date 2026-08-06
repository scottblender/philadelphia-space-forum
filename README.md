# Philadelphia Space Forum

Static React/Next.js website for Philadelphia's community of space researchers,
builders, policymakers, and enthusiasts.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the site
whenever the default `main` branch changes. It automatically accounts for a
repository-name URL such as `https://username.github.io/repository-name/`.

After pushing the repository to GitHub, open **Settings → Pages** and choose
**GitHub Actions** as the publishing source. Future pushes to `main` will deploy
automatically.

To verify the static build locally:

```bash
npm run build:pages
```

The generated site is written to `out/`.
