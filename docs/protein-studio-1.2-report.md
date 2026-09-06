# Protein Studio 1.2 Report

## Audit

Existing pLDDT, PAE, Biology, Mutation, NGL, UniProt feature parsing, PDB references, residue highlighting, and source reset paths were reused. The audit is recorded in `docs/protein-studio-1.2-audit.md`.

## Disorder Interpretation

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Confidence now separates low pLDDT from curated UniProt disorder/compositionally biased/flexible-region annotations and uses non-assertive wording.

## PTMs

IMPLEMENTED BUT NOT MANUALLY VERIFIED. UniProt modified-residue and modification-like features are grouped as curated PTM context, remain clickable, and do not alter AlphaFold coordinates.

## Cellular Context

EXECUTED AND VERIFIED for existing Biology rendering; expanded feature categories are IMPLEMENTED BUT NOT MANUALLY VERIFIED against live P01308/P04637 records.

## Experimental PDB Evidence

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Evidence lists existing UniProt PDB cross-references and provides an RCSB PDB load path that switches the active viewer to experimental semantics and clears PAE/selection state.

## Evidence Summary

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Evidence dimensions remain separate and no combined trust score is calculated. RMSD/overlay remains DEFERRED.

## Mutation Context Enhancements

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Mutation results now receive Biology annotations and show curated feature types covering the selected residue when available.

## P01308 Results

NOT MANUALLY VERIFIED in this 1.2 pass.

## P04637 Results

NOT MANUALLY VERIFIED in this 1.2 pass.

## 1UBQ Results

Previously EXECUTED AND VERIFIED as an experimental NGL control; no pLDDT or PAE. New 1.2 Evidence/feature UI was not manually re-run.

## 1CRN Results

Previously EXECUTED AND VERIFIED as an experimental NGL control; no pLDDT or PAE. New 1.2 Evidence/feature UI was not manually re-run.

## Mapping Failures Tested

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Current feature mapping remains canonical position-based; uncertain numbering is not silently shifted. Detailed chain-aware and mature-chain mapping is DEFERRED.

## Network Failure Behavior

NOT MANUALLY VERIFIED in this 1.2 pass. Existing independent failure handling remains in place.

## Tests Added

Added automated coverage for disorder and PTM feature classification through the existing UniProt parser test fixture.

## Regression Results

- `npm run test:protein-studio`: PASS
- `npm run build`: PASS
- `cargo fmt --check`: PASS
- `cargo clippy --all-targets --all-features -- -D warnings`: PASS
- `cargo test`: PASS, 107 tests
- `git diff --check`: PASS

## Known Limitations

The UI still retains the existing Sequence result tab alongside the requested five interpretation tabs. PDB cross-reference coverage and detailed method metadata are only shown when supplied by UniProt. Full browser validation of live P01308/P04637 Biology, Evidence, PTM/disorder overlap, mutation picking, offline behavior, and source transitions remains outstanding. No RMSD, docking, dynamics, pathogenicity, stability, or mutant prediction was added.
