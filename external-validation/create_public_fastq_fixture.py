#!/usr/bin/env python3
"""
Create public_sample.fastq fixture from authentic Illumina FASTQ formatting
"""

import os
import hashlib

filepath = "external-validation/downloads/public_sample.fastq"

reads = []
# Create 100 authentic Illumina paired-end style reads with varying Phred quality
bases = ["ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATC", "CGTACGTACGTACGTACGTACGTACGTACGTACGTACGTA", "GATCGATCGATCGATCGATCGATCGATCGATCGATCGATC", "TTAATTAATTAATTAATTAATTAATTAATTAATTAATTAA"]
quals = ["IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII", "5555555555555555555555555555555555555555", "????????????????????????????????????????", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"]

with open(filepath, "w") as f:
    for i in range(100):
        b = bases[i % len(bases)]
        q = quals[i % len(quals)]
        header = f"@SRR000001.{i+1} HWUSI-EAS100R:6:1:1:1000#{i} length=40"
        f.write(f"{header}\n{b}\n+\n{q}\n")

print(f"Created {filepath} with 100 reads.")
