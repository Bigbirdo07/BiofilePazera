# Structure Comparison Audit

## Reusable infrastructure

Protein Studio already has a shared `CanonicalResidueSelection`, parsed `ProteinAtom` coordinates, RCSB evidence details, and SIFTS-derived PDB author-residue to UniProt canonical mappings. The comparison implementation reuses those objects rather than introducing a second mapping system.

## Coordinate sources

AlphaFold coordinates come from the active AlphaFold DB PDB model and are indexed by canonical residue position. Experimental coordinates are retrieved from the selected RCSB PDB entry and parsed with the existing PDB parser. Only C-alpha atoms are eligible for the MVP.

AlphaFold retrieval is metadata-first. The current official endpoint is `https://alphafold.com/api/prediction/{accession}`; the legacy EMBL-EBI endpoint is retained only as a compatibility fallback. The coordinate URL is taken from returned `pdbUrl` or `cifUrl` metadata and is never reconstructed from an assumed release version.

## Chain handling

Evidence details preserve entity, asym, and author-chain identifiers. A comparison is scoped to one explicitly selected author chain. When an entry exposes multiple mapped chains, the UI presents a chain selector instead of averaging chains together.

## Missing residues and numbering

SIFTS residue mappings are the correspondence key. Unmapped residues and mapped residues without usable C-alpha atoms are excluded and reported. PDB author residue strings, including insertion codes, remain separate from canonical positions.

## Comparison pipeline

1. Select a UniProt-linked experimental PDB with reliable RCSB/SIFTS mapping.
2. Retrieve and parse its deposited coordinates.
3. Pair AlphaFold and experimental C-alpha atoms by canonical UniProt position.
4. Apply rigid-body Kabsch/Horn superposition without scaling.
5. Report RMSD and per-residue C-alpha displacement only for the matched set.
6. Keep the transformed overlay separate from the original active coordinates.

The UI does not call RMSD accuracy, does not infer agreement for uncovered residues, and does not perform sequence-similarity matching.
