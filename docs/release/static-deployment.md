# Static Deployment

## Build

```text
npm run build
```

Deploy the generated `dist/` directory as a static HTTPS site.

## Current Hosting Model

- Hosting type: static HTTPS site
- Backend: not required for the current public Research Beta
- Accounts or hosted PazAtlas database: not required
- Production-domain verification: UniProt, AlphaFold DB, RCSB PDB, and SIFTS-associated browser requests

## SPA Fallback

The app uses client-side History API navigation. The host must rewrite these paths to `index.html`:

```text
/protein-studio
/sequence-tools
/how-pazatlas-works
/about
```

The rewrite must serve the application shell without changing the browser URL. An unknown path that reaches the app is rendered as PazAtlas's in-app “Page not found” state.

## Vercel

The repository includes [`vercel.json`](../../vercel.json) with the minimum SPA rewrite needed for History API routes. Vercel serves existing static files before that rewrite, including the packaged EGFR coordinate asset. See [`vercel-deployment.md`](./vercel-deployment.md) for dashboard settings and [`vercel-smoke-test.md`](./vercel-smoke-test.md) for post-deploy validation.

## Provider Notes

Use the selected provider's documented SPA fallback configuration:

- Cloudflare Pages: configure the Pages project to serve the SPA shell for non-file routes. A `_redirects` fallback is not required if the provider's SPA behavior is enabled; verify direct refreshes on the deployed URL.
- Netlify: add a single-page fallback rewrite such as `/* /index.html 200` if the site is not automatically treated as an SPA.
- Vercel: add a rewrite from `/(.*)` to `/index.html` if the project is not using the framework preset's SPA fallback.

Do not add provider-specific files until a provider is selected.

## Domain

No domain is hardcoded. Add the selected custom domain only in the hosting provider and registrar configuration, then enable managed TLS. The app has no required `PUBLIC_SITE_URL` value at this time.
