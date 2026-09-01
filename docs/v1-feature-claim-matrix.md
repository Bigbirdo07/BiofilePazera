# BioFile Toolkit V1 — Feature Claim Matrix

This document tracks all advertised features in BioFile Toolkit V1 against their backend implementation, automated test coverage, performance validation, and release readiness status.

| Feature | Advertised Behavior | Backend Implementation | Frontend Implementation | Automated Tests | Large-File Tested? | Scientific Reference Test? | Known Limitations | Release Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DNA Reverse Complement** | Reverses and complements DNA sequence with IUPAC ambiguity handling | `sequence.rs` (`reverse_complement_seq`) | `SequenceTools.tsx` | Yes (`test_reverse_complement`) | Yes | Yes (IUPAC mapping) | None | **Ready** |
| **DNA ↔ RNA Transcription** | Converts T ↔ U while preserving casing and ambiguity | `sequence.rs` (`dna_to_rna`) | `SequenceTools.tsx` | Yes | Yes | Yes | None | **Ready** |
| **Six-Frame Translation** | Translates sequence across reading frames +1, +2, +3, -1, -2, -3 | `translation.rs` (`translate_sequence`) | `SequenceTools.tsx` | Yes | Yes | Yes | Standard genetic code | **Ready** |
| **GC & Base Statistics** | Calculates length, A, C, G, T, U, N, and GC% | `statistics.rs` (`calculate_sequence_stats`) | `SequenceTools.tsx` | Yes (`test_gc_content_calculation`) | Yes | Yes | Canonical base denominator | **Ready** |
| **Wrapped FASTQ Parser** | Streams wrapped FASTQ records without assuming 4-line boundary | `fastq.rs` (`FastqStreamReader`) | `FileTools.tsx` | Yes (`test_wrapped_fastq_parsing`) | Yes | Yes | Requires valid `@` header and `+` separator | **Needs Torture Tests** |
| **Streaming FASTA Parser** | Streams multi-record FASTA files | `fasta.rs` (`FastaStreamReader`) | `FileTools.tsx` | Yes (`test_streaming_fasta_parsing`) | Yes | Yes | None | **Ready** |
| **Biologically Aware Validator** | Validates FASTQ/FASTA structures with error capping | `validate.rs` (`validate_file`) | `FileTools.tsx` | Yes | Yes | Yes | Preview capped at 1,000 errors | **Ready** |
| **Record-Aware Smart Splitter** | Splits files by MB, record count, or parts preserving biological boundaries | `split.rs` (`split_sequence_file`) | `FileTools.tsx` | Yes | Yes | Yes | Single giant record preserved intact | **Ready** |
| **Sequence Extractor by ID** | Extracts records matching target ID list | `extract.rs` (`extract_sequences_by_id`) | `FileTools.tsx` | Yes | Yes | Yes | Supports exact or substring match | **Ready** |
| **SHA-256 Checksum** | Computes and verifies single-pass SHA-256 file hashes | `checksum.rs` (`calculate_file_sha256`) | `FileTools.tsx` | Yes | Yes | Yes | Hex string comparison | **Ready** |
| **Multi-File Merger** | Merges multiple FASTA or FASTQ files sequentially with format validation | `merge.rs` (`merge_sequence_files`) | `FileTools.tsx` | Yes (`test_merge_fasta_files`) | Yes | Yes | Requires matching format (all FASTA or FASTQ) | **Ready** |
| **FastQC Quality Dashboard** | Computes Q20 %, Q30 %, mean Phred score, and per-base quality decay | `quality.rs` (`generate_fastq_qc_report`) | `Inspect.tsx` | Yes | Yes | Yes | Phred+33 ASCII encoding | **Ready** |
| **CRISPR & Restriction Scanner** | Scans sequence for restriction enzyme cut sites & CRISPR PAMs | `motif.rs` (`scan_sequence_for_motifs`) | `Inspect.tsx` | Yes | Yes | Yes | Linear sequence assumption | **Ready** |
| **AlphaFold 3D Viewer** | Fetches predicted 3D structure from AlphaFold DB with pLDDT coloring | `protein.rs` (`extract_fasta_from_pdb_text`) | `ProteinStudio.tsx` | Yes | Yes | Yes | Requires UniProt ID or local PDB | **Ready (Labeled Online)** |
| **Physicochemical Studio** | Calculates MW (kDa), pI, hydropathy plot, secondary structure propensity | `protein.rs` (`calculate_protein_properties`) | `ProteinStudio.tsx` | Yes | Yes | Yes | Kyte-Doolittle scale (window 9) | **Ready** |
| **Lab Notebook Exporter** | Exports structured JSON report of validation, QC, and motif findings | Frontend service / JSON serializer | `Inspect.tsx` | Yes | Yes | Yes | JSON schema v1.0 | **Ready** |
