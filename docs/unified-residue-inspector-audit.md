# Unified Residue Inspector Audit

## Current Numbering Systems

- AlphaFold/NGL selections currently expose a residue number used as `residueIndex`.
- Experimental PDB parsing exposes author residue numbers and chain IDs, but the previous UI treated them as if they were canonical positions.
- UniProt Biology features use canonical one-based positions.
- RCSB SIFTS provides entity-sequence to UniProt canonical alignment segments.
- RCSB polymer-entity-instance metadata provides the author-chain/asym to entity-sequence mapping needed to translate a clicked PDB residue.

## Current State Objects

Protein Studio previously kept `highlightedResidue` and `selectedResidue` separately from mutation notation, Biology feature ranges, and Evidence details. That allowed a PDB author residue to be displayed as though it were a UniProt position.

## Mapping Sources

The unified selection uses direct AlphaFold residue positions when the active model is AlphaFold. For experimental structures it uses RCSB SIFTS segments plus `auth_to_entity_poly_seq_mapping` from `polymer_entity_instance`. If either mapping step is unavailable, the inspector retains PDB information but does not invent a canonical position.

## Mismatch Risks

The main risks are PDB author numbering, insertion codes, terminal tags, discontinuous SIFTS segments, missing residues, multiple chains, and switching between a sequence-only/canonical model and a partial experimental construct. The implementation preserves author residue strings and translates only within an explicit SIFTS segment.

## Implementation Plan

1. Add a shared `CanonicalResidueSelection` object in the protein utility module.
2. Preserve author residue strings and SIFTS segments in evidence details.
3. Fetch polymer-entity-instance mappings for evidence chains.
4. Translate NGL/PDB selections to canonical positions without similarity guessing.
5. Use the shared selection in Structure, Confidence, Biology, Evidence, Sequence, and Mutation views.
6. Preserve canonical selection across same-protein AlphaFold/experimental switches and clear it for a new accession.
