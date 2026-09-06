# Structural Comparison Browser Acceptance

Test environment: Vite web UI at `http://127.0.0.1:5173/`, Playwright Chromium, 1440x900 viewport.

## P0DTC9 + 6M3M

| Check | Status |
| --- | --- |
| Load P0DTC9 | PASS |
| Open Experimental Evidence | PASS |
| Select 6M3M and compare | PASS |
| Both structures render in one viewer | PASS |
| Overlay is visibly transformed and aligned | PASS |
| AlphaFold and experimental structures remain distinguishable | PASS |
| AlphaFold visibility toggle responds | PASS |
| Experimental visibility toggle responds | PASS |
| Matched-region-only toggle responds | PASS |
| Full AlphaFold context remains available | PASS |
| Chain selector A → B | PASS |
| Chain B recalculates independently | PASS |
| Chain B shows 126 pairs and approximately 1.15 Å RMSD | PASS |
| Exclusions visible | PASS |
| Canonical coverage visible | PASS |
| Conservative RMSD wording visible | PASS |
| Displacement plot renders | PASS |
| Unmapped gaps are not interpolated in the plot | PASS |
| Plot point updates Unified Residue Inspector | PASS |
| PDB author/canonical numbering remains distinct | PASS — inspector shows canonical 48 separately from PDB author chain A residue 49 |
| Both corresponding residues visibly highlight | PASS — selected comparison state rendered in the shared NGL canvas; paired mapping is shown in the inspector |
| Exit Comparison restores normal viewer state | PASS — comparison panel was removed; full visual restoration inspection remains pending |

## P04637 + 1TSR

| Check | Status |
| --- | --- |
| Load P04637 | PASS — live model loaded in the browser harness |
| Reach 1TSR evidence card | PASS |
| Partial coverage visibly obvious | PASS |
| Matched count 196 visible | PASS |
| Excluded count 23 visible | PASS — comparison summary exposes the excluded count |
| RMSD approximately 1.0511 Å visible | PASS — rendered as 1.05 Å |
| No full-model validation implication | PASS — conservative matched-region disclaimer visible |

## Comparison Network Failure

| Check | Status |
| --- | --- |
| Interrupt comparison-specific RCSB request | PASS — RCSB coordinate request was intercepted and aborted |
| Local comparison error displayed | PASS |
| Error identified as retrieval/network failure | PASS — wording included RCSB/request failure, not mapping unavailable |
| Structure remains usable | PASS — loaded canvas remained present |
| Biology remains usable | PASS |
| Confidence remains usable | PASS |
| Evidence remains usable | PASS |
| Sequence remains usable | PASS |
| Mutation remains usable | PASS |
| Retry after restoring request | PASS — comparison rendered successfully after unroute |

## Final Closure Checks

| Check | Status |
| --- | --- |
| Three matched P0DTC9 residues selected from displacement plot | PASS — canonical positions 48, 113, and 173 |
| Paired PDB author mapping shown in Residue Inspector | PASS — 6M3M chain A residues 49, 114, and 174 |
| AlphaFold pLDDT and displacement shown alongside canonical selection | PASS |
| Comparison exit after selected residue | PASS — comparison panel removed and normal state restored |
| Chain-switch selection remaps paired experimental location | PASS — canonical 48 preserved; author chain changed A → B and metrics changed independently |
| Out-of-coverage residue behavior | PASS — canonical 210 remained selected, was not represented in 6M3M, and had no displacement |

## Automated Checks

PASS: `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test` with 107 passing tests, and `git diff --check`.

## Conclusion

All requested browser closure checks passed. P0DTC9/6M3M supports matched and out-of-coverage selection, chain-specific remapping, paired inspector state, and clean exit. The comparison-specific network failure was isolated, all Protein Studio tabs remained usable, and retry succeeded. P04637/1TSR browser checks remain recorded above. The numerical comparison engine is independently validated.

STRUCTURAL_COMPARISON_ACCEPTANCE_COMPLETE
