#!/usr/bin/env python3
"""
GENERATE TEST PACK FILES FOR SCIENTIST BETA TESTING
BioFile Toolkit V1 RC1
"""

import os
import gzip

DEST_DIR = "rc-test-data"
os.makedirs(DEST_DIR, exist_ok=True)

# 1. Generate large_split_test.fastq (~10 MB FASTQ file with 50,000 reads)
large_fastq_path = os.path.join(DEST_DIR, "large_split_test.fastq")
print(f"Generating {large_fastq_path}...")
bases = [
    "ATGCCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA",
    "CGTACGTACGTACGTACGTACGTACGTACGTACGTACGTA",
    "GATCGATCGATCGATCGATCGATCGATCGATCGATCGATC",
    "TTAATTAATTAATTAATTAATTAATTAATTAATTAATTAA"
]
quals = [
    "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
    "5555555555555555555555555555555555555555",
    "????????????????????????????????????????",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
]

with open(large_fastq_path, "w") as f:
    for i in range(50000):
        b = bases[i % len(bases)]
        q = quals[i % len(quals)]
        header = f"@SRR_BETA_TEST.{i+1} HWUSI-EAS100R:6:1:1:{1000+i}#{i%4} length=40"
        f.write(f"{header}\n{b}\n+\n{q}\n")

print(f"Created {large_fastq_path} ({os.path.getsize(large_fastq_path)} bytes).")

# 2. Generate gzipped_sample.fastq.gz (1,000 reads compressed)
gz_fastq_path = os.path.join(DEST_DIR, "gzipped_sample.fastq.gz")
print(f"Generating {gz_fastq_path}...")
with gzip.open(gz_fastq_path, "wt") as gz:
    for i in range(1000):
        b = bases[i % len(bases)]
        q = quals[i % len(quals)]
        header = f"@GZ_SAMPLE.{i+1} Illumina_Run_GZ length=40"
        gz.write(f"{header}\n{b}\n+\n{q}\n")

print(f"Created {gz_fastq_path} ({os.path.getsize(gz_fastq_path)} bytes).")

# 3. Generate merge_part_1.fasta & merge_part_2.fasta
part1_path = os.path.join(DEST_DIR, "merge_part_1.fasta")
part2_path = os.path.join(DEST_DIR, "merge_part_2.fasta")

with open(part1_path, "w") as f:
    f.write(">merge_seq1 Part 1 Sequence A\nATGCGATCGATCGATC\n>merge_seq2 Part 1 Sequence B\nCGTACGTACGTACGTA\n")

with open(part2_path, "w") as f:
    f.write(">merge_seq3 Part 2 Sequence C\nGATCGATCGATCGATC\n>merge_seq4 Part 2 Sequence D\nTTAATTAATTAATTAA\n")

print("Created merge test parts 1 & 2.")
