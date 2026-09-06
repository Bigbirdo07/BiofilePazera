# First Public Deployment

PazAtlas is a static Vite frontend. A backend is not required for the current Research Beta.

1. Select Cloudflare Pages, Netlify, Vercel, or another static HTTPS host.
2. Connect the repository.
3. Build with `npm run build`.
4. Publish `dist/`.
5. Configure SPA fallback to `index.html` for `/protein-studio`, `/sequence-tools`, `/how-pazatlas-works`, and `/about`.
6. Enable the provider's HTTPS certificate.
7. Use the temporary provider HTTPS URL first; do not connect the custom domain yet.
8. Run [`production-smoke-test.md`](./production-smoke-test.md), including browser-direct UniProt, AlphaFold DB, and RCSB checks.
9. Confirm the deployed origin does not produce CORS, routing, console, or mobile blockers.
10. Add the purchased custom domain in the host dashboard and configure only the DNS records supplied by that host.
11. Enable/confirm managed HTTPS on the custom domain.
12. Repeat the complete smoke test on the custom domain.

## Deployment Inputs

- Build command: `npm run build`
- Output directory: `dist/`
- Backend: not required
- Required domain configuration: none in application code
- Intentional public demo asset: `/demo-structures/P00533_EGFR_AlphaFold.pdb`

## Before Inviting Testers

Confirm the public footer and guide accurately state Research Beta, research/educational use, browser-side processing, and explicit online communication with public scientific services. Do not claim that no data ever leaves the browser. Do not advertise archived FASTQ QC or File Tools.
