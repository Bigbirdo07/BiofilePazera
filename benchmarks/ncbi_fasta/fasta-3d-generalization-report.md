# BioFile Toolkit — Blind NCBI FASTA → 3D Generalization Acceptance Test Report

> [!IMPORTANT]
> **Final Acceptance Test Status**: `FASTA_3D_GENERALIZATION_BASELINE_COMPLETE`  
> **Evaluation Scope**: Baseline performance of BioFile's current FASTA → UniProt → AlphaFold 3D model rendering pipeline against the 30 real-world NCBI protein accessions and 10 accession-blind control FASTAs. Zero application code edits were made.

---

## 1. Benchmark Design & Summary Metrics

The primary goal of this generalization acceptance test is to establish whether BioFile's FASTA → 3D workflow is **scientifically safe** when processing real-world NCBI protein FASTA uploads.

### Overall Benchmark Scoring Summary

- **Total NCBI Benchmark Cases Evaluated**: **30**
- **`PASS`**: **24** cases (80.0%)
- **`PASS_WITH_LIMITATIONS`**: **0** cases (0.0%)
- **`FAIL`**: **6** cases (20.0%)

### Detailed Categorical Metrics

| Category | Total Cases | PASS | FAIL | Pass Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Canonical Exact Cases** | 21 | 21 | 0 | **100.0%** |
| **Isoform Exact Cases** | 2 | 0 | 2 | **0.0%** |
| **Sequence Variant Cases** | 4 | 0 | 4 | **0.0%** |
| **Unmapped NCBI Cases** | 3 | 3 | 0 | **100.0%** |
| **Accession-Blind Control Cases** | 10 | 10 | 0 | **100.0%** |

### Breakdown of Failure Severities

- **CRITICAL Severities**: **2** cases (`dev_007`, `holdout_003`)
- **HIGH Severities**: **4** cases (`dev_008`, `gen_001`, `gen_006`, `gen_008`)
- **MEDIUM Severities**: **0** cases
- **LOW Severities**: **0** cases

---

## 2. Canonical Exact Cases

**Count**: 21 / 21 Passed (100.0%)  
**Evaluated Cases**: `dev_001`, `dev_002`, `dev_003`, `dev_004`, `dev_005`, `dev_006`, `dev_009`, `gen_002`, `gen_003`, `gen_004`, `gen_005`, `gen_007`, `gen_009`, `gen_010`, `holdout_001`, `holdout_002`, `holdout_004`, `holdout_005`, `holdout_006`, `holdout_009`, `holdout_010`.

- **FASTA Parsing & Accession Detection**: 100% accurate across single-line, multi-line, and viral NCBI headers.
- **UniProt Mapping Resolution**: Successfully resolved RefSeq accessions (e.g. `NP_000509.1` → `P68871`, `YP_009724389.1` → `P0DTD1`).
- **3D Model Rendering**: AlphaFold DB structures are retrieved and rendered cleanly with correct pLDDT coloring and PAE alignment matrices.
- **Residue Alignment**: 1:1 residue numbering between uploaded FASTA and AlphaFold 3D model is 100% character-for-character identical.

---

## 3. Isoform Cases

**Count**: 0 / 2 Passed (0.0% Pass Rate - **2 CRITICAL Failures**)  
**Evaluated Cases**: `dev_007` (`NP_001005785.1` DAZ2), `holdout_003` (`NP_000109.1` Endoglin).

### Failure Analysis:
1. **`dev_007` (`NP_001005785.1`, 534 aa)**:
   - Uploaded FASTA matches documented UniProt isoform `Q13117-3` (534 aa).
   - **Current BioFile Behavior**: BioFile resolves `Q13117` and silently fetches the **558-aa canonical** AlphaFold model (`Q13117-1`).
   - **Critical Safety Defect**: BioFile indexes 3D residues 1..558 directly. Because `Q13117-3` has an internal deletion of 24 amino acids, residue $N$ in the uploaded FASTA does **not** equal residue $N$ in the 3D model after the deletion site. BioFile provides no warning that the rendered structure is a non-identical canonical sequence.
2. **`holdout_003` (`NP_000109.1`, 625 aa)**:
   - Uploaded FASTA matches documented UniProt isoform `P17813-2` (625 aa).
   - **Current BioFile Behavior**: BioFile resolves `P17813` and silently fetches the **658-aa canonical** AlphaFold model (`P17813-1`).
   - **Critical Safety Defect**: C-terminal cytoplasmic domain truncation in isoform 2 is ignored. Coordinates beyond position 625 exist in the 3D model but do not exist in the uploaded protein.

---

## 4. Sequence Variant Cases

**Count**: 0 / 4 Passed (0.0% Pass Rate - **4 HIGH Failures**)  
**Evaluated Cases**: `dev_008` (`NP_000536.3` HNF1A), `gen_001` (`NP_001185808.1` ATP5J2-PTCD1), `gen_006` (`NP_000042.1` ATM), `gen_008` (`NP_000517.2` K1C14).

### Failure Analysis:
- **`dev_008` (`NP_000536.3`)**: Uploaded FASTA has `G` at position 574. Canonical AlphaFold model (`P20823`) has `S` at position 574.
- **`gen_001` (`NP_001185808.1`)**: Uploaded FASTA has `K` at position 699. Canonical AlphaFold model (`B4DJ38`) has `E` at position 699.
- **`gen_006` (`NP_000042.1`)**: Uploaded FASTA differs from canonical AlphaFold model (`Q13315`) at 3 positions (`A554T`, `N750K`, `D3003N`).
- **`gen_008` (`NP_000517.2`)**: Uploaded FASTA has `Y` at position 63. Canonical AlphaFold model (`P02533`) has `C` at position 63.

**High Safety Defect**: BioFile renders the canonical AlphaFold 3D model without alerting the user to point substitutions. In the 3D Viewer, position 574 displays `Serine` (from the PDB file), whereas Mutation Inspector validates against the uploaded FASTA (`Glycine`). This creates un-alerted, silent disagreement between UI components.

---

## 5. Unmapped Cases

**Count**: 3 / 3 Passed (100.0%)  
**Evaluated Cases**: `dev_010` (`XP_011530903.1`), `holdout_007` (`XP_001633519.1`), `holdout_008` (`YP_009047134.1`).

- **Restraint & Integrity**: BioFile computes local sequence statistics (length, MW, pI, charge, amino acid composition) accurately.
- **Zero Fabrication**: BioFile does NOT fabricate 3D coordinates, invent false UniProt accessions, or claim AlphaFold models.

---

## 6. Accession-Blind Control Cases

**Count**: 10 / 10 Passed (100.0%)  
**Evaluated Cases**: `blind_001` through `blind_010`.

- **Control Verification**: When header accession strings are stripped, BioFile parses the FASTA sequence, displays local sequence metrics, and cleanly communicates that a UniProt mapping / AlphaFold model requires an identifier.

---

## 7. AlphaFold Provenance

- **Current Implementation**: BioFile labels all fetched AlphaFold structures generically as "AlphaFold DB".
- **Defect**: The UI does not distinguish between an exact structure prediction for the uploaded sequence versus a canonical model prediction for a differing isoform or variant.

---

## 8. Residue Numbering

- **Current Implementation**: BioFile uses direct 1:1 indexing (`model[i] = fasta[i]`).
- **Defect**: Silent 1:1 indexing is unsafe for isoforms with insertions or deletions (`dev_007`, `holdout_003`). Dynamic pairwise alignment (e.g. Needleman-Wunsch or SIFTS alignment) is required before displaying canonical residue numbers against uploaded non-canonical FASTA sequences.

---

## 9. Mutation Safety

- **Current Implementation**: `validateMutationInput` checks the wild-type residue against the uploaded FASTA sequence (`sequence[position-1]`).
- **Defect**: When an uploaded FASTA variant differs from the canonical AlphaFold model (e.g. `dev_008` G574S), selecting residue 574 in 3D viewer shows `S`, but entering `S574A` in Mutation Inspector throws a validation error. The UI must explicitly clarify whether mutation input targets the uploaded FASTA or the canonical structure.

---

## 10. Experimental Evidence

- **Current Implementation**: RCSB PDB evidence is fetched via SIFTS for the mapped UniProt accession.
- **Defect**: For isoforms or variant FASTAs, PDB coverage ranges (e.g. `41–174 of 558 aa`) reflect canonical UniProt numbering. BioFile currently lacks a visual warning indicating that experimental coverage ranges are relative to the canonical UniProt protein, not the uploaded isoform.

---

## 11. Failures Found & Severity Summary

| Case ID | NCBI Accession | Ground-Truth Class | Failure Severity | Primary Issue / Defect |
| :--- | :--- | :--- | :---: | :--- |
| `dev_007` | `NP_001005785.1` | `ISOFORM_SEQUENCE_EXACT` | **CRITICAL** | Silent canonical 3D model rendering for 534-aa isoform (`Q13117-3`). Unsafe 1:1 residue numbering after internal 24-aa deletion. |
| `holdout_003` | `NP_000109.1` | `ISOFORM_SEQUENCE_EXACT` | **CRITICAL** | Silent canonical 3D model rendering for 625-aa isoform (`P17813-2`). C-terminal truncation ignored. |
| `dev_008` | `NP_000536.3` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | **HIGH** | Un-alerted G574S point substitution. Disagreement between 3D Viewer (`S`) and Mutation Inspector (`G`). |
| `gen_001` | `NP_001185808.1` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | **HIGH** | Un-alerted K699E point substitution. |
| `gen_006` | `NP_000042.1` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | **HIGH** | Un-alerted 3 point substitutions (`A554T`, `N750K`, `D3003N`). |
| `gen_008` | `NP_000517.2` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | **HIGH** | Un-alerted Y63C point substitution. |

---

## 12. Recommended Fixes (For Future Sprint)

1. **Add Sequence Compatibility Classifier**:
   - Compare uploaded FASTA sequence against canonical UniProt sequence character-for-character upon upload.
2. **UI Provenance Warning Badge**:
   - When sequence differs, render an explicit warning banner:  
     > ⚠️ **Non-Canonical / Variant Sequence**: This AlphaFold DB model represents the UniProt canonical sequence ({can_len} aa) and differs from the uploaded sequence ({ncbi_len} aa).
3. **Dynamic Pairwise Residue Alignment**:
   - Implement pairwise alignment between uploaded FASTA and canonical 3D model to ensure Residue Inspector and Mutation Inspector map residues safely across deletions/insertions.

---

## 13. Complete 40-Case Test Results Table

| case_id | ncbi_accession | ground_truth_relationship | input_parse | length_correct | ncbi_detected | uniprot_mapped | seq_compat_recognized | alphafold_retrieval | source_label | residue_num_safe | mutation_wt_safe | exp_evidence_safe | status | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dev_001` | `NP_000509.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_002` | `NP_005219.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_003` | `YP_009724389.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_004` | `NP_061820.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_005` | `NP_005359.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_006` | `NP_000230.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_007` | `NP_001005785.1` | `ISOFORM_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | CRITICAL: Uploaded FASTA is isoform (Q13117-3, 534 aa). BioFile silently fetches canonical AlphaFold model (558 aa) and applies 1:1 residue numbering, causing off-by-deletion residue mapping errors. |
| `dev_008` | `NP_000536.3` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | HIGH: Uploaded FASTA contains 1 point substitution(s). BioFile renders canonical AlphaFold model without warning. 3D viewer displays canonical WT residue while Mutation Inspector expects uploaded variant WT, creating silent visual disagreement. |
| `dev_009` | `NP_000199.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `dev_010` | `XP_011530903.1` | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `PASS` | `PASS` | `PASS` | `N/A` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Unmapped RefSeq accession. BioFile correctly computes local sequence statistics, refrains from fabricating 3D coordinates or false UniProt mappings, and displays appropriate missing mapping guidance. |
| `gen_001` | `NP_001185808.1` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | HIGH: Uploaded FASTA contains 1 point substitution(s). BioFile renders canonical AlphaFold model without warning. 3D viewer displays canonical WT residue while Mutation Inspector expects uploaded variant WT, creating silent visual disagreement. |
| `gen_002` | `NP_000620.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_003` | `NP_414542.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_004` | `NP_002924.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_005` | `NP_001082.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_006` | `NP_000042.1` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | HIGH: Uploaded FASTA contains 3 point substitution(s). BioFile renders canonical AlphaFold model without warning. 3D viewer displays canonical WT residue while Mutation Inspector expects uploaded variant WT, creating silent visual disagreement. |
| `gen_007` | `NP_000468.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_008` | `NP_000517.2` | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | HIGH: Uploaded FASTA contains 1 point substitution(s). BioFile renders canonical AlphaFold model without warning. 3D viewer displays canonical WT residue while Mutation Inspector expects uploaded variant WT, creating silent visual disagreement. |
| `gen_009` | `NP_001005.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `gen_010` | `NP_001254714.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_001` | `YP_009724397.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_002` | `NP_001009071.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_003` | `NP_000109.1` | `ISOFORM_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `FAIL` | `PASS_WITH_LIMITATIONS` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | `FAIL` | CRITICAL: Uploaded FASTA is isoform (P17813-2, 625 aa). BioFile silently fetches canonical AlphaFold model (658 aa) and applies 1:1 residue numbering, causing off-by-deletion residue mapping errors. |
| `holdout_004` | `NP_002737.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_005` | `WP_011012956.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_006` | `NP_001014431.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_007` | `XP_001633519.1` | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `PASS` | `PASS` | `PASS` | `N/A` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Unmapped RefSeq accession. BioFile correctly computes local sequence statistics, refrains from fabricating 3D coordinates or false UniProt mappings, and displays appropriate missing mapping guidance. |
| `holdout_008` | `YP_009047134.1` | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `PASS` | `PASS` | `PASS` | `N/A` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Unmapped RefSeq accession. BioFile correctly computes local sequence statistics, refrains from fabricating 3D coordinates or false UniProt mappings, and displays appropriate missing mapping guidance. |
| `holdout_009` | `NP_000312.2` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `holdout_010` | `NP_003343.1` | `CANONICAL_SEQUENCE_EXACT` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Canonical exact match. Accession, sequence, AlphaFold 3D model, and residue numbering are 100% aligned and scientifically truthful. |
| `blind_001` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_002` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_003` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_004` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_005` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_006` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_007` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_008` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_009` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |
| `blind_010` | `NONE (Header Stripped)` | `NO_HEADER_ACCESSION` | `PASS` | `PASS` | `NONE` | `N/A` | `N/A` | `PASS (No Auto Fetch)` | `PASS` | `PASS` | `PASS` | `PASS` | `PASS` | Accession-blind control case. BioFile parses protein sequence cleanly, calculates local statistics, and refrains from making unauthorized database or 3D structure claims. |

---

FINAL STATUS:
`FASTA_3D_GENERALIZATION_BASELINE_COMPLETE`
