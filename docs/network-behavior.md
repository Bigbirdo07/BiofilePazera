# BioFile Toolkit V1 — Network Behavior & Local Privacy Documentation

## 1. Local Processing Guarantee
BioFile Toolkit V1 is designed as a **local-first desktop utility**.
- All FASTA, FASTQ, and Gzip sequence files are read, parsed, validated, split, extracted, merged, and checksummed **strictly on your computer's CPU**.
- Local sequence data, quality scores, and file contents are **NEVER** transmitted over the network or uploaded to any remote server.
- Zero analytics, zero telemetry SDKs, zero user tracking, zero remote logging.

---

## 2. External Network Endpoints

The application makes external network connections **ONLY** when a user explicitly initiates an online database lookup:

| Endpoint URL | Trigger Action | Data Sent | Data Received | User Visibility Label |
| :--- | :--- | :--- | :--- | :--- |
| `https://alphafold.ebi.ac.uk/files/AF-${uniprot_id}-F1-model_v4.pdb` | Clicking "Fetch AlphaFold 3D — Online" in Protein Studio | UniProt Accession ID string (e.g. `P0DTC2`) | Public PDB structure coordinate file | `ONLINE` |

### Key Privacy Policies:
1. **Explicit User Trigger**: Network requests occur ONLY when the user clicks the "Fetch AlphaFold 3D — Online" button.
2. **Accession-Only Transmission**: Only the target UniProt Accession ID string is transmitted. No local sequence file content or private data is ever included in requests.
3. **Graceful Offline Fallback**: If the computer is offline or the network request fails, the application remains 100% functional for all local file processing, sequence tools, and PDB file loading.
