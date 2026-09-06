# PazAtlas Hosting Readiness Audit

**Audit date:** 2026-09-05  
**Application:** PazAtlas 1.0.0-rc.2

## Executive Summary

PazAtlas currently builds as a static Vite frontend and can be deployed to a static host such as Cloudflare Pages, Netlify, or Vercel. The generated production build served successfully from a local Vite preview server, including the homepage's local EGFR AlphaFold demo asset.

The application is suitable for a private beta or research preview deployment. It is not a server-backed multi-user application: there is no authentication, database, server API, account system, or hosted persistence layer in the repository.

## Build And Hosting Model

- Build command: `npm run build`
- Output directory: `dist/`
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Hosting model: static files over HTTPS
- Required build environment variables: none detected
- Backend required for homepage: no
- Backend required for browser Protein Studio online lookups: no, provided the external services permit browser requests in the deployment environment
- Tauri runtime: still required for native filesystem operations and Rust-backed commands

## Production Smoke Check

The following checks passed during this audit:

- `npm test`
- `npm run build`
- `git diff --check`
- Production preview server started on an alternate local port
- `/` returned HTTP 200
- `/demo-structures/P00533_EGFR_AlphaFold.pdb` returned HTTP 200
- The generated demo coordinate file was served at approximately 772 KB

The build emits a Vite warning for the NGL chunk because molecular rendering is large. This is a performance warning, not a build failure.

## Current Visible Product

The primary navigation currently exposes:

- Home
- Sequence Tools
- Protein Studio
- How PazAtlas Works
- About

Settings, History, File Tools, and FASTQ QC are not visible in the primary navigation. File Tools source remains in `src/pages/FileTools.tsx`; archived FASTQ QC UI remains under `src/archived/fastq-qc/`.

## Runtime Boundaries

### Local or browser-side processing

- FASTA parsing and sequence transforms
- Browser-side sequence translation fallback
- Protein property fallback calculations
- Local PDB parsing and NGL rendering
- Theme state and persistence
- Homepage EGFR demo loading

### Online requests after explicit user action

- UniProt metadata and canonical FASTA
- AlphaFold DB metadata, coordinates, and confidence data
- RCSB entry, polymer entity, polymer instance, and PDB coordinate data
- SIFTS-associated mapping information obtained through the RCSB metadata path

The homepage only fetches its packaged `/demo-structures/P00533_EGFR_AlphaFold.pdb` asset. It does not call UniProt, AlphaFold DB, RCSB, or SIFTS to render the homepage preview.

## Important Web Limitations

1. Tauri-only filesystem operations do not become server-side operations when the app is hosted. File Tools remains preserved but is not a dependable browser deployment surface without additional browser implementations.
2. The app now uses client-side History API routes. Static hosting must rewrite the public routes to `index.html` so direct navigation and refresh work.
3. Protein Studio's online requests run directly from the browser. Production deployment should verify CORS, availability, rate limits, and acceptable usage for UniProt, AlphaFold DB, and RCSB from the chosen domain.
4. The frontend contains browser fallback implementations for some legacy file operations. These should not be presented as authoritative file-processing results if those hidden utilities are re-exposed on the web.
5. The HTML now uses PazAtlas title, description, Open Graph metadata, and favicon values. No final production domain is embedded.
6. The NGL bundle is large. The initial application bundle is smaller because NGL is loaded on demand, but the molecular viewer still has a substantial download when opened.
7. The current test script covers Protein Studio logic only. No browser automation or configured frontend lint script is present in `package.json`.

## Security And Privacy Review

- No authentication or user accounts are present.
- No application database or server-side storage is present.
- No analytics SDK or telemetry endpoint was found in the frontend source.
- The feedback modal generates local Markdown and can open a `mailto:` message to `pazeratechnology@gmail.com`.
- External scientific lookups transmit accession identifiers and retrieve public database content. A production privacy notice should state this clearly.
- The Tauri configuration has `csp: null`; this affects the desktop application configuration and should not be treated as a web-hosting security policy.
- Deploy only over HTTPS and configure the hosting provider's managed TLS certificate.

## Domain And Hosting Recommendation

Purchase the domain only after selecting a static host. The simplest deployment path is:

1. Create a project on Cloudflare Pages, Netlify, or Vercel.
2. Connect the repository.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add the custom domain in the host dashboard.
6. Add the DNS records requested by the host at the registrar.
7. Enable managed HTTPS.
8. Test Home, Protein Studio, Sequence Tools, How PazAtlas Works, About, the EGFR demo asset, theme switching, and explicit online lookups from the deployed domain.

For the current state, a static host is sufficient. A backend is not needed unless you later want accounts, shared projects, server-side proxying/caching, hosted file processing, usage controls, or persistent user data.

## Pre-Launch Checklist

- [x] Replace Vite title and favicon with PazAtlas branding.
- [x] Add refresh-safe URL routes.
- [ ] Verify UniProt, AlphaFold DB, and RCSB browser requests from the production domain.
- [ ] Confirm the public privacy wording matches browser and Tauri behavior.
- [ ] Test the deployed site on desktop and mobile.
- [ ] Test Protein Studio with a local PDB and with an explicit AlphaFold lookup.
- [ ] Confirm Help & Feedback opens the intended Pazera email client.
- [ ] Confirm no private fixtures, benchmark files, or development data are copied into the deployment output.
- [ ] Keep the Research Beta label visible on the public preview.

## Recommendation

Do not purchase hosting infrastructure or build a backend yet. Purchase the domain and deploy the current frontend as a Research Beta static site after the title/favicon cleanup and a production-domain browser smoke test. The application is technically capable of static hosting now, with the web limitations above communicated clearly.
