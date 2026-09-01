#!/usr/bin/env python3
import sys
import random
import os

def generate_fastq(filename, target_mb=10):
    target_bytes = int(target_mb * 1024 * 1024)
    bases = ['A', 'C', 'G', 'T']
    quals = 'IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII'
    read_length = 150
    
    current_bytes = 0
    read_count = 0
    
    print(f"Generating {target_mb} MB FASTQ file at '{filename}'...")
    with open(filename, 'w') as f:
        while current_bytes < target_bytes:
            read_count += 1
            header = f"@BENCHMARK_READ_{read_count:08d} length={read_length}\n"
            seq = "".join(random.choices(bases, k=read_length)) + "\n"
            sep = "+\n"
            qual_str = quals[:read_length] + "\n"
            
            record = f"{header}{seq}{sep}{qual_str}"
            f.write(record)
            current_bytes += len(record.encode('utf-8'))
            
    final_size_mb = os.path.getsize(filename) / (1024 * 1024)
    print(f"Successfully generated '{filename}' ({final_size_mb:.2f} MB, {read_count:,} reads).")

if __name__ == '__main__':
    target_mb = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0
    outfile = sys.argv[2] if len(sys.argv) > 2 else "benchmark_10mb.fastq"
    generate_fastq(outfile, target_mb)
