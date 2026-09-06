# Experimental Evidence 1.1 Report

## Existing Behavior

UniProt PDB cross-references were already listed and could be opened in RCSB or loaded into NGL. They did not provide structured chain, coverage, resolved-residue, sequence-identity, or molecule metadata.

## RCSB Integration

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Evidence now lazily requests RCSB entry, polymer-entity, and non-polymer-entity REST records when the Evidence tab opens. The endpoint is `https://data.rcsb.org/rest/v1/core`. A live request was NOT EXECUTED because DNS/network access was unavailable in this run.

## Chain Mapping

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Polymer chains are accepted only when an RCSB reference sequence identifier explicitly matches the active UniProt accession. No length-based or similarity-based guessing is performed.

## Sequence Coverage

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Exact contiguous deposited-sequence matches report canonical start/end, mapped residues, and construct length. Non-contiguous or engineered sequences report that detailed alignment is unavailable rather than inventing coverage.

## Resolved Residues

DEFERRED for exact residue-level unresolved reporting. The current parser reports resolved coordinate count only when the deposited sequence is an exact mapped construct; parsing PDB/mmCIF missing-residue categories, insertion codes, and author numbering needs a dedicated validated parser pass.

## Sequence Identity

IMPLEMENTED BUT NOT MANUALLY VERIFIED for exact contiguous matches. Detailed substitutions, insertions, and deletions are DEFERRED until an explicit local alignment/mapping implementation is validated.

## Ligands / Cofactors

IMPLEMENTED BUT NOT MANUALLY VERIFIED. RCSB non-polymer entities are displayed with component ID, name, and source category when available. Water is not specially summarized yet.

## Nucleic Acids / Partners

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Additional polymer entities are surfaced with chain IDs, polymer type, and deposited description when available.

## Mutation Integration

IMPLEMENTED BUT NOT MANUALLY VERIFIED. Existing Mutation Inspector remains source-safe; direct evidence-card coverage for a selected residue is not yet wired.

## P04637 Validation

NOT EXECUTED manually in this pass.

## P01308 Validation

NOT EXECUTED manually in this pass.

## 1UBQ Validation

Previously EXECUTED AND VERIFIED as an experimental NGL control with 76 observed residues and no pLDDT/PAE. New RCSB detail retrieval was not manually executed.

## 1CRN Validation

Previously EXECUTED AND VERIFIED as an experimental NGL control with 46 observed residues and no pLDDT/PAE. New RCSB detail retrieval was not manually executed.

## Mapping Edge Cases

Automated mapping coverage includes explicit UniProt accession mapping, multiple mapped chains, unrelated polymer partners, nucleic-acid partners, non-polymer entities, and unavailable mapping. Insertion codes, engineered substitutions, terminal/internal missing residues, and mature-chain numbering are NOT EXECUTED or DEFERRED.

## Automated Tests

PASS: RCSB evidence parser tests cover explicit accession mapping, multiple chains, RNA partner, non-polymer ion, exact sequence identity, and unavailable mapping.

## Build Results

- `npm run test:protein-studio`: PASS
- `npm run build`: PASS
- `cargo fmt --check`: PASS
- `cargo clippy --all-targets --all-features -- -D warnings`: PASS
- `cargo test`: PASS, 107 tests
- `git diff --check`: PASS

## Known Limitations

Coverage currently requires an exact contiguous deposited sequence match. Exact unresolved-residue and author-to-canonical numbering reconciliation is not complete. Evidence details can fail independently without replacing the AlphaFold model, but a live network-failure test and deployed-site test were not executed.

## Deferred Structural Comparison

AlphaFold/PDB overlay, RMSD, per-residue displacement, conformational comparison, and clustering remain DEFERRED. Separate experimental structures must not be described as the same or different conformation without validated structural comparison.
