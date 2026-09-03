# BioFile Toolkit V1 — Privacy & Network Boundary Declaration

**Version**: `1.0.0-rc.2`

---

## 1. Core Local-First Guarantee

BioFile Toolkit is engineered as a **local-first desktop application**:

1. **Zero Sequence Data Telemetry**: Your sequence files (FASTA, FASTQ, PDB), biological sequence strings, headers, and local folder structures are processed **100% locally on your computer**.
2. **No Automatic Uploads**: BioFile Toolkit does not automatically upload analytics, file metadata, or usage statistics to remote servers.

---

## 2. External Network Lookups

The only network operations in BioFile Toolkit occur when the user explicitly requests an online lookup in **Protein Studio**:

- **UniProt DB API**: Resolves UniProt accession numbers to protein metadata.
- **AlphaFold DB API**: Fetches predicted 3D structure CIF/PDB files.

### UI Labeling Transparency
All external database operations display an explicit **`[ONLINE]`** badge in the interface to ensure users are aware that a remote network request will be made.

---

## 3. Voluntary RC Feedback Export

The **Help & Feedback** exporter allows testers to voluntarily export Markdown feedback reports. Log data sanitization is **enabled by default** to ensure sequence strings and full private file paths are excluded from exported reports.
