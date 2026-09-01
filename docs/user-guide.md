# BioFile Toolkit V1 — Complete User Manual

**Version**: `1.0.0-rc.1`

---

## 1. Introduction

BioFile Toolkit is a local-first desktop application designed for high-performance sequence file manipulation, quality control, structure inspection, and dataset splitting. Built on Rust streaming engines, BioFile Toolkit processes multi-gigabyte FASTA and FASTQ datasets with bounded memory footprint ($\le 76$ MB RSS).

---

## 2. Workspaces & Features

### 2.1 Sequence Tools
- **Reverse / Complement / Reverse Complement**: Standard DNA/RNA complementation with complete 15-character IUPAC ambiguity code support.
- **DNA $\leftrightarrow$ RNA Transcription**: Converts `T` $\rightarrow$ `U` and vice-versa while preserving uppercase/lowercase casing.
- **Six-Frame Translation**: Translates nucleotide sequences across frames +1, +2, +3, -1, -2, -3 using the standard genetic code (`*` denotes stop codon).
- **CRISPR PAM Scanner**: Scans sequences for CRISPR protospacer adjacent motifs (e.g., SpCas9 `NGG`, SaCas9 `NNGRRT`).
- **Restriction Enzyme Scanner**: Identifies restriction sites (e.g., EcoRI `G^AATTC`, BamHI `G^GATCC`) with cut position highlights.

---

### 2.2 Inspect Workspace
- **FASTA & FASTQ Statistics**: Streams sequence files line-by-line to compute record count, base count, min/avg/max length, and GC content.
- **Sequencing Quality Control (FASTQ QC)**: Computes Phred quality score distributions across position cycles and calculates Q20 and Q30 metrics.
- **Format Detection & Validation**: Automatically detects standard and wrapped formats, identifying syntax errors (e.g., mismatched quality string lengths, invalid headers).

---

### 2.3 File Tools Workspace
- **Smart Splitter**: Splits large FASTA/FASTQ files by maximum file size (MB) or record count, preserving record boundaries and generating an integrity manifest.
- **Sequence Extractor by ID**: Extracts specific sequence records from a multi-FASTA/FASTQ file based on a list of target header IDs.
- **File Merger**: Merges multiple sequence files into a single unified FASTA/FASTQ file.
- **SHA-256 Checksums**: Computes and verifies SHA-256 cryptographic fingerprints to verify file integrity after transfers.

---

### 2.4 Protein Studio
- **Protein Property Calculator**: Computes molecular weight (kDa), isoelectric point (pI), and Kyte-Doolittle hydropathy profile.
- **AlphaFold DB Structure Fetcher `[ONLINE]`**: Retrieves predicted 3D CIF/PDB structures from AlphaFold DB using UniProt accession numbers with per-residue pLDDT confidence coloring.
- **PDB ATOM FASTA Extractor**: Extracts FASTA sequences directly from ATOM records of PDB structure files.

---

## 3. Help & Tester Feedback

Click **Help & Feedback** in the top navigation bar to open the feedback exporter modal. You can enter comments, rate task difficulty, and copy or export sanitized markdown reports to send to the development team.
