# PazAtlas Research Beta Production Smoke Test

Run this protocol from the temporary HTTPS URL first, then repeat it after the custom domain is connected. Record PASS, FAIL, or BLOCKED with the deployed URL and date.

## Routes And Shell

- Open `/`, `/protein-studio`, `/sequence-tools`, `/how-pazatlas-works`, and `/about` directly.
- Refresh each route; use Back, Forward, and open each route in a new tab.
- Open an unknown path and confirm PazAtlas's `Page not found` state with a Home link.
- Confirm the title, PazAtlas favicon, Research Beta badge, privacy/research-use wording, source attribution, and no account/cloud-save claims.
- Follow the badge to `/how-pazatlas-works#research-beta` and refresh.

## EGFR: P00533

1. Open Home and confirm the packaged EGFR preview renders without an AlphaFold request.
2. In Protein Studio, analyze the P00533 FASTA and confirm UniProt identity and AlphaFold availability.
3. Click the explicit online fetch and confirm coordinates, confidence data, Evidence, and RCSB requests load.
4. Record separately: identity, AlphaFold retrieval, viewer, Confidence, Evidence, and network behavior.

## BRCA1: P38398

- Confirm canonical length and AlphaFold availability.
- Confirm Evidence loads PDB entries with experimental method, mapped coverage, mapped canonical residue count, and identity within the mapped region.
- Confirm partial fragments are not presented as full-length BRCA1 evidence.
- Open more than one evidence entry and confirm the viewer remains usable.

## TP53: P04637

- Confirm identity resolution, structure loading, experimental evidence, residue inspection, and any available structural comparison.
- Confirm comparison language describes mapped geometric agreement, not full-model validation.

## Insulin: P01308

- Confirm precursor/mature-chain relationships are shown conservatively.
- Confirm a mature-chain experimental structure is not silently presented as full precursor coverage when mapping does not support that claim.

## Failure And Partial Connectivity

With browser requests blocked or failed, test UniProt, AlphaFold DB, and RCSB independently. Confirm the UI distinguishes network failure, not found, and unsupported mapping; no blank page, infinite spinner, raw exception, or false “no structure exists” message is shown.

Confirm Home, the packaged EGFR preview, local Sequence Tools, About, and this guide remain usable without external services.

## Responsive And Accessibility Pass

Check 390, 430, 768, 1280, and 1440px. Verify no page-level horizontal overflow, usable viewer controls, readable Evidence cards, stacked guide diagrams, compact About layout, visible keyboard focus, semantic links/buttons, and keyboard access to forms and Evidence actions.

## Network And Console Record

Record browser console messages as EXPECTED, WARNING, or ERROR. Verify no unexplained recurring errors. Record whether direct requests to UniProt, AlphaFold DB, and RCSB succeed from the deployed HTTPS origin; until then mark each service `PRODUCTION_ORIGIN_TEST_PENDING`.
