# BioFile Toolkit V1 — System & Codebase Audit Report

**Date**: August 31, 2026  
**Auditor**: Antigravity AI Engineering & Validation Team  
**Scope**: Full repository audit of BioFile Toolkit V1 (`/Users/albertopaz/Pazera-chompchomp`)

---

## 1. Project Architecture Overview

BioFile Toolkit V1 is a cross-platform desktop application built using:
- **Desktop Runtime**: Tauri v2 (`tauri` v2.11.5)
- **Core Engine (Backend)**: Rust (edition 2021)
- **User Interface (Frontend)**: React 19 + TypeScript + Vite + Tailwind CSS
- **Native OS Pickers**: `@tauri-apps/plugin-dialog`
- **Data Decompression & Hashing**: `flate2` (Gzip), `sha2` (SHA-256), `hex`

---

## 2. Inventory of Backend Modules (`src-tauri/src/bio/`)

| Module | File | Lines | Purpose / Algorithm | Audit Classification |
| :--- | :--- | :--- | :--- | :--- |
| `io` | `io.rs` | 74 | Transparent Gzip detection (`0x1F 0x8B`) & format detection (`>` vs `@`) | IMPLEMENTED |
| `fasta` | `fasta.rs` | 76 | Streaming FASTA parser (`FastaStreamReader`) | IMPLEMENTED |
| `fastq` | `fastq.rs` | 134 | Wrapped FASTQ parser (`FastqStreamReader`) | IMPLEMENTED (Needs torture tests) |
| `iupac` | `iupac.rs` | 152 | IUPAC complement rules, sequence type detector, wildcard matching | IMPLEMENTED |
| `sequence` | `sequence.rs` | 181 | Reverse, complement, reverse complement, DNA ↔ RNA transcription | IMPLEMENTED |
| `translation` | `translation.rs` | 148 | 6-frame protein translation using standard genetic code | IMPLEMENTED |
| `statistics` | `statistics.rs` | 158 | Length, base counts, GC% calculation | IMPLEMENTED |
| `validate` | `validate.rs` | 152 | Streaming FASTA/FASTQ validator with 1,000 capped preview errors | IMPLEMENTED |
| `split` | `split.rs` | 240 | Record-aware splitter (size, record count, parts) & manifest generator | IMPLEMENTED |
| `extract` | `extract.rs` | 118 | Sequence extraction by target ID list (exact or substring) | IMPLEMENTED |
| `checksum` | `checksum.rs` | 51 | Streaming SHA-256 calculator & verifier | IMPLEMENTED |
| `merge` | `merge.rs` | 125 | Multi-file FASTA/FASTQ merger with format compatibility check | IMPLEMENTED |
| `protein` | `protein.rs` | 215 | Physicochemical properties (MW kDa, pI), Kyte-Doolittle, PDB ATOM FASTA | IMPLEMENTED |
| `motif` | `motif.rs` | 165 | Restriction enzyme cut map & CRISPR PAM motif scanner | IMPLEMENTED |
| `quality` | `quality.rs` | 145 | FastQC quality metrics (Q20 %, Q30 %, per-base Phred scores) | IMPLEMENTED |

---

## 3. Inventory of Tauri Commands & IPC Handlers (`src-tauri/src/commands/`)

### File Management Handlers (`commands/file.rs`)
- `validate_file_cmd`: Runs streaming file validator.
- `split_file_cmd`: Executes record-aware file splitting & generates `split_manifest.json`.
- `extract_sequences_cmd`: Extracts sequence records matching target ID list.
- `calculate_checksum_cmd`: Computes SHA-256 checksum for a file.
- `verify_checksum_cmd`: Compares file SHA-256 hash against expected hash.
- `merge_files_cmd`: Merges multiple FASTA or FASTQ files sequentially.
- `generate_fastq_qc_report_cmd`: Runs FastQC quality inspection on FASTQ files.

### Sequence & Bio Handlers (`commands/sequence.rs`)
- `detect_sequence_type_cmd`: Detects DNA, RNA, Protein, or Unknown.
- `transform_sequence_cmd`: Performs reverse, complement, reverse complement, or DNA ↔ RNA.
- `translate_sequence_cmd`: Executes 6-frame translation.
- `calculate_sequence_stats_cmd`: Calculates length, base breakdown, and GC%.
- `calculate_protein_properties_cmd`: Computes MW (kDa), pI, hydropathy profile, and secondary structure propensity.
- `extract_fasta_from_pdb_cmd`: Extracts 1-letter FASTA sequence from PDB ATOM lines.
- `scan_sequence_for_motifs_cmd`: Scans sequence for restriction enzyme cut sites & CRISPR PAMs.

---

## 4. Inventory of Frontend Workspaces (`src/pages/`)

| Page | File | Purpose | Audit Status |
| :--- | :--- | :--- | :--- |
| `Home` | `Home.tsx` | Hero section, privacy banner, drag & drop dropzone, quick paste sequence detector | IMPLEMENTED |
| `SequenceTools` | `SequenceTools.tsx` | Dual-pane sequence editor, transform toolbar, 6-frame translation UI, stats table | IMPLEMENTED |
| `FileTools` | `FileTools.tsx` | Sub-tabs: Smart Splitter, Merger, Validator, Extract by ID, SHA-256 Checksum | IMPLEMENTED |
| `Inspect` | `Inspect.tsx` | Sub-tabs: FastQC Quality Control, Restriction Enzymes & CRISPR PAM Finder, JSON Report Exporter | IMPLEMENTED |
| `ProteinStudio` | `ProteinStudio.tsx` | UniProt AlphaFold DB fetcher, 3D structure viewer, pLDDT legend, hydropathy plot | IMPLEMENTED |
| `History` | `History.tsx` | Local job execution history log | PARTIALLY IMPLEMENTED (UI + local state) |
| `Settings` | `Settings.tsx` | Dark/Light theme toggle, default export path config | IMPLEMENTED |

---

## 5. Network & External Dependencies Audit

- **External Network Requests**:
  - `ProteinStudio.tsx`: `https://alphafold.ebi.ac.uk/files/AF-${cleanId}-F1-model_v4.pdb` (Fetches AlphaFold predicted 3D structures from EMBL-EBI when explicitly requested by user).
- **Telemetry / Analytics**: **NONE**. Zero tracking, zero telemetry, zero analytics SDKs.
- **Local File Processing**: All FASTA, FASTQ, Gzip decompression, splitting, validation, translation, and checksum operations run 100% locally on the user's CPU.

---

## 6. Audit Summary of Claims vs Implementation

1. **Memory Usage Claim**: Previously claimed "≤30 MB RAM regardless of file size". Need benchmark suite to empirically measure peak RAM across 100MB, 1GB, and 10GB files. Product language updated to: *"Streaming architecture designed to keep processing memory bounded as file size increases."*
2. **Offline Claim**: Previously claimed "100% offline". Clarified to: *"Sequence files and local analyses are processed on your computer. Online database retrieval occurs only when explicitly requested."* Visible UI labels updated to distinguish **LOCAL** vs **ONLINE** actions.
3. **Translation vs ORF Claim**: Product copy updated to "six-frame translation / coding-region exploration" to accurately describe the 6-frame translation output.
4. **AlphaFold Claim**: Product copy updated to "AlphaFold DB structure viewer" / "View predicted structure from AlphaFold DB" to clarify that predicted structures are retrieved from the public database rather than running local neural network inference.

---

## 7. Known Issues & Audit Classifications

All current features are functional, with zero P0 or P1 blocking bugs. Detailed feature claim matrix and release issue tracking will be maintained in `docs/v1-feature-claim-matrix.md` and `docs/v1-release-issues.md`.
