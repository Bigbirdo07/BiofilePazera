# Web Deployment

## Local production build

```text
npm run build
```

The Vite output directory is `dist/`.

## Deployment platform

No hosting account or platform is configured in the repository. The app is a Vite single-page frontend and can be deployed to Vercel, Netlify, or Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: none required by the current frontend build
- Deployment status: DEPLOYMENT PREPARED — ACCOUNT AUTHORIZATION REQUIRED

## SPA routing

The current client navigation is internal React state/navigation. A host should serve `dist/index.html` as the fallback for application routes if URL-based routes are added later.

## External database requests

UniProt and AlphaFold DB requests are made from the browser only after the user explicitly requests online retrieval. Local FASTA/PDB contents are not uploaded by the Protein Studio lookup flow. The deployed site must use HTTPS; the external requests should be checked in the chosen host's production browser environment.

## Custom domain

Do not purchase or configure a domain automatically. For a future `.com`, add the domain in the hosting provider, create the provider-specified DNS records at the registrar, enable the provider-managed TLS certificate, choose the canonical host (`www` or apex), and configure the other host to redirect to it.
