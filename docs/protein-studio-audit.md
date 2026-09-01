# Protein Studio Audit

## Existing Components

- `src/pages/ProteinStudio.tsx`: main React page for Protein Studio. It owns input mode state, selected files, UniProt accession state, request token race guard, active model metadata, viewer controls, protein properties, and copy actions.
- `src/components/common/Pdb3DViewer.tsx`: custom Canvas-based pseudo-3D C-alpha trace/ribbon/sphere renderer. It parses PDB `ATOM`/`HETATM` records directly in React, colors by chain/spectrum/B-factor/pLDDT, and provides rotate/zoom/reset controls.
- `src/components/common/FileUploader.tsx`: shared drag/drop and browse component used across BioFile workflows.
- `src/components/layout/Navbar.tsx`: route-like view switcher. Protein Studio is selected through `PageView`.
- `src/App.tsx`: owns current view state and renders `ProteinStudio` when `currentView === 'protein_studio'`.

## Existing Capabilities

- Three visible Protein Studio modes already exist: structure file, UniProt/AlphaFold DB, and protein sequence.
- The recent layout uses a fixed desktop sidebar (`350px` to `380px`) and a dominant right workspace.
- Structure loading accepts PDB/mmCIF extensions and validates that text contains `ATOM` or `HETATM`.
- FASTQ misrouting warning exists for some file drops.
- UniProt/AlphaFold DB retrieval currently contacts AlphaFold DB directly from the frontend with `fetch`.
- Sequence analysis calculates local properties and does not fabricate a synthetic 3D model.
- UniProt FASTA header parsing exists for `sp|` and `tr|` headers and extracts accession, entry, protein name, organism, and gene.
- PDB-derived sequences are extracted through the Rust command `extract_fasta_from_pdb_cmd`.
- Protein properties are calculated through the Rust command `calculate_protein_properties_cmd`.
- AlphaFold pLDDT coloring is approximated by using PDB B-factor column values when `isAlphaFoldModel` is true.
- Experimental structures suppress the pLDDT legend in the current page.

## Routing And Navigation

- There is no external router. `src/App.tsx` uses `PageView` state.
- `src/types/bio.ts` defines `PageView`, including `protein_studio` and `inspect`.
- `Navbar` calls `onNavigate` with these enum values.
- FASTQ warning in Protein Studio can navigate to `inspect`, which is the Sequencing QC page.

## Tauri Commands

- `src-tauri/src/commands/sequence.rs` exposes:
  - `calculate_protein_properties_cmd`
  - `extract_fasta_from_pdb_cmd`
  - sequence detection, transforms, translation, stats, and motif scanning
- `src-tauri/src/commands/file.rs` exposes validation, split, extract, checksum, merge, and FASTQ QC commands.
- `src-tauri/src/lib.rs` registers the commands in `tauri::generate_handler!`.
- No Tauri command currently performs UniProt or AlphaFold DB network retrieval.

## Rust Protein Analysis

- `src-tauri/src/bio/protein.rs` provides:
  - `aa3_to_aa1`
  - `calculate_protein_properties`
  - `extract_fasta_from_pdb_text`
- Existing protein properties include length, molecular weight in kDa, approximate pI, amino-acid composition buckets, Kyte-Doolittle hydropathy profile, and approximate secondary-structure propensity.
- Hydropathy uses Kyte-Doolittle with window size 9 for sequences length >= 9.
- pI is approximate and based on acidic/basic residue balance, not a full titration model.
- Molecular weight is computed from residue masses plus terminal water.
- PDB extraction reads ATOM/HETATM residue names and chain IDs; it does not parse mmCIF.

## Tests And Validation

- Rust tests live mainly in `src-tauri/src/bio/test_suite.rs`.
- Existing protein/PDB tests cover protein property calculation, amino-acid 3-letter conversion, PDB ATOM FASTA extraction, multi-model PDB extraction, and molecular-weight positivity.
- Documentation references external validation for `1UBQ`, `1CRN`, P04637, and AlphaFold pLDDT semantics.
- There are no configured frontend unit tests in `package.json`.
- There is no lint script in `package.json`.

## Integrations

- UniProt metadata integration is not a direct UniProt API call. Current code retrieves AlphaFold DB prediction metadata and uses fields such as `organismScientificName` and `uniprotDescription`.
- AlphaFold DB integration is frontend `fetch` to:
  - `https://alphafold.ebi.ac.uk/api/prediction/{accession}`
  - PDB URLs returned by that API or static file fallbacks.
- Current network requests send only the accession identifier.
- There is no current PAE retrieval.
- No AbortController is used; stale request prevention uses a numeric token ref.

## Molecular Viewer And Parsers

- Molecular viewer library: none. The current viewer is a custom 2D Canvas renderer projecting C-alpha coordinates.
- Plotting/chart library: none. Hydropathy uses hand-rendered bar-like divs.
- PDB parser: simple fixed-column parser in `Pdb3DViewer.tsx`, and separate Rust FASTA extractor in `protein.rs`.
- mmCIF parser: not present. Current mmCIF support is mostly extension/copy level; true coordinate extraction is incomplete.
- Ligand parsing/visualization: not present.

## Source-Type Handling

- Current `ActiveModel` uses `source: 'LOCAL' | 'PDB' | 'ALPHAFOLD DB' | 'SEQUENCE'`, plus booleans `isExperimental` and `isAlphaFold`.
- This is workable but too loose. It allows state combinations that are scientifically confusing, such as local unknown being treated as AlphaFold based on missing experimental keywords.
- Experimental detection relies on text includes (`X-RAY`, `NMR`, `CRYO-EM`, absence of `ALPHAFOLD`) rather than an explicit source classifier.
- AlphaFold confidence state can be clearer if model data stores confidence and PAE only on AlphaFold DB models.

## Broken Or Incomplete Behavior

- Protein Studio is still monolithic, making state reset/race safety harder to reason about.
- It lacks right-workspace tabs: structure, confidence, sequence, mutations.
- It lacks PAE parsing and visualization.
- It lacks a mutation inspector.
- Loading state is a single coarse `loading` value, not staged enough for UniProt metadata/model/confidence data.
- Error states can erase or obscure useful sequence metadata.
- FASTQ rejection is filename/content based and incomplete for `.fastq.gz` if content is not decompressed.
- mmCIF is accepted but not actually parsed as mmCIF.
- Viewer is Canvas-based and recreates derived atom arrays on model/chain change. It is not a persistent WebGL molecular viewer instance.
- Viewer size is tied to window resize only, not ResizeObserver.
- The viewer cannot reliably support surface/stick/ligand representations.
- pLDDT is inferred from AlphaFold PDB B-factor values; no independent confidence data model exists.
- There is no sequence-to-structure residue selection.

## Reusable Pieces

- Existing navigation and `PageView` model.
- Existing two-column page shell after recent margin fix.
- Existing `FileUploader`.
- Existing Rust protein property calculations and PDB ATOM FASTA extraction.
- Existing AlphaFold DB accession-only fetch concept and online labeling.
- Existing UniProt FASTA header extraction logic, after moving it into a testable utility.
- Existing Canvas viewer can be reused and tightened for this RC rather than introducing a new dependency.

## Components Requiring Replacement Or Major Refactor

- `ProteinStudio.tsx` should be broken into a stateful workstation with source-aware tabs and utility functions.
- `Pdb3DViewer.tsx` needs a cleaner lifecycle, ResizeObserver sizing, explicit empty states, source-aware confidence labels, and residue highlight support.
- New TypeScript utilities are needed for input classification, FASTA parsing, source classification, AlphaFold/PAE parsing, pLDDT summaries, and mutation validation.
- Documentation needs a dedicated `docs/protein-studio.md`.

## Implementation Direction

- Keep the existing architecture and avoid new app scaffolding.
- Do not introduce unsupported molecular representations.
- Add PAE as a defensive frontend parser/heatmap tied only to AlphaFold DB models.
- Preserve local Rust routines and extend tests without weakening existing coverage.
- Add frontend logic tests using a lightweight TypeScript test runner script instead of adding a large framework.
