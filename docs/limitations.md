# BioFile Toolkit V1 — System Scope & Limitations

**Version**: `1.0.0-rc.2`

---

## 1. Out-of-Scope Capabilities

To maintain high performance and computational clarity, BioFile Toolkit V1 is specifically designed for sequence file manipulation, inspection, splitting, and translation.

BioFile Toolkit V1 is **NOT**:
- **A Sequence Aligner**: Does not perform local alignment (Smith-Waterman), global alignment (Needleman-Wunsch), or read alignment (BWA, STAR, Bowtie).
- **A Variant Caller**: Does not call SNPs or indels from BAM/CRAM files (GATK, FreeBayes).
- **A Genome Assembler**: Does not perform de novo assembly (SPAdes, Flye).
- **A Full Off-Target CRISPR Predictor**: Scans for PAM motifs (`NGG`, `NNGRRT`), but does not compute genome-wide off-target mismatch scores.
- **A Clinical Interpretation Platform**: Tools are intended strictly for scientific research and dataset manipulation, not diagnostic or clinical decision support.
- **An AlphaFold Inference Engine**: Does not run AlphaFold neural networks locally; fetches precomputed predictions from AlphaFold DB.

---

## 2. Operating Systems & Platform Support Status

| Platform | Support Level | Build Artifact Target | Notes |
| :--- | :--- | :--- | :--- |
| **macOS (Apple Silicon & Intel)** | **Tested (Primary)** | `.app` / `.dmg` | Tested on Darwin arm64 |
| **Windows (x64)** | *Experimental* | `.msi` / `.exe` | Tauri target configured |
| **Linux (x86_64)** | *Experimental* | `.AppImage` / `.deb` | Tauri target configured |
