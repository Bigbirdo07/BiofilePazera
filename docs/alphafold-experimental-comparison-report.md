# AlphaFold vs Experimental Comparison Report

## Architecture

The MVP reuses the existing canonical residue, RCSB evidence, SIFTS mapping, PDB parser, NGL viewer, and shared residue inspector. Comparison state stores the selected evidence entry, selected author chain, parsed experimental atoms, rigid transformation, and derived metrics without mutating the original models.

## AlphaFold Retrieval Failure Analysis

The previous implementation called `https://alphafold.ebi.ac.uk/api/prediction/{accession}` and then trusted its `pdbUrl`. The older API route is no longer dependable after the AlphaFold DB API transition, and guessed versioned file URLs returned 404 for the legacy `AF-P0DTC9-F1-model_v4.pdb` pattern. A 404 from that guessed URL was therefore not sufficient evidence that P0DTC9 lacked a model.

## Endpoint/Metadata Fix

The implementation now queries the current official `https://alphafold.com/api/prediction/{accession}` metadata endpoint first, with the legacy official endpoint as compatibility fallback. It normalizes current fields including `entryId`, `sequence`, `cifUrl`, `pdbUrl`, and `paeDocUrl`, selects the exact normalized accession, and retrieves the coordinate URL supplied by metadata. Retrieval errors are classified as `MODEL_NOT_FOUND`, `METADATA_ENDPOINT_FAILURE`, `COORDINATE_URL_NOT_FOUND`, `NETWORK_ERROR`, or `PARSE_ERROR`.

## Residue Correspondence

Pairs are keyed by UniProt canonical position. The implementation does not use nearest residue numbers, length guesses, or sequence similarity. PDB author residue strings and chain identifiers are retained on every pair.

## Coordinate Extraction

Only standard residue C-alpha atoms with finite coordinates are included. Mapped residues lacking a usable pair are reported as excluded.

## Superposition Algorithm

`kabschSuperpose` performs centered rigid-body least-squares fitting using a quaternion/Horn formulation. There is no scaling or remapping after fitting.

## RMSD Calculation

RMSD is calculated after superposition and applies only to the matched experimental region. The UI explicitly states that it does not measure accuracy of the full AlphaFold model.

## Per-Residue Displacement

Each matched canonical residue receives a post-superposition C-alpha displacement and can be selected from the comparison plot to update the shared residue inspector.

## Multiple Chains

Mapped author chains are exposed through a chain selector. Each selected chain receives an independent comparison; chains are not averaged.

## Missing Residues

Unmapped SIFTS positions and mapped positions without usable C-alpha atoms are excluded and listed. Discontinuous mappings remain discontinuous.

## Live P0DTC9 Comparison

EXECUTED AND VERIFIED numerically against official AlphaFold DB metadata/coordinates and official RCSB PDB coordinates.

### 6M3M

- Canonical SIFTS segment: `41–174` of `419` residues.
- Matched Cα pairs: `121`.
- Excluded mapped positions: `41–47`, `96–100`, and `174` (13 total); these positions lacked usable experimental Cα coordinates in the selected author chain.
- Post-superposition Cα RMSD: `0.9172976949972633 Å`.
- Largest displacements: UniProt `48` (`4.1313 Å`), `49` (`2.8709 Å`), `152` (`2.5879 Å`), `153` (`2.3963 Å`), and `95` (`2.2845 Å`).

### 6WZO

- Canonical SIFTS segment: `247–364` of `419` residues.
- Matched Cα pairs: `108`.
- Excluded mapped positions: `247–256` (10 total); these positions lacked usable experimental Cα coordinates in the selected author chain.
- Post-superposition Cα RMSD: `0.8176095922853183 Å`.
- Largest displacements: UniProt `342` (`2.2462 Å`), `341` (`1.7959 Å`), `340` (`1.7564 Å`), `343` (`1.6763 Å`), and `327` (`1.6189 Å`).
- UniProt residue `210` was not part of the comparison because it is outside the mapped SIFTS segment `247–364`.

## Live P01308 Comparison

IMPLEMENTED BUT NOT MANUALLY VERIFIED for a real RMSD. The requested `4INS` check showed an important mapping constraint: RCSB maps the 4INS insulin A/B polymer entities to UniProt `P01315`, not precursor accession `P01308`. Therefore BioFile must not compare `P01308` against 4INS as though it were a direct P01308-linked structure. Signal peptide and C-peptide positions are consequently not silently included. A valid P01308 comparison requires an experimental entry explicitly mapped to P01308 or a separately documented canonical precursor mapping.

## Live P04637 Comparison

EXECUTED AND VERIFIED numerically with linked PDB `1TSR`, mapped by RCSB/SIFTS to the p53 DNA-binding core.

- Canonical coverage: `94–312` of `393` residues.
- Matched Cα pairs: `196`.
- Excluded mapped positions: `290–312` (23 total), which lacked usable coordinates in the selected chain.
- Post-superposition Cα RMSD: `1.0511433440805433 Å`.
- Largest displacements: UniProt `94` (`10.2691 Å`), `95` (`6.3488 Å`), `96` (`2.8965 Å`), `289` (`1.8129 Å`), and `187` (`1.6171 Å`).

The result is limited to the mapped/coordinate-bearing DNA-binding-core region and is not a full-length p53 comparison.

## Multi-Chain Live Result

EXECUTED AND VERIFIED numerically with `6M3M`, where mapped author chains A and B represent the same P0DTC9 entity. Each chain was calculated independently:

| Chain | Matched Cα pairs | Excluded mapped positions | RMSD after superposition |
| --- | ---: | --- | ---: |
| A | 121 | 41–47, 96–100, 174 (13) | 0.9172976949972633 Å |
| B | 126 | 41–47, 97, 174 (8) | 1.1500178761579163 Å |

The results are not averaged. The application preserves the selected author chain and exposes a chain selector that recalculates the comparison for that chain.

## Independent RMSD Cross-Check

EXECUTED AND VERIFIED for 6M3M. The matched coordinate pairs were exported to `/tmp/6m3m-matched-pairs.json`. A separate standalone JavaScript calculation in `scripts/independent_rmsd.mjs` performed the superposition without calling BioFile's structural-comparison function.

- BioFile RMSD: `0.9172976949972633 Å`
- Independent RMSD: `0.9172976949972632 Å`
- Absolute difference: approximately `1.1e-16 Å`
- Tolerance: `1e-6 Å`

## Automated Tests

PASS for deterministic identical, translated, rotated, rotated-plus-translated, perturbed, and fewer-than-three-point Kabsch cases, alongside the existing Protein Studio tests.

## Browser Testing

The Vite server was opened successfully on `http://127.0.0.1:5173/` with Playwright. The following interactive results were observed for P0DTC9/6M3M:

| UI acceptance item | Status |
| --- | --- |
| P0DTC9 Evidence card and enabled comparison action | PASS |
| Both structures render in one viewer with distinct colors | PASS |
| Overlay summary shows PDB, method, resolution, coverage, pair count, exclusions, RMSD, and disclaimer | PASS |
| AlphaFold visibility toggle interaction | PASS |
| Experimental visibility toggle interaction | PASS |
| Matched-region-only toggle interaction | PASS |
| Full-AlphaFold-context wording/control state | PASS |
| 6M3M chain selector A → B | PASS |
| Chain B updates to 126 pairs and approximately 1.15 Å RMSD | PASS |
| Per-residue displacement plot renders | PASS |
| Plot point updates Unified Residue Inspector and canonical position | PASS |
| Exit Comparison removes comparison state from the workspace | PASS |

The following requested checks remain `NOT EXECUTED` because the browser harness lost the sidebar locator after the exit transition and could not continue reliably:

| UI acceptance item | Status |
| --- | --- |
| P04637 + 1TSR browser comparison | NOT EXECUTED |
| P04637 partial-coverage browser warning | NOT EXECUTED |
| Comparison-specific network failure in browser | NOT EXECUTED |
| Full normal-viewer restoration visual inspection after exit | NOT EXECUTED |

The underlying live coordinate calculations, chain-specific numerical results, and deterministic comparison tests pass.

Detailed interactive results are recorded in `docs/structural-comparison-browser-acceptance.md`.

## Build Results

PASS: `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test` (107 tests), and `git diff --check`.

NOT CONFIGURED: separate `npm test` and `npm run lint` commands are not present; `npm test` resolves to the focused Protein Studio test script.

## Known Limitations

The current MVP retrieves PDB text for the selected evidence entry and depends on the existing parsed coordinate representation. It does not implement multi-PDB aggregation, structural alignment beyond the selected chain, conformational classification, or any biological effect prediction.

The current live acceptance set exposed a biologically important accession distinction: 4INS is mapped upstream to mature insulin accession P01315 rather than precursor P01308. The UI correctly relies on explicit upstream mapping instead of guessing precursor/mature correspondence.

## Deferred Features

RMSD across multiple structures, conformational comparison, domain statistics, and richer independent numerical validation remain follow-up work.

## Final Status

IMPLEMENTED_BUT_LIVE_VALIDATION_BLOCKED

Real AlphaFold-to-PDB RMSDs were independently reproduced for P0DTC9/6M3M, P0DTC9/6WZO, and P04637/1TSR, and multi-chain numerical behavior was verified. The final browser-level UI acceptance set and a valid P01308 precursor-linked comparison remain incomplete. 4INS is explicitly mapped to P01315, so it is not a valid direct P01308 comparison.
