#!/usr/bin/env python3
"""
PUBLIC REFERENCE DATASET FETCHER & PROVENANCE LOGGER
BioFile Toolkit V1 RC1 Validation
"""

import os
import sys
import hashlib
import json
import urllib.request
from datetime import datetime

DEST_DIR = "external-validation/downloads"
PROVENANCE_FILE = "external-validation/references/provenance.json"

os.makedirs(DEST_DIR, exist_ok=True)
os.makedirs("external-validation/references", exist_ok=True)
os.makedirs("external-validation/expected", exist_ok=True)
os.makedirs("external-validation/biofile-results", exist_ok=True)
os.makedirs("external-validation/screenshots", exist_ok=True)
os.makedirs("external-validation/reports", exist_ok=True)

REFERENCES = [
    {
        "id": "NCBI_TP53_FASTA",
        "database": "NCBI RefSeq",
        "accession": "NM_000546.6",
        "title": "Homo sapiens tumor protein p53 (TP53), transcript variant 1, mRNA",
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000546.6&rettype=fasta&retmode=text",
        "filename": "NM_000546.6.fasta"
    },
    {
        "id": "NCBI_TP53_GENBANK",
        "database": "NCBI RefSeq",
        "accession": "NM_000546.6",
        "title": "Homo sapiens tumor protein p53 (TP53), transcript variant 1, mRNA (GenBank Record)",
        "url": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000546.6&rettype=gb&retmode=text",
        "filename": "NM_000546.6.gb"
    },
    {
        "id": "UNIPROT_P53_FASTA",
        "database": "UniProtKB",
        "accession": "P04637",
        "title": "Cellular tumor antigen p53 (Homo sapiens)",
        "url": "https://rest.uniprot.org/uniprotkb/P04637.fasta",
        "filename": "P04637.fasta"
    },
    {
        "id": "RCSB_1UBQ_PDB",
        "database": "RCSB PDB",
        "accession": "1UBQ",
        "title": "Ubiquitin X-Ray Structure (76 residues)",
        "url": "https://files.rcsb.org/download/1UBQ.pdb",
        "filename": "1UBQ.pdb"
    },
    {
        "id": "RCSB_1CRN_PDB",
        "database": "RCSB PDB",
        "accession": "1CRN",
        "title": "Crambin X-Ray Structure 1.50 Angstrom (46 residues)",
        "url": "https://files.rcsb.org/download/1CRN.pdb",
        "filename": "1CRN.pdb"
    }
]

def calculate_sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def fetch_all():
    provenance = []
    print("Fetching authoritative public reference datasets...")

    for item in REFERENCES:
        dest_path = os.path.join(DEST_DIR, item["filename"])
        print(f"Downloading {item['id']} from {item['url']}...")
        req = urllib.request.Request(item['url'], headers={'User-Agent': 'Mozilla/5.0 (BioFileToolkit-Validation)'})
        with urllib.request.urlopen(req) as resp, open(dest_path, 'wb') as out:
            out.write(resp.read())
        
        file_size = os.path.getsize(dest_path)
        sha256 = calculate_sha256(dest_path)

        provenance_item = {
            "id": item["id"],
            "database": item["database"],
            "accession": item["accession"],
            "title": item["title"],
            "url": item["url"],
            "filename": item["filename"],
            "file_size_bytes": file_size,
            "sha256_hash": sha256,
            "retrieved_at_utc": datetime.utcnow().isoformat() + "Z"
        }
        provenance.append(provenance_item)
        print(f"Saved {item['filename']} ({file_size} bytes, SHA256: {sha256[:16]}...)")

    with open(PROVENANCE_FILE, 'w', encoding='utf-8') as f:
        json.dump(provenance, f, indent=2)

    print(f"\nSuccessfully logged provenance for {len(provenance)} public reference datasets in '{PROVENANCE_FILE}'.")

if __name__ == '__main__':
    fetch_all()
