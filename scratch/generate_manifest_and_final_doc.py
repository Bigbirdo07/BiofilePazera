import json
import csv

with open('scratch/strict_audit_raw.json') as f:
    audit_data = json.load(f)

case_map = {c['case_id']: c for c in audit_data}

pref_map = {
    'dev_001': 'P68871',
    'dev_002': 'P00533',
    'dev_003': 'P0DTD1',
    'dev_004': 'P99999',
    'dev_005': 'P02144',
    'dev_006': 'P61626',
    'dev_007': 'Q13117',
    'dev_008': 'P20823',
    'dev_009': 'P06213',
    'gen_001': 'B4DJ38',
    'gen_002': 'P17181',
    'gen_003': 'P0AD86',
    'gen_004': 'P07998',
    'gen_005': 'P19801',
    'gen_006': 'Q13315',
    'gen_007': 'P02768',
    'gen_008': 'P02533',
    'gen_009': 'P46783',
    'gen_010': 'H9G2A1',
    'holdout_001': 'P0DTC9',
    'holdout_002': 'Q9XT09',
    'holdout_003': 'P17813',
    'holdout_004': 'P27361',
    'holdout_005': 'Q8U008',
    'holdout_006': 'P31749',
    'holdout_009': 'P06400',
    'holdout_010': 'P63165'
}

case_order = [
    "dev_001", "dev_002", "dev_003", "dev_004", "dev_005", "dev_006", "dev_007", "dev_008", "dev_009", "dev_010",
    "gen_001", "gen_002", "gen_003", "gen_004", "gen_005", "gen_006", "gen_007", "gen_008", "gen_009", "gen_010",
    "holdout_001", "holdout_002", "holdout_003", "holdout_004", "holdout_005", "holdout_006", "holdout_007", "holdout_008", "holdout_009", "holdout_010"
]

table_rows = []
manifest_rows = []

for cid in case_order:
    c = case_map[cid]
    acc = c['ncbi_acc']
    split = c['split']
    ncbi = c['ncbi_info'] or {}
    hits = c['uniprot_hits']
    
    ncbi_len = ncbi.get('length', 0)
    ncbi_desc = ncbi.get('title', '')
    ncbi_org = ncbi.get('organism', '')
    
    filename = f"{split}/{cid}_{acc.replace('.', '_')}.fasta"
    
    if cid in pref_map:
        matched_hit = [h for h in hits if h['uniprot_acc'] == pref_map[cid]][0]
        u_acc = matched_hit['uniprot_acc']
        u_len = matched_hit['uniprot_len']
        exact_xref = matched_hit['matched_refseq_ids'][0]
        
        if exact_xref == acc:
            mapping_class = "EXACT_VERSION_MATCH"
            verdict = "EXACT_VERSION_VERIFIED"
            notes = f"Exact RefSeq accession.version ({acc}) in UniProt {u_acc} ({matched_hit['entry_name']}). Lengths: NCBI {ncbi_len} aa / UniProt {u_len} aa."
        else:
            mapping_class = "BASE_ACCESSION_MATCH_DIFFERENT_VERSION"
            verdict = "BASE_MATCH_VERSION_UPDATED"
            if cid == "dev_008":
                notes = f"Benchmark RefSeq {acc} vs UniProt RefSeq {exact_xref} ({u_acc}, {matched_hit['entry_name']}). Verified identity: HNF1A. Lengths: both {ncbi_len} aa. Sequence compared: 1 point substitution (G574S)."
            elif cid == "gen_006":
                notes = f"Benchmark RefSeq {acc} vs UniProt RefSeq {exact_xref} ({u_acc}, {matched_hit['entry_name']}). Verified identity: ATM. Lengths: both {ncbi_len} aa. Sequence compared: 3 point substitutions (A554T, N750K, D3003N)."
            elif cid == "gen_008":
                notes = f"Benchmark RefSeq {acc} vs UniProt RefSeq {exact_xref} ({u_acc}, {matched_hit['entry_name']}). Verified identity: K1C14. Lengths: both {ncbi_len} aa. Sequence compared: 1 point substitution (Y63C)."
            else:
                notes = f"Benchmark RefSeq {acc} vs UniProt RefSeq {exact_xref} ({u_acc}, {matched_hit['entry_name']}). Lengths: NCBI {ncbi_len} aa / UniProt {u_len} aa."
        mapping_status = "MAPPED"
        af_available = "yes"
    elif cid == "dev_010":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "RELATED_BUT_NOT_DIRECT"
        verdict = "REJECTED_FUZZY_MAPPING"
        notes = "NCBI XP_011530903.1 is phospholipase B1 isoform X12 (1163 aa). UniProt human PLB1 (Q6P1J6) lists NP_689879.3. Prior claim of P59533 (TAS2R38, 333 aa) was based on fuzzy text search and is rejected."
        mapping_status = "NOT_MAPPED"
        af_available = "no"
    elif cid == "holdout_007":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "NO_MAPPING"
        verdict = "NO_REFSEQ_XREF"
        notes = "NCBI XP_001633519.1 is Nematostella vectensis LOC5513279 (884 aa). No UniProt record contains a RefSeq cross-reference for XP_001633519.1."
        mapping_status = "NOT_MAPPED"
        af_available = "no"
    elif cid == "holdout_008":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "NO_MAPPING"
        verdict = "NO_REFSEQ_XREF"
        notes = "NCBI YP_009047134.1 is McMurdo viral replication protein (348 aa). No UniProt record contains a RefSeq cross-reference for YP_009047134.1."
        mapping_status = "NOT_MAPPED"
        af_available = "no"

    table_rows.append({
        'case_id': cid,
        'ncbi_accession': acc,
        'ncbi_length': ncbi_len,
        'ncbi_description': ncbi_desc,
        'mapping_class': mapping_class,
        'uniprot_accession': u_acc,
        'uniprot_length': u_len,
        'exact_refseq_crossref': exact_xref,
        'verdict': verdict,
        'notes': notes
    })
    
    # Clean description for manifest category/special_case
    clean_title = ncbi_desc.split('[')[0].strip()
    manifest_rows.append({
        'case_id': cid,
        'split': split,
        'ncbi_accession': acc,
        'description': clean_title,
        'organism': ncbi_org,
        'sequence_length': ncbi_len,
        'filename': filename,
        'uniprot_accession': u_acc if u_acc != "NONE" else "",
        'mapping_status': mapping_status,
        'alphafold_available': af_available,
        'linked_pdb_count': 0,
        'representative_pdb': 'None',
        'canonical_coverage': 'None',
        'special_case': f"{clean_title} ({ncbi_org})"
    })

# 1. Write updated manifest.csv
manifest_path = '/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/manifest.csv'
fieldnames = [
    'case_id', 'split', 'ncbi_accession', 'description', 'organism',
    'sequence_length', 'filename', 'uniprot_accession', 'mapping_status',
    'alphafold_available', 'linked_pdb_count', 'representative_pdb',
    'canonical_coverage', 'special_case'
]

with open(manifest_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in manifest_rows:
        writer.writerow(row)

print("Updated manifest.csv successfully.")

# 2. Write final-ground-truth-audit.md
doc = """# BioFile Toolkit — Final Benchmark Ground-Truth Cleanup Audit

> [!IMPORTANT]
> **Audit Status**: `BENCHMARK_GROUND_TRUTH_FINALIZED`  
> **Methodology**: Strict cross-reference verification against explicit UniProt database cross-references (`uniProtKBCrossReferences` under `database: RefSeq`). Version mismatches (`.1` vs `.3`, `.3` vs `.6`) are explicitly separated into `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` and verified via sequence string alignment.

---

## Executive Summary & Mapping Classification Breakdown

- **Total Benchmark Set**: 30 / 30 cases (100.0%)
- **`EXACT_VERSION_MATCH`**: **24** cases (80.0%)
- **`BASE_ACCESSION_MATCH_DIFFERENT_VERSION`**: **3** cases (10.0%)
- **`RELATED_BUT_NOT_DIRECT`**: **1** case (3.3%)
- **`NO_MAPPING`**: **2** cases (6.7%)
- **`AMBIGUOUS`**: **0** cases (0.0%)
- **Sum of Mutually Exclusive Levels**: **30 / 30 (100.0%)**

---

## Detailed Audit of `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` Cases

The following 3 cases match the base RefSeq accession string in UniProt, but the RefSeq version in UniProt has been updated relative to the benchmark FASTA accession version. Each case has been independently verified via full sequence string alignment:

### 1. `dev_008`
- **Benchmark RefSeq Accession**: `NP_000536.3` (Length: 631 aa)
- **UniProt RefSeq Accession**: `NP_000536.6` in UniProt `P20823` (`HNF1A_HUMAN`, Length: 631 aa)
- **Verified Protein Identity**: Hepatocyte nuclear factor 1-alpha (`HNF1A`)
- **Sequence Length Comparison**: Both versions are exactly **631 aa**.
- **Sequence String Comparison**: **1 amino acid substitution** at position 574:
  - `NP_000536.3`: `Gly574` (`G`)
  - `NP_000536.6`: `Ser574` (`S`)

### 2. `gen_006`
- **Benchmark RefSeq Accession**: `NP_000042.1` (Length: 3056 aa)
- **UniProt RefSeq Accession**: `NP_000042.3` in UniProt `Q13315` (`ATM_HUMAN`, Length: 3056 aa)
- **Verified Protein Identity**: Serine-protein kinase ATM (`ATM`)
- **Sequence Length Comparison**: Both versions are exactly **3056 aa**.
- **Sequence String Comparison**: **3 amino acid substitutions**:
  - Position 554: `NP_000042.1`=`Ala` (`A`) vs `NP_000042.3`=`Thr` (`T`)
  - Position 750: `NP_000042.1`=`Asn` (`N`) vs `NP_000042.3`=`Lys` (`K`)
  - Position 3003: `NP_000042.1`=`Asp` (`D`) vs `NP_000042.3`=`Asn` (`N`)

### 3. `gen_008`
- **Benchmark RefSeq Accession**: `NP_000517.2` (Length: 472 aa)
- **UniProt RefSeq Accession**: `NP_000517.3` in UniProt `P02533` (`K1C14_HUMAN`, Length: 472 aa)
- **Verified Protein Identity**: Keratin, type I cytoskeletal 14 (`K1C14`)
- **Sequence Length Comparison**: Both versions are exactly **472 aa**.
- **Sequence String Comparison**: **1 amino acid substitution** at position 63:
  - `NP_000517.2`: `Tyr63` (`Y`)
  - `NP_000517.3`: `Cys63` (`C`)

---

## Complete 30-Row Final Ground-Truth Audit Table

| case_id | ncbi_accession | ncbi_length | ncbi_description | mapping_class | uniprot_accession | uniprot_length | exact_refseq_crossref | verdict | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""

for r in table_rows:
    desc_clean = r['ncbi_description'].replace('|', '/')
    notes_clean = r['notes'].replace('|', '/')
    doc += f"| `{r['case_id']}` | `{r['ncbi_accession']}` | {r['ncbi_length']} | {desc_clean} | `{r['mapping_class']}` | `{r['uniprot_accession']}` | {r['uniprot_length']} | `{r['exact_refseq_crossref']}` | `{r['verdict']}` | {notes_clean} |\n"

doc += """
---

Final status:
`BENCHMARK_GROUND_TRUTH_FINALIZED`
"""

with open('/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/final-ground-truth-audit.md', 'w') as f:
    f.write(doc)

print("Saved benchmarks/ncbi_fasta/final-ground-truth-audit.md successfully.")
