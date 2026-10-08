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

### Custom domain

Set `philadelphiaspaceforum.org` in the repository's **Settings → Pages →
Custom domain**. Configure the domain's DNS with GitHub Pages' four apex A
records and a `www` CNAME pointing to `scottblender.github.io`.

After changing the domain, run **Actions → Deploy Next.js site to Pages →
Run workflow** on `main`. The workflow reads `configure-pages`' current
`base_path`, so the build uses `/philadelphia-space-forum` at the default
address and an empty prefix at the custom domain. Enable **Enforce HTTPS**
in Pages settings once GitHub makes it available.

To verify the custom-domain build locally:

```bash
GITHUB_REPOSITORY=scottblender/philadelphia-space-forum PAGES_BASE_PATH='' npm run test:pages
```

## Content and components

- Add events in `app/data/events.ts`. Each `EventCard` shows its location,
  synopsis, speaker bio, and registration link, with a stateful topics disclosure.
  Event status updates in the browser from the start/end timestamps; set
  `status: "cancelled"` to mark a cancellation and hide registration.
- Add cofounders or other team members in `app/data/team.ts`. `TeamMember`
  renders each person's photo, role, and bio. Store photos in `public/team/`.
- `/events/` is the event listing; `/about/` introduces the cofounders.
  The former `/calendar/` route remains available for previously shared links.
- Brand colors and Inter/IBM Plex Mono typography are defined in
  `app/globals.css`. The repeating SVG starfield fills any viewport.

Verify the Pages export, including repository-prefixed links and assets:

```bash
GITHUB_REPOSITORY=scottblender/philadelphia-space-forum npm run test:pages
```

`npm test` checks rendered routes and event lifecycle boundaries using the
existing Sites build.
