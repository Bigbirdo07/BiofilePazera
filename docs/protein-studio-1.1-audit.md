# Protein Studio 1.1 Audit

## Current Architecture

- `src/pages/ProteinStudio.tsx` owns the three input workflows, active protein state, online retrieval, source-aware result tabs, sequence properties, mutation inspection, and reset/error state.
- `src/components/common/Pdb3DViewer.tsx` is the existing custom canvas viewer. It parses PDB ATOM/HETATM records, projects C-alpha coordinates, supports ribbon/trace/sphere display, chain/spectrum/B-factor/pLDDT coloring, residue selection, highlighting, resize observation, and camera controls.
- `src/utils/proteinStudio.ts` contains input classification, FASTA/header parsing, RefSeq/UniProt resolution helpers, nucleotide translation, PDB parsing helpers, pLDDT summaries, PAE parsing, mutation validation/descriptions, source semantics, and structure metrics.
- `src/services/biofileApi.ts` bridges local protein-property and PDB FASTA extraction commands to Rust, with browser fallbacks.
- `src-tauri/src/bio/protein.rs` provides validated local molecular-weight, estimated pI, composition, Kyte-Doolittle hydropathy, and PDB ATOM FASTA extraction routines.
- `src-tauri/src/commands/sequence.rs` exposes local protein calculations. `src-tauri/src/commands/file.rs` exposes file operations and native text-file loading.
- `src/App.tsx` routes to Protein Studio through the existing `PageView` state. No new application or routing architecture is required.

## Existing Capabilities

- Three input modes: Structure File, UniProt / AlphaFold DB, and Protein Sequence.
- PDB/local structure loading with experimental versus predicted/local source labels.
- AlphaFold DB metadata, PDB coordinate, pLDDT confidence, and PAE retrieval through frontend `fetch` after explicit user action.
- Defensive PAE matrix validation and square heatmap rendering.
- pLDDT categories and summaries derived from AlphaFold coordinate B-factor values, with AlphaFold-only display.
- FASTA analysis with sequence length, molecular weight, estimated pI, composition, and hydropathy.
- UniProt FASTA header parsing, filename accession detection, RefSeq/UniProt lookup helper, and nucleotide translation helper.
- Sequence-to-structure residue highlighting and mutation-context reporting without mutant-coordinate generation.
- FASTQ rejection from Protein Studio and routing guidance to Sequencing QC.
- Stable two-column layout and persistent viewer lifecycle with resize handling.

## Reusable Code

- Reuse the existing `ProteinStudio` state and tab shell.
- Reuse `parseFastaHeader`, `parseProteinInput`, `resolveUniProtAccession`, `parsePdbAtoms`, `parsePaeJson`, `summarizePlddt`, and `validateMutationInput` rather than adding duplicate parsers.
- Reuse Rust protein-property calculations and the current hydropathy chart.
- Reuse the current source-type guard so experimental structures never receive AlphaFold confidence UI.
- Reuse the existing request token and `AbortController` race protection.

## Missing or Incomplete for 1.1

- Biology tab with authoritative UniProt identity, features, regions, function, localization, and conservative missing-data handling.
- Reliable feature-position mapping and explicit canonical-versus-observed numbering warnings.
- Experimental structure metadata listing associated with a UniProt accession.
- Validated AlphaFold-versus-experimental comparison interface. Full RMSD overlay should be deferred unless alignment and coordinate handling are reliable.
- Dedicated automated tests for UniProt feature parsing/mapping, RefSeq and transcript resolution, biology state, network failures, and all required tab transitions.
- True mmCIF coordinate parsing remains incomplete; the current local viewer is PDB-oriented.
- The viewer is a custom canvas renderer, not a molecular WebGL library. Representation controls must remain limited to modes the renderer supports.

## Known State and Scientific Risks

- Biology metadata must remain separate from structure coordinates and must not be inferred when the online request fails.
- AlphaFold confidence is currently represented from the model's pLDDT-bearing coordinate values; PAE is independent data and must remain source-scoped.
- Sequence-to-structure mapping can differ for signal peptides, processed chains, isoforms, and unresolved experimental residues.
- RefSeq and transcript mapping must record the original identifier and resolved UniProt accession.
- Network requests must remain explicit and accession-only; local FASTA/PDB contents must not be uploaded for metadata lookup.
- Existing user-added FASTA examples are untracked local files and are not part of this audit's implementation changes.

## Implementation Plan

1. Add typed UniProt feature/biology models and a defensive REST response parser.
2. Add a source-aware Biology tab with identity, features, cellular context, and limitations.
3. Add reliable feature-to-sequence mapping and structure highlighting where coordinates support it.
4. Add experimental structure metadata listing through RCSB/UniProt cross-reference data; defer overlay/RMSD unless validated.
5. Expand utility tests for feature parsing, mappings, state semantics, network failure behavior, and required examples.
6. Run frontend, Rust, and manual P01308/P04637/1UBQ/1CRN verification before documenting the 1.1 report.
