# BioFile Toolkit V1 — Test Coverage & Subsystem Report

**Date**: August 31, 2026  
**Target Goal**: Minimum **100+ meaningful Rust tests** covering normal cases, edge cases, malformed input, scientific reference vectors, and property-based invariants.

---

## Subsystem Coverage Breakdown

| Subsystem | Initial Test Count | Target Test Count | Description |
| :--- | :--- | :--- | :--- |
| **Sequence Transformations** | 3 | 12 | Reverse, complement, reverse complement, DNA ↔ RNA, casing modes |
| **IUPAC Rules** | 2 | 10 | Complete 15-character IUPAC complement matrix, case preservation, wildcard matching |
| **Six-Frame Translation** | 3 | 12 | Standard genetic code reference sequences, reading frames +1..+3 & -1..-3, stop codons, ambiguous codons, partial codons |
| **GC & Base Statistics** | 2 | 10 | Canonical base denominator ($A+C+G+T$), ambiguous base exclusions, zero canonical base handling |
| **FASTA Streaming Parser** | 1 | 30 | Standard, multiline, single-base, empty, missing header, duplicate IDs, lowercase, IUPAC, invalid symbols, CRLF/LF, BOM, giant sequence line, wrapped, gzip, truncated gzip |
| **FASTQ Streaming Parser** | 1 | 40 | Standard 4-line, wrapped sequence/quality, `@` and `+` inside quality strings, sequence/quality length mismatch, missing `+`, missing quality, truncated final record, CRLF/LF, gzip, Phred ASCII extremes |
| **Record-Aware Splitter** | 1 | 10 | Part preservation invariants (`assert_split_preserves_records`), single giant record preservation, byte-identity checks |
| **Sequence Extractor** | 1 | 6 | Exact match vs substring match, missing IDs, duplicate target IDs |
| **Multi-File Merger** | 1 | 6 | FASTA merge, FASTQ merge, incompatible format rejection, sequence order preservation |
| **SHA-256 Checksums** | 1 | 6 | Empty file vector (`e3b0c44...`), binary vector, uppercase/lowercase verification, missing file handling |
| **FastQC Quality Control** | 1 | 10 | Phred+33 ASCII conversion (`!`=Q0, `5`=Q20, `?`=Q30, `I`=Q40), Q20/Q30 percentages, per-base mean score profile |
| **Restriction & CRISPR Scanner** | 1 | 10 | EcoRI, BamHI, HindIII cut offsets, palindromic dual-strand search, SpCas9 (`NGG`), SaCas9 (`NNGRRT`), custom IUPAC PAM patterns |
| **Protein & PDB Studio** | 2 | 10 | Physicochemical properties (MW kDa, pI), Kyte-Doolittle hydropathy profile, PDB ATOM FASTA extraction |
| **Property-Based Invariants** | 0 | 10 | Random FASTQ/FASTA `parse(write(record)) == record` invariants using `proptest` |

---

## Execution Command
To run all tests:
```bash
cargo test
```
