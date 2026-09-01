# BioFile Toolkit V1 — RC Scientist Test Dataset Package

**Version**: `1.0.0-rc.1`  
**Purpose**: Small, public-safe synthetic datasets for beta testers to complete guided usability tasks in `docs/rc-scientist-test-protocol.md`.

---

## Complete Test Pack Files & Task Mapping

| File Name | Description & Contents | Associated Usability Task |
| :--- | :--- | :--- |
| `valid_small.fasta` | Standard 3-record nucleotide FASTA file (`seq1`, `seq2`, `seq3`) | **Task 4** (Inspect), **Task 8** (Extractor), **Task 9** (Checksum) |
| `invalid_small.fasta` | Intentionally malformed FASTA file (sequence line preceding header) | **Task 5** (Validator Error Testing) |
| `valid_small.fastq` | Standard 4-line FASTQ file with Phred+33 quality scores | **Task 6** (Sequencing QC & Phred distribution) |
| `large_split_test.fastq` | ~7.1 MB FASTQ file containing 50,000 Illumina reads | **Task 7** (Smart Splitter by Size/Records/Parts) |
| `gzipped_sample.fastq.gz` | Gzip-compressed 1,000-read FASTQ file | **Gzip Transparent Processing Verification** |
| `wrapped.fastq` | Wrapped 6-line FASTQ file for wrapped parser validation | **Wrapped FASTQ Parser Verification** |
| `invalid_quality.fastq` | Mismatched sequence and quality string lengths | **Validator Error & QC Safety Testing** |
| `protein_example.fasta` | Standard SARS-CoV-2 Spike amino acid sequence FASTA | **Sequence Tools** (Protein Physicochemical Analysis) |
| `structure_example.pdb` | Synthetic PDB structure file with ATOM records | **Task 10** & **Protein Studio** (PDB $\rightarrow$ FASTA extraction) |
| `id_list.txt` | Target sequence IDs (`seq1`, `seq3`) | **Task 8** (Extract Sequences by ID) |
| `checksum_example.sha256` | Verified SHA-256 hash matching `valid_small.fasta` (`f341b594...`) | **Task 9** (SHA-256 Verification) |
| `merge_part_1.fasta` | FASTA Part 1 (`merge_seq1`, `merge_seq2`) | **File Merger Tool** |
| `merge_part_2.fasta` | FASTA Part 2 (`merge_seq3`, `merge_seq4`) | **File Merger Tool** |
