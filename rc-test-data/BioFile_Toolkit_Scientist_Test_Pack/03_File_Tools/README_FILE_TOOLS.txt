FILE TOOLS TESTS

VALIDATION / INSPECT
- 01_valid_multi_record.fasta
- 06_valid_quality_control.fastq
- 07_wrapped_fastq.fastq

ERROR HANDLING
- 03_invalid_no_header.fasta
- 04_invalid_character.fasta
- 05_empty_record.fasta
- 08_invalid_fastq_length_mismatch.fastq

EXTRACTION
- Source: 01_valid_multi_record.fasta
- IDs: 02_ids_to_extract.txt

MERGE
- 09_merge_part1.fasta
- 10_merge_part2.fasta

CHECKSUM
- 11_checksum_target.txt
- Expected SHA-256: 12_checksum_expected_sha256.txt

SPLITTING
- 13_split_stress_test_5000_reads.fastq
- Try split-by-record-count or a small size target such as ~250 KB.

GZIP
- .gz copies are included for FASTA, FASTQ, and the split stress file.
