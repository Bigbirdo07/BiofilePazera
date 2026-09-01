#!/usr/bin/env python3
"""
INDEPENDENT PUBLIC REFERENCE CALCULATOR
BioFile Toolkit V1 RC1 Validation

This script is completely independent of BioFile Toolkit implementation code.
It provides simple, auditable reference calculations using standard Python algorithms
and biological rules for validating BioFile Toolkit outputs.
"""

import sys
import os
import hashlib
import json

# Standard Genetic Code Table
CODON_TABLE = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
}

# IUPAC DNA Complementation Dictionary
IUPAC_COMPLEMENT = {
    'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
    'a': 't', 't': 'a', 'c': 'g', 'g': 'c',
    'U': 'A', 'u': 'a',
    'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W',
    'K': 'M', 'M': 'K', 'B': 'V', 'V': 'B',
    'D': 'H', 'H': 'D', 'N': 'N',
    'r': 'y', 'y': 'r', 's': 's', 'w': 'w',
    'k': 'm', 'm': 'k', 'b': 'v', 'v': 'b',
    'd': 'h', 'h': 'd', 'n': 'n',
}

# Kyte-Doolittle Hydropathy Values
KYTE_DOOLITTLE = {
    'I': 4.5, 'V': 4.2, 'L': 3.8, 'F': 2.8, 'C': 2.5,
    'M': 1.9, 'A': 1.8, 'G': -0.4, 'T': -0.7, 'S': -0.8,
    'W': -0.9, 'Y': -1.3, 'P': -1.6, 'H': -3.2, 'E': -3.5,
    'Q': -3.5, 'D': -3.5, 'N': -3.5, 'K': -3.9, 'R': -4.5
}

def calculate_sha256(file_path):
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def calculate_nucleotide_stats(seq):
    seq_upper = seq.upper()
    counts = {b: seq_upper.count(b) for b in ['A', 'C', 'G', 'T', 'U', 'N']}
    total_len = len(seq)
    canonical = counts['A'] + counts['C'] + counts['G'] + counts['T'] + counts['U']
    gc_count = counts['G'] + counts['C']
    gc_percent = (gc_count / canonical * 100.0) if canonical > 0 else 0.0
    return {
        'total_length': total_len,
        'counts': counts,
        'canonical_length': canonical,
        'gc_count': gc_count,
        'gc_percent': round(gc_percent, 4)
    }

def reverse_sequence(seq):
    return seq[::-1]

def complement_sequence(seq):
    return ''.join(IUPAC_COMPLEMENT.get(c, c) for c in seq)

def reverse_complement_sequence(seq):
    return complement_sequence(reverse_sequence(seq))

def dna_to_rna(seq):
    return seq.replace('T', 'U').replace('t', 'u')

def rna_to_dna(seq):
    return seq.replace('U', 'T').replace('u', 't')

def translate_dna(seq, frame=1, stop_at_stop=False):
    seq_clean = seq.upper().replace('U', 'T')
    offset = (frame - 1) if frame > 0 else (-frame - 1)
    if frame < 0:
        seq_clean = reverse_complement_sequence(seq_clean)
    
    sub = seq_clean[offset:]
    protein = []
    for i in range(0, len(sub) - 2, 3):
        codon = sub[i:i+3]
        aa = CODON_TABLE.get(codon, 'X')
        if aa == '*' and stop_at_stop:
            protein.append(aa)
            break
        protein.append(aa)
    return ''.join(protein)

def six_frame_translation(seq):
    return {
        '+1': translate_dna(seq, frame=1),
        '+2': translate_dna(seq, frame=2),
        '+3': translate_dna(seq, frame=3),
        '-1': translate_dna(seq, frame=-1),
        '-2': translate_dna(seq, frame=-2),
        '-3': translate_dna(seq, frame=-3),
    }

def scan_restriction_sites(seq):
    seq_upper = seq.upper()
    enzymes = {
        'EcoRI': 'GAATTC',
        'BamHI': 'GGATCC',
        'HindIII': 'AAGCTT'
    }
    matches = {}
    for name, motif in enzymes.items():
        positions = []
        start = 0
        while True:
            pos = seq_upper.find(motif, start)
            if pos == -1:
                break
            positions.append(pos + 1) # 1-based position
            start = pos + 1
        matches[name] = {
            'count': len(positions),
            'positions': positions
        }
    return matches

def scan_spcas9_pam(seq):
    seq_upper = seq.upper()
    forward_pams = []
    for i in range(len(seq_upper) - 2):
        if seq_upper[i+1:i+3] == 'GG':
            forward_pams.append({
                'strand': '+',
                'zero_based_pos': i,
                'one_based_pos': i + 1,
                'pam': seq_upper[i:i+3]
            })
    
    rc = reverse_complement_sequence(seq_upper)
    reverse_pams = []
    for i in range(len(rc) - 2):
        if rc[i+1:i+3] == 'GG':
            reverse_pams.append({
                'strand': '-',
                'zero_based_pos': i,
                'one_based_pos': i + 1,
                'pam': rc[i:i+3]
            })
    return {
        'forward_count': len(forward_pams),
        'reverse_count': len(reverse_pams),
        'total_count': len(forward_pams) + len(reverse_pams),
        'forward_pams': forward_pams,
        'reverse_pams': reverse_pams
    }

def parse_fastq_quality(file_path):
    records = 0
    total_bases = 0
    q20_bases = 0
    q30_bases = 0
    min_len = float('inf')
    max_len = 0
    position_quality = {}

    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('@'):
            if i + 3 < len(lines):
                seq = lines[i+1].strip()
                plus = lines[i+2].strip()
                qual = lines[i+3].strip()
                if plus.startswith('+') and len(seq) == len(qual):
                    records += 1
                    length = len(seq)
                    total_bases += length
                    min_len = min(min_len, length)
                    max_len = max(max_len, length)

                    for pos, qchar in enumerate(qual):
                        qval = ord(qchar) - 33
                        if qval >= 20:
                            q20_bases += 1
                        if qval >= 30:
                            q30_bases += 1
                        
                        if pos not in position_quality:
                            position_quality[pos] = []
                        position_quality[pos].append(qval)

                    i += 4
                    continue
        i += 1

    q20_pct = (q20_bases / total_bases * 100.0) if total_bases > 0 else 0.0
    q30_pct = (q30_bases / total_bases * 100.0) if total_bases > 0 else 0.0
    
    mean_position_quality = {
        pos: round(sum(qvals) / len(qvals), 2)
        for pos, qvals in sorted(position_quality.items())
    }

    return {
        'record_count': records,
        'total_bases': total_bases,
        'min_length': min_len if records > 0 else 0,
        'max_length': max_len,
        'q20_bases': q20_bases,
        'q30_bases': q30_bases,
        'q20_percent': round(q20_pct, 4),
        'q30_percent': round(q30_pct, 4),
        'per_position_mean_quality': mean_position_quality
    }

def calculate_kyte_doolittle(seq, window_size=9):
    seq_upper = seq.upper()
    scores = []
    half_window = window_size // 2
    for i in range(len(seq_upper)):
        if i < half_window or i >= len(seq_upper) - half_window:
            continue
        window = seq_upper[i - half_window : i + half_window + 1]
        vals = [KYTE_DOOLITTLE.get(aa, 0.0) for aa in window]
        scores.append({
            'residue_index': i + 1,
            'residue': seq_upper[i],
            'hydropathy_score': round(sum(vals) / window_size, 3)
        })
    return scores

if __name__ == '__main__':
    print("Independent Reference Calculator Ready.")
