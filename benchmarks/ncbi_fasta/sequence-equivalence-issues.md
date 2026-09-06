# BioFile Toolkit — NCBI FASTA ↔ UniProt Sequence Equivalence Audit Issues & Safety Report

> [!IMPORTANT]
> **Audit Status**: `NCBI_UNIPROT_SEQUENCE_EQUIVALENCE_AUDIT_COMPLETE`  
> **Scientific Requirement**: Database accession mapping (`RefSeq → UniProt`) is **insufficient** for direct FASTA→3D model rendering. BioFile must establish character-for-character sequence equivalence to determine if an uploaded FASTA sequence matches the AlphaFold canonical 3D model, matches a documented UniProt isoform, or contains variant point substitutions.

---

## 1. Summary Metrics for Database-Mapped Cases

- **Total Database-Mapped Cases Evaluated**: **27 / 27**
- **`CANONICAL_SEQUENCE_EXACT`**: **21** cases (77.8%)
- **`ISOFORM_SEQUENCE_EXACT`**: **2** cases (7.4%)
- **`CANONICAL_SEQUENCE_WITH_VARIANTS`**: **4** cases (14.8%)
- **`ISOFORM_SEQUENCE_WITH_VARIANTS`**: **0** cases (0.0%)
- **`PARTIAL_SEQUENCE`**: **0** cases (0.0%)
- **`NO_EXACT_UNIPROT_SEQUENCE_MATCH`**: **0** cases (0.0%)
- **`UNABLE_TO_DETERMINE`**: **0** cases (0.0%)
- **Total**: **27 / 27** (100.0%)

---

## 2. In-Depth Audit of Length-Mismatched Isoform Cases

### Case 1: `dev_007` (`NP_001005785.1` → UniProt `Q13117`)
- **NCBI Length**: 534 aa (`deleted in azoospermia protein 2 isoform 2 [Homo sapiens]`)
- **UniProt Canonical Length**: 558 aa (`Q13117-1`)
- **Sequence Equivalence Findings**: The uploaded NCBI FASTA is **100% character-for-character identical** to documented UniProt isoform **`Q13117-3`** (534 aa).
- **AlphaFold Compatibility**: `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS`. AlphaFold DB provides a 3D model constructed for the 558-aa canonical sequence (`Q13117-1`).
- **Residue Numbering Safety**: `REQUIRES_ALIGNMENT`. Because `Q13117-3` lacks 24 internal amino acids present in `Q13117-1`, residue $N$ in the uploaded FASTA does **not** map to canonical residue $N$ after the deletion site. Silent 1:1 residue indexing would introduce off-by-24 residue mapping errors.

### Case 2: `holdout_003` (`NP_000109.1` → UniProt `P17813`)
- **NCBI Length**: 625 aa (`endoglin isoform 2 precursor [Homo sapiens]`)
- **UniProt Canonical Length**: 658 aa (`P17813-1`)
- **Sequence Equivalence Findings**: The uploaded NCBI FASTA is **100% character-for-character identical** to documented UniProt isoform **`P17813-2`** (625 aa).
- **AlphaFold Compatibility**: `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS`. AlphaFold DB provides a 3D model constructed for the 658-aa canonical sequence (`P17813-1`).
- **Residue Numbering Safety**: `REQUIRES_ALIGNMENT`. Isoform 2 terminates prematurely compared to Isoform 1 (lacking the C-terminal cytoplasmic domain extension). Residue mapping is safe up to position 625, but 3D coordinates beyond position 625 in the AlphaFold model do not exist in the uploaded isoform.

---

## 3. In-Depth Audit of Point Variant / Version Update Cases

### 1. `dev_008` (`NP_000536.3` → UniProt `P20823`, HNF1A)
- **Length**: Both 631 aa.
- **Substitutions**: 1 point substitution (`Gly574Ser` / `G574S`). `NP_000536.3` has `Gly` at position 574, whereas updated RefSeq `NP_000536.6` and UniProt canonical `P20823` have `Ser` at position 574. Identity: 99.8%.

### 2. `gen_001` (`NP_001185808.1` → UniProt `B4DJ38`, ATP5J2-PTCD1)
- **Length**: Both 749 aa.
- **Substitutions**: 1 point substitution (`Lys699Glu` / `K699E`). `NP_001185808.1` has `Lys` at position 699, whereas UniProt canonical `B4DJ38` has `Glu` at position 699. Identity: 99.9%.

### 3. `gen_006` (`NP_000042.1` → UniProt `Q13315`, ATM)
- **Length**: Both 3056 aa.
- **Substitutions**: 3 point substitutions (`A554T`, `N750K`, `D3003N`). Benchmark FASTA `NP_000042.1` differs from updated RefSeq `NP_000042.3` and UniProt canonical `Q13315`. Identity: 99.9%.

### 4. `gen_008` (`NP_000517.2` → UniProt `P02533`, K1C14)
- **Length**: Both 472 aa.
- **Substitutions**: 1 point substitution (`Tyr63Cys` / `Y63C`). `NP_000517.2` has `Tyr` at position 63, whereas updated RefSeq `NP_000517.3` and UniProt canonical `P02533` have `Cys` at position 63. Identity: 99.8%.

---

## 4. Scientific Safety Rules for FASTA → 3D Model Rendering in BioFile

1. **AlphaFold Model Compatibility**:
   - Only cases classified as `CANONICAL_SEQUENCE_EXACT` (**21 cases**) can directly map 1:1 onto AlphaFold DB structures without sequence warning badges or alignment layers.
   - Isoforms (**2 cases**) and variant-containing sequences (**4 cases**) MUST trigger an explicit visual indicator informing the user that the uploaded FASTA sequence differs from the canonical AlphaFold 3D model sequence.

2. **Residue Inspector & Mutation Validation**:
   - For `ISOFORM_SEQUENCE_EXACT` (e.g. `Q13117-3` 534 aa), canonical residue positions (e.g. position 550) must not be assumed to equal uploaded FASTA residue 550 without dynamic sequence alignment.
   - Experimental PDB/SIFTS coverage ranges (e.g., `41–174 of 558 aa`) are explicitly indexed against canonical UniProt residue numbers and require pairwise alignment when displayed against non-canonical uploaded isoforms.

---

## 5. Complete Sequence Equivalence Table (30 Cases)

| case_id | ncbi_accession | uniprot_accession | db_class | ncbi_len | canonical_len | sequence_relationship | matched_isoform | seq_id | subs | ins | dels | alphafold_compatible | pdb_mapping_safe | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dev_001` | `NP_000509.1` | `P68871` | `EXACT_VERSION_MATCH` | 147 | 147 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P68871 canonical sequence (147 aa). |
| `dev_002` | `NP_005219.2` | `P00533` | `EXACT_VERSION_MATCH` | 1210 | 1210 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P00533 canonical sequence (1210 aa). |
| `dev_003` | `YP_009724389.1` | `P0DTD1` | `EXACT_VERSION_MATCH` | 7096 | 7096 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P0DTD1 canonical sequence (7096 aa). |
| `dev_004` | `NP_061820.1` | `P99999` | `EXACT_VERSION_MATCH` | 105 | 105 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P99999 canonical sequence (105 aa). |
| `dev_005` | `NP_005359.1` | `P02144` | `EXACT_VERSION_MATCH` | 154 | 154 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P02144 canonical sequence (154 aa). |
| `dev_006` | `NP_000230.1` | `P61626` | `EXACT_VERSION_MATCH` | 148 | 148 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P61626 canonical sequence (148 aa). |
| `dev_007` | `NP_001005785.1` | `Q13117` | `EXACT_VERSION_MATCH` | 534 | 558 | `ISOFORM_SEQUENCE_EXACT` | `Q13117-3` | 100.0% | 0 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | NCBI FASTA sequence is 100% character-for-character identical to documented UniProt isoform Q13117-3 (534 aa). Differs from canonical Q13117 (558 aa). |
| `dev_008` | `NP_000536.3` | `P20823` | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | 631 | 631 | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `NONE` | 99.8% | 1 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | Same length as canonical P20823 (631 aa), but contains 1 amino acid point substitution(s). Sequence identity 99.8%. |
| `dev_009` | `NP_000199.2` | `P06213` | `EXACT_VERSION_MATCH` | 1382 | 1382 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P06213 canonical sequence (1382 aa). |
| `dev_010` | `XP_011530903.1` | `NONE` | `RELATED_BUT_NOT_DIRECT` | 1163 | N/A | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `NONE` | 0.0% | 0 | 0 | 0 | `NO_ALPHAFOLD_MODEL` | `REQUIRES_ALIGNMENT` | Unmapped RefSeq XP_011530903.1 (Phospholipase B1 isoform X12). No direct UniProt cross-reference. |
| `gen_001` | `NP_001185808.1` | `B4DJ38` | `EXACT_VERSION_MATCH` | 749 | 749 | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `NONE` | 99.9% | 1 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | Same length as canonical B4DJ38 (749 aa), but contains 1 amino acid point substitution(s). Sequence identity 99.9%. |
| `gen_002` | `NP_000620.2` | `P17181` | `EXACT_VERSION_MATCH` | 557 | 557 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P17181 canonical sequence (557 aa). |
| `gen_003` | `NP_414542.1` | `P0AD86` | `EXACT_VERSION_MATCH` | 21 | 21 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P0AD86 canonical sequence (21 aa). |
| `gen_004` | `NP_002924.1` | `P07998` | `EXACT_VERSION_MATCH` | 156 | 156 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P07998 canonical sequence (156 aa). |
| `gen_005` | `NP_001082.2` | `P19801` | `EXACT_VERSION_MATCH` | 751 | 751 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P19801 canonical sequence (751 aa). |
| `gen_006` | `NP_000042.1` | `Q13315` | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | 3056 | 3056 | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `NONE` | 99.9% | 3 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | Same length as canonical Q13315 (3056 aa), but contains 3 amino acid point substitution(s). Sequence identity 99.9%. |
| `gen_007` | `NP_000468.1` | `P02768` | `EXACT_VERSION_MATCH` | 609 | 609 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P02768 canonical sequence (609 aa). |
| `gen_008` | `NP_000517.2` | `P02533` | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | 472 | 472 | `CANONICAL_SEQUENCE_WITH_VARIANTS` | `NONE` | 99.8% | 1 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | Same length as canonical P02533 (472 aa), but contains 1 amino acid point substitution(s). Sequence identity 99.8%. |
| `gen_009` | `NP_001005.1` | `P46783` | `EXACT_VERSION_MATCH` | 165 | 165 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P46783 canonical sequence (165 aa). |
| `gen_010` | `NP_001254714.1` | `H9G2A1` | `EXACT_VERSION_MATCH` | 250 | 250 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt H9G2A1 canonical sequence (250 aa). |
| `holdout_001` | `YP_009724397.2` | `P0DTC9` | `EXACT_VERSION_MATCH` | 419 | 419 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P0DTC9 canonical sequence (419 aa). |
| `holdout_002` | `NP_001009071.1` | `Q9XT09` | `EXACT_VERSION_MATCH` | 393 | 393 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt Q9XT09 canonical sequence (393 aa). |
| `holdout_003` | `NP_000109.1` | `P17813` | `EXACT_VERSION_MATCH` | 625 | 658 | `ISOFORM_SEQUENCE_EXACT` | `P17813-2` | 100.0% | 0 | 0 | 0 | `ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS` | `REQUIRES_ALIGNMENT` | NCBI FASTA sequence is 100% character-for-character identical to documented UniProt isoform P17813-2 (625 aa). Differs from canonical P17813 (658 aa). |
| `holdout_004` | `NP_002737.2` | `P27361` | `EXACT_VERSION_MATCH` | 379 | 379 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P27361 canonical sequence (379 aa). |
| `holdout_005` | `WP_011012956.1` | `Q8U008` | `EXACT_VERSION_MATCH` | 113 | 113 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt Q8U008 canonical sequence (113 aa). |
| `holdout_006` | `NP_001014431.1` | `P31749` | `EXACT_VERSION_MATCH` | 480 | 480 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P31749 canonical sequence (480 aa). |
| `holdout_007` | `XP_001633519.1` | `NONE` | `NO_MAPPING` | 884 | N/A | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `NONE` | 0.0% | 0 | 0 | 0 | `NO_ALPHAFOLD_MODEL` | `REQUIRES_ALIGNMENT` | Unmapped RefSeq XP_001633519.1. No explicit UniProt cross-reference. |
| `holdout_008` | `YP_009047134.1` | `NONE` | `NO_MAPPING` | 348 | N/A | `NO_EXACT_UNIPROT_SEQUENCE_MATCH` | `NONE` | 0.0% | 0 | 0 | 0 | `NO_ALPHAFOLD_MODEL` | `REQUIRES_ALIGNMENT` | Unmapped RefSeq YP_009047134.1. No explicit UniProt cross-reference. |
| `holdout_009` | `NP_000312.2` | `P06400` | `EXACT_VERSION_MATCH` | 928 | 928 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P06400 canonical sequence (928 aa). |
| `holdout_010` | `NP_003343.1` | `P63165` | `EXACT_VERSION_MATCH` | 101 | 101 | `CANONICAL_SEQUENCE_EXACT` | `NONE` | 100.0% | 0 | 0 | 0 | `DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE` | `YES` | NCBI FASTA sequence is 100% character-for-character identical to UniProt P63165 canonical sequence (101 aa). |

---

FINAL STATUS:
`NCBI_UNIPROT_SEQUENCE_EQUIVALENCE_AUDIT_COMPLETE`
