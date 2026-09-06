import csv
import json

with open('scratch/sequence_equivalence_audit_raw.json') as f:
    rows = json.load(f)

csv_path = '/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/sequence-equivalence-audit.csv'
fieldnames = [
    'case_id', 'ncbi_accession', 'uniprot_accession', 'database_mapping_class',
    'ncbi_length', 'uniprot_canonical_length', 'sequence_relationship',
    'matched_uniprot_isoform', 'sequence_identity', 'substitutions',
    'insertions', 'deletions', 'alphafold_sequence_compatible',
    'pdb_canonical_mapping_safe', 'notes'
]

with open(csv_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow({
            'case_id': r['case_id'],
            'ncbi_accession': r['ncbi_accession'],
            'uniprot_accession': r['uniprot_accession'],
            'database_mapping_class': r['database_mapping_class'],
            'ncbi_length': r['ncbi_length'],
            'uniprot_canonical_length': r['uniprot_canonical_length'],
            'sequence_relationship': r['sequence_relationship'],
            'matched_uniprot_isoform': r['matched_uniprot_isoform'],
            'sequence_identity': r['sequence_identity'],
            'substitutions': r['substitutions'],
            'insertions': r['insertions'],
            'deletions': r['deletions'],
            'alphafold_sequence_compatible': r['alphafold_sequence_compatible'],
            'pdb_canonical_mapping_safe': r['pdb_canonical_mapping_safe'],
            'notes': r['notes']
        })

print("Wrote sequence-equivalence-audit.csv successfully.")

# Generate sequence-equivalence-issues.md
mapped_rows = [r for r in rows if r['database_mapping_class'] in ['EXACT_VERSION_MATCH', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION']]

canonical_exact_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'CANONICAL_SEQUENCE_EXACT')
isoform_exact_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'ISOFORM_SEQUENCE_EXACT')
canonical_var_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'CANONICAL_SEQUENCE_WITH_VARIANTS')
isoform_var_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'ISOFORM_SEQUENCE_WITH_VARIANTS')
partial_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'PARTIAL_SEQUENCE')
no_match_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'NO_EXACT_UNIPROT_SEQUENCE_MATCH')
unable_cnt = sum(1 for r in mapped_rows if r['sequence_relationship'] == 'UNABLE_TO_DETERMINE')

md_doc = f"""# BioFile Toolkit — NCBI FASTA ↔ UniProt Sequence Equivalence Audit Issues & Safety Report

> [!IMPORTANT]
> **Audit Status**: `NCBI_UNIPROT_SEQUENCE_EQUIVALENCE_AUDIT_COMPLETE`  
> **Scientific Requirement**: Database accession mapping (`RefSeq → UniProt`) is **insufficient** for direct FASTA→3D model rendering. BioFile must establish character-for-character sequence equivalence to determine if an uploaded FASTA sequence matches the AlphaFold canonical 3D model, matches a documented UniProt isoform, or contains variant point substitutions.

---

## 1. Summary Metrics for Database-Mapped Cases

- **Total Database-Mapped Cases Evaluated**: **27 / 27**
- **`CANONICAL_SEQUENCE_EXACT`**: **{canonical_exact_cnt}** cases ({canonical_exact_cnt / 27 * 100:.1f}%)
- **`ISOFORM_SEQUENCE_EXACT`**: **{isoform_exact_cnt}** cases ({isoform_exact_cnt / 27 * 100:.1f}%)
- **`CANONICAL_SEQUENCE_WITH_VARIANTS`**: **{canonical_var_cnt}** cases ({canonical_var_cnt / 27 * 100:.1f}%)
- **`ISOFORM_SEQUENCE_WITH_VARIANTS`**: **{isoform_var_cnt}** cases ({isoform_var_cnt / 27 * 100:.1f}%)
- **`PARTIAL_SEQUENCE`**: **{partial_cnt}** cases ({partial_cnt / 27 * 100:.1f}%)
- **`NO_EXACT_UNIPROT_SEQUENCE_MATCH`**: **{no_match_cnt}** cases ({no_match_cnt / 27 * 100:.1f}%)
- **`UNABLE_TO_DETERMINE`**: **{unable_cnt}** cases ({unable_cnt / 27 * 100:.1f}%)
- **Total**: **{canonical_exact_cnt + isoform_exact_cnt + canonical_var_cnt + isoform_var_cnt + partial_cnt + no_match_cnt + unable_cnt} / 27** (100.0%)

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
"""

for r in rows:
    notes_clean = r['notes'].replace('|', '/')
    md_doc += f"| `{r['case_id']}` | `{r['ncbi_accession']}` | `{r['uniprot_accession']}` | `{r['database_mapping_class']}` | {r['ncbi_length']} | {r['uniprot_canonical_length']} | `{r['sequence_relationship']}` | `{r['matched_uniprot_isoform']}` | {r['sequence_identity']} | {r['substitutions']} | {r['insertions']} | {r['deletions']} | `{r['alphafold_sequence_compatible']}` | `{r['pdb_canonical_mapping_safe']}` | {notes_clean} |\n"

md_doc += """
---

FINAL STATUS:
`NCBI_UNIPROT_SEQUENCE_EQUIVALENCE_AUDIT_COMPLETE`
"""

with open('/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/sequence-equivalence-issues.md', 'w') as f:
    f.write(md_doc)

print("Wrote sequence-equivalence-issues.md successfully.")

