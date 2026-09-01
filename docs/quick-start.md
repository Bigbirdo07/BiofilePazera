# BioFile Toolkit V1 — Quick Start Guide

**Version**: `1.0.0-rc.1`  
**Target Audience**: Bench scientists, molecular biologists, and researchers seeking fast sequence utilities without command line complexity.

---

## 5-Minute Quick Start

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Open BioFile Toolkit                                    │
│ 2. Drag & Drop a FASTA/FASTQ file OR paste a DNA sequence   │
│ 3. Choose your action (Translate, Inspect, Split, QC)       │
│ 4. Review results & Export to CSV / FASTA / Report          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Workflows

### 1. Reverse Complement & Translate DNA
1. Click **Sequence Tools** in the top navigation bar.
2. Paste your nucleotide sequence into the text area.
3. Click **Reverse Complement** or view the **Six-Frame Translation** table below.
4. Click **Copy** to copy the protein translation to your clipboard.

---

### 2. Inspect FASTA or FASTQ Files
1. Click **Inspect** in the top navigation bar.
2. Drag and drop your `.fasta`, `.fastq`, `.fa.gz`, or `.fq.gz` file onto the dropzone.
3. BioFile Toolkit streams your file locally and instantly displays:
   - Total Record Count & Base Count
   - GC Content Percentage
   - Read Length Histogram
   - Phred Quality Metrics (Q20 / Q30) for FASTQ files

---

### 3. Split Large Sequencing Files
1. Click **File Tools** $\rightarrow$ **Smart Splitter**.
2. Select your input FASTQ or FASTA file.
3. Choose your split strategy (e.g., *Max File Size: 100 MB* or *Max Records: 500,000*).
4. Click **Execute Split**. Output files and an integrity manifest (`manifest.json`) are written directly to your chosen folder.

---

### 4. Fetch Predicted Protein Structure
1. Click **Protein Studio** in the top navigation bar.
2. Enter a UniProt Accession ID (e.g., `P0DTC2`).
3. Click **Fetch Structure [ONLINE]**.
4. BioFile Toolkit retrieves the 3D predicted PDB structure from AlphaFold DB with interactive pLDDT residue confidence scoring.

---

## Privacy & Safety Guarantee

- **100% Local File Processing**: Your biological sequence files, FASTA headers, and FASTQ data **never leave your computer**.
- **Network Actions Labeled**: Online database lookups (UniProt & AlphaFold DB) display an explicit `[ONLINE]` badge so you always know when network requests occur.
