# Protein Studio 1.2 Audit

## Existing support

- `Pdb3DViewer` uses NGL for cartoon/backbone/C-alpha rendering, source-aware color controls, chain selection, camera controls, and residue picking.
- `ProteinStudio` already retrieves AlphaFold DB metadata, PDB coordinates, PAE JSON, and UniProt JSON after explicit online actions. AbortController request IDs protect against stale online results.
- `summarizePlddt` and `parsePaeJson` provide the current confidence metrics and defensive PAE validation.
- `parseUniProtBiology` currently extracts identity, function, subcellular location, cofactors, generic feature ranges, and PDB cross-references.
- `BiologyTab` renders generic feature rows and PDB links. Clicking a feature highlights its start position in the viewer.
- `MutationTab` validates substitutions, reports descriptive chemistry/hydropathy/mass changes, and shows nearby parsed coordinates.
- Experimental PDB files are classified separately and do not expose AlphaFold confidence state.

## Reusable code

The existing UniProt parser, PAE/pLDDT helpers, PDB parser, NGL viewer callback, mutation validation, and state-reset paths should remain the foundation. No new network layer is needed for UniProt annotations or existing PDB cross-references.

## Missing functionality

- A dedicated Evidence result tab and load/open behavior for experimental PDB references.
- Structured feature categories for disorder, PTMs, processing, domains, membrane regions, active/binding sites, and disulfide pairs.
- Explicit separation between curated disorder and low pLDDT, plus overlap summaries.
- Feature context in Mutation Inspector.
- Evidence coverage/method display and a derived model-evidence summary without a combined trust score.

## Mapping limitations

Current feature mapping is position-only and highlights a feature start. It does not yet verify canonical versus observed structure numbering, chain-specific coverage, missing residues, mature-chain processing, or paired disulfide endpoints. The 1.2 implementation must report uncertain mappings instead of silently shifting coordinates.

## Proposed implementation

Extend the existing typed UniProt feature model and parser defensively, derive disorder/overlap/evidence summaries from parsed data, add the Evidence tab and source-safe structure opening, pass biology context into Mutation, and add focused utility tests. Keep all new database-dependent fields optional so local structures and partial network responses remain usable.
