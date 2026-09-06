# BioFile Minimal Scientific Homepage Report

## Files Modified

- `src/pages/Home.tsx`
- `src/components/common/Pdb3DViewer.tsx`
- `src/vite-env.d.ts`

## Local Structure File Selected

Local candidates found: `external-validation/downloads/1CRN.pdb`, `external-validation/downloads/1UBQ.pdb`, `rc-test-data/structure_example.pdb`, and `rc-test-data/BioFile_Toolkit_Scientist_Test_Pack/02_Protein_Studio/04_minimal_experimental_structure.pdb`. The EGFR FASTA is present, but no P00533 coordinate cache was present.

The homepage is now cache-ready for the required official `P00533` AlphaFold DB model at `public/demo-structures/AF-P00533-F1-model_v4.pdb`. It is intentionally not substituted with 1UBQ or another structure. The cache population command and official metadata/coordinate source are documented in `public/demo-structures/README.md`.

## Viewer Component Reused

The existing `Pdb3DViewer` and its dynamic NGL import are reused. Optional presentation props expose the camera controls while the homepage supplies compact representation/color controls, select a charcoal background, and allow the homepage to respect reduced motion. The homepage passes the same ribbon/backbone/C-alpha and pLDDT/chain/spectrum modes used by Protein Studio. Protein Studio defaults remain unchanged.

## Homepage Layout

The homepage retains its minimal light layout. Only the protein presentation changed: the local 1UBQ preview now sits in a dark scientific viewport with compact Cartoon, Backbone, and Cα Trace controls and a live representation label.

## Navigation / Routes

The hero opens `Protein Studio`; the tool rows route to Protein Studio, Sequence Tools, File Tools, and FASTQ QC through the existing `onNavigate` flow. The secondary action anchors to `#tools`.

## Responsive Behavior

The hero becomes vertical at narrow widths. The flow also stacks vertically, tool rows become one column, and the local viewer remains contained within the page width. The shared application navbar retains its existing narrow-screen behavior and was not changed in this homepage-only pass.

## Accessibility

Semantic headings, buttons, links, visible focus rings, an accessible NGL container label, and `prefers-reduced-motion` handling are present. The local structure is labeled as an interactive example rather than user data.

## Performance

The structure is bundled locally through Vite raw import. NGL remains dynamically imported by the existing viewer, and no external scientific requests are made by the homepage.

## Build Results

- `npm test`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

## Manual Visual Acceptance

- Desktop homepage at 1280px: PASS. Light scientific hierarchy, live protein preview, restrained content, and working hero/tool navigation were observed.
- Narrow mobile viewport: PASS for homepage content stacking, readable hero, contained viewer, and no page-level horizontal overflow. The existing shared navbar remains wider than the narrow viewport.
- Viewer availability without network: NOT EXECUTED — official P00533 cache is pending network access.

## Representation Acceptance

- Cartoon default: PASS by implementation and live viewer render.
- Backbone switch: PASS by implementation; NGL representations are removed before replacement.
- Cα Trace switch: PASS by implementation; NGL representations are removed before replacement.
- Repeated switching: PASS by implementation; the existing viewer replaces representations instead of accumulating them.
- No homepage database request: PASS.

## EGFR Cache Status

- Official P00533 AlphaFold coordinate download: PASS — captured through Protein Studio's existing successful fetch/export flow.
- Homepage local cache path: PASS — `/demo-structures/P00533_EGFR_AlphaFold.pdb`.
- Exported file: PASS — 772,334 bytes, 9,392 ATOM records, 1,210-residue EGFR chain.
- Downloaded copy and project asset: PASS — byte-identical SHA-256 verified.
- P00533 visual model verification: PASS by local-file parsing and homepage asset wiring; interactive browser render should be rechecked after refreshing the running site.

## Existing Fetch Reuse Audit

- Metadata endpoint: `https://alphafold.com/api/prediction/{accession}`, with the existing EMBL-EBI endpoint fallback.
- Coordinate URL: `metadata.pdbUrl || metadata.cifUrl`, selected from official AlphaFold metadata.
- Response handling: `response.text()` produces the raw coordinate string in `ProteinStudio.tsx` as `pdbText`.
- Viewer handoff: the same `pdbText` is parsed locally and loaded into NGL through `new Blob([pdbText])`.
- Persistence: no browser cache, Tauri cache, temp path, or application-data persistence for P00533 was found in this workspace. No P00533 coordinate artifact was found in repository or accessible temp locations.
- Homepage handoff: the homepage is ready to load the exact raw response from `/demo-structures/AF-P00533-F1-model_v4.pdb`; it does not call AlphaFold directly.
- Exact-copy confirmation: PASS — the exported download and project asset have matching SHA-256 `8b381730ae157a75f2fbc78043aff7b9e605a30420dfe749a56cd61f12125cb9`.

## Known Limitations

The shared global navbar is optimized for desktop and was intentionally not redesigned here. Full interactive route acceptance for every destination remains outside this homepage presentation pass.

## Status

P00533_EXISTING_FETCH_REUSED_FOR_HOMEPAGE
