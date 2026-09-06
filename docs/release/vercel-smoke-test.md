# PazAtlas Vercel Smoke Test

Run this against the temporary `*.vercel.app` URL before connecting the custom domain. Record the URL, date, browser, and PASS / FAIL / BLOCKED result for each item. Repeat the route, theme, mobile, and external-service checks after the custom domain is connected.

## Home And Static Assets

- Open `/`; confirm the PazAtlas wordmark, Research Beta badge, and light homepage load.
- Confirm the EGFR preview renders from `/demo-structures/P00533_EGFR_AlphaFold.pdb` without an AlphaFold request.
- Open the demo asset URL directly and confirm it returns the coordinate file rather than the application shell.
- Confirm footer privacy, research-use, and source-attribution wording is present.

## Direct Routes And History

Open each route directly in a new tab and refresh it:

```text
/
/protein-studio
/sequence-tools
/how-pazatlas-works
/about
```

Then verify navigation, browser Back, browser Forward, and an unknown path that should show PazAtlas's `Page not found` state. Follow the Research Beta badge to `/how-pazatlas-works#research-beta` and confirm the anchor is visible after refresh.

## Protein Studio

Use the existing explicit online workflow for these accessions. Record identity, AlphaFold availability, viewer rendering, confidence data, evidence, and network behavior separately:

- `P00533` EGFR: confirm the model and packaged homepage demo are available.
- `P38398` BRCA1: confirm partial experimental coverage, mapped canonical residue count, and identity within the mapped region are clear.
- `P04637` TP53: confirm structure, evidence, residue inspection, and any supported comparison.
- `P01308` insulin: confirm precursor versus mature-chain relationships are not silently treated as full-precursor coverage.

Confirm remote failures are distinguished as network error, not found, or unsupported mapping rather than a blank page or false absence claim.

## Sequence Tools

- Open `/sequence-tools`.
- Run one basic DNA/RNA/protein operation.
- Confirm the operation remains usable without a scientific database request.

## Theme And Responsive Checks

- Test Light and Dark modes on every public route; refresh and navigate between routes in both modes.
- Test at `390px`, `430px`, and `768px`; confirm no page-level horizontal overflow.
- Test desktop at `1280px` and `1440px`.
- Check the header, viewer controls, Evidence cards, guide diagrams, About layout, and footer.

## Keyboard And Console

- Navigate the header, route links, sequence inputs, Protein Studio controls, Evidence actions, feedback form, and footer links using the keyboard.
- Confirm visible focus states.
- Record console messages as EXPECTED, WARNING, or ERROR. No unexplained recurring ERROR should remain.

## External-Origin CORS

From the deployed HTTPS origin, explicitly test the browser-direct requests to:

- UniProt: identity, sequence, and annotation lookup.
- AlphaFold DB: metadata, coordinate, and confidence retrieval.
- RCSB PDB: evidence metadata and structure retrieval.

Until these checks pass from the deployed origin, mark each service `PRODUCTION_ORIGIN_TEST_PENDING`. Do not infer production CORS support from localhost.
