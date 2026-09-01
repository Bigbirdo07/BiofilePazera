# File Tools — Expected Results

## 01_valid_multi_record.fasta
- Records: 8
- IDs: seq_alpha, seq_beta, seq_gamma, seq_delta, seq_epsilon, seq_zeta, seq_eta, seq_theta
- Total sequence bases: 119

## Extraction
Using `02_ids_to_extract.txt` against `01_valid_multi_record.fasta`:
- Found: 3
- Missing: 1 (`seq_DOES_NOT_EXIST`)
- Expected found IDs:
  - seq_alpha
  - seq_delta
  - seq_theta

## Invalid files
- `03_invalid_no_header.fasta`: content occurs before the first FASTA header.
- `04_invalid_character.fasta`: contains invalid nucleotide `Z`.
- `05_empty_record.fasta`: first FASTA record has no sequence.
- `08_invalid_fastq_length_mismatch.fastq`: sequence length = 8, quality length = 7.

## 06_valid_quality_control.fastq
- Reads: 8
- Total bases: 96
- Read length: 12 bp for every read
- Q20%: 87.5000%
- Q30%: 66.6667%
- Q40%: 33.3333%

Phred+33 controls:
- `!` = Q0
- `5` = Q20
- `?` = Q30
- `I` = Q40

## 07_wrapped_fastq.fastq
- Records: 3
- Intended to verify wrapped sequence/quality parsing.
- Each record should have equal sequence and quality lengths after joining wrapped lines.

## Merge
Merging `09_merge_part1.fasta` then `10_merge_part2.fasta` should give:
- 4 records
- order: merge_a, merge_b, merge_c, merge_d

## Checksum
`11_checksum_target.txt`
Expected SHA-256:
`bf420c0aef1e808f999ef57c6cc845b26c49b3581a444d4ba39fd147848574f5`

## Split stress file
`13_split_stress_test_5000_reads.fastq`
- Reads: 5,000
- Read length: 100 bp
- Total sequence bases: 500,000
- All records must appear exactly once across split parts.
- Record order must be preserved.
