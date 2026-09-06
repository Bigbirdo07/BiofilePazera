# PazAtlas Vercel Deployment

PazAtlas is a React + TypeScript + Vite frontend. The public web deployment is a static site; it does not require a backend, API keys, serverless functions, Supabase, or Render.

## Vercel Settings

1. In Vercel, choose **Add New Project** and import the GitHub repository.
2. Use the detected **Vite** framework preset. If Vercel presents **Other**, keep the same commands below.
3. Set **Build Command** to `npm run build`.
4. Set **Output Directory** to `dist`.
5. Leave the install command at Vercel's npm default. This repository currently has no root lockfile.
6. Do not add environment variables for the current build. The app works without a public-site URL variable.
7. Deploy to the temporary `*.vercel.app` URL.
8. Run [`vercel-smoke-test.md`](./vercel-smoke-test.md) against that temporary HTTPS URL.
9. Connect the purchased custom domain only after the temporary deployment passes the smoke test. DNS and Namecheap configuration are intentionally outside this repository.

## SPA Routing

The app uses the browser History API. The root [`vercel.json`](../../vercel.json) rewrites application requests to `/index.html`, which allows direct navigation and refresh for:

- `/`
- `/protein-studio`
- `/sequence-tools`
- `/how-pazatlas-works`
- `/about`

Vercel serves files that exist in the deployment before applying the rewrite, so `/demo-structures/P00533_EGFR_AlphaFold.pdb` remains a static asset. The React app handles unknown application paths with its PazAtlas 404 state.

## Production Checks

The temporary Vercel URL must be used to verify browser-direct CORS behavior for UniProt, AlphaFold DB, and RCSB PDB. Localhost success does not prove production-origin access. These services are requested only after the relevant Protein Studio actions.

The intentional public demo asset is:

```text
/demo-structures/P00533_EGFR_AlphaFold.pdb
```

## Dual-Mode Development

The same repository continues to support both targets:

| Mode | Command / configuration | Result |
|---|---|---|
| Browser development | `npm run dev` | Vite development server |
| Web production | `npm run build` | Static `dist/` output for Vercel |
| Tauri development | `npm run tauri -- dev` | Existing Tauri desktop shell and Rust IPC |
| Tauri production | `npm run tauri -- build` | Existing desktop bundles, using `src-tauri/tauri.conf.json` |

Tauri-only filesystem and native dialog operations remain desktop-only. Browser-safe paths remain available for public web workflows. No Tauri configuration or Rust scientific engine code is removed by the Vercel deployment.

## Host Fallback Equivalents

If the project is later mirrored to another static host, preserve the same behavior:

- Netlify: rewrite non-file requests to `/index.html` with status `200`.
- Cloudflare Pages: enable the provider's SPA fallback behavior.
- Vercel: keep the root `vercel.json` rewrite.
