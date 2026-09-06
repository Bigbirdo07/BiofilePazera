# Unified Residue Inspector Report

## Architecture

Implemented a shared `CanonicalResidueSelection` in `src/utils/proteinStudio.ts`. Protein Studio now keeps one canonical selection in the page state and passes it to the result tabs.

## Canonical Selection Model

The selection stores accession, canonical position, amino acid, source, PDB ID, entity/asym/author-chain identifiers, author residue number, mapping source, and pLDDT where applicable.

## SIFTS Translation

Implemented segment-aware translation using RCSB `rcsb_polymer_entity_align` plus `polymer_entity_instance` `auth_to_entity_poly_seq_mapping`. Discontinuous segments are not bridged. Unmapped residues retain PDB information without a guessed UniProt position.

## Structure Integration

NGL selections now preserve author residue identifiers, including insertion-code text when supplied. Experimental structure opening preserves an existing canonical selection for the same accession and derives the corresponding PDB residue when the current structure represents it.

## Confidence Integration

The Confidence tab receives the shared selection and reports selected canonical residue/pLDDT context without converting PAE into a per-residue confidence score.

## Biology Integration

Biology feature selection now updates the shared canonical selection. The Biology tab shows feature types overlapping the selected canonical residue.

## Evidence Integration

Evidence details retain SIFTS segments and display which linked PDB entries cover the selected canonical residue.

## Mutation Integration

Mutation inspection updates the shared canonical selection. The Mutation tab shows the selected UniProt position and wild-type residue separately from PDB author numbering.

## P0DTC9 Validation

IMPLEMENTED BUT NOT MANUALLY VERIFIED in the browser. The six live RCSB entries already validated for P0DTC9 supply explicit SIFTS ranges; automated discontinuous and instance translation fixtures are included.

## P01308 Validation

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Canonical precursor numbering is retained for sequence and Biology selections; mature-chain/PDB numbering remains dependent on authoritative RCSB instance mapping.

## P04637 Validation

IMPLEMENTED BUT NOT MANUALLY VERIFIED. The same shared selection path is accession-agnostic and supports partial experimental coverage.

## Edge Cases

Automated coverage includes discontinuous segments, unmapped gaps, insertion-code-preserving author strings, multiple chains for one entity, and new-accession selection reset. Exact live browser switching and visual residue highlighting remain pending.

## Tests Added

Added SIFTS entity-to-canonical and PDB-author-to-canonical utility assertions to `tests/proteinStudio.test.ts`.

## Build Results

Frontend build and Protein Studio logic tests pass after implementation. Rust regression verification remains unchanged from the prior pass.

## Known Limitations

The browser UI has not been manually exercised for the full ten-selection acceptance sequence in this pass. Exact coordinate-resolved coverage and full PDB/mmCIF author-number parsing remain separate evidence-parser limitations.
