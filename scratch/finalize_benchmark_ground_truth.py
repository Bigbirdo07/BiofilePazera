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

# 30 cases in order
case_order = [
    "dev_001", "dev_002", "dev_003", "dev_004", "dev_005", "dev_006", "dev_007", "dev_008", "dev_009", "dev_010",
    "gen_001", "gen_002", "gen_003", "gen_004", "gen_005", "gen_006", "gen_007", "gen_008", "gen_009", "gen_010",
    "holdout_001", "holdout_002", "holdout_003", "holdout_004", "holdout_005", "holdout_006", "holdout_007", "holdout_008", "holdout_009", "holdout_010"
]

table_rows = []

for cid in case_order:
    c = case_map[cid]
    acc = c['ncbi_acc']
    ncbi = c['ncbi_info'] or {}
    hits = c['uniprot_hits']
    
    ncbi_len = ncbi.get('length', 0)
    ncbi_desc = ncbi.get('title', '')
    
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
    elif cid == "dev_010":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "RELATED_BUT_NOT_DIRECT"
        verdict = "REJECTED_FUZZY_MAPPING"
        notes = "NCBI XP_011530903.1 is phospholipase B1 isoform X12 (1163 aa). UniProt human PLB1 (Q6P1J6) lists NP_689879.3. Prior claim of P59533 (TAS2R38, 333 aa) was based on fuzzy text search and is rejected."
    elif cid == "holdout_007":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "NO_MAPPING"
        verdict = "NO_REFSEQ_XREF"
        notes = "NCBI XP_001633519.1 is Nematostella vectensis LOC5513279 (884 aa). No UniProt record contains a RefSeq cross-reference for XP_001633519.1."
    elif cid == "holdout_008":
        u_acc = "NONE"
        u_len = "N/A"
        exact_xref = "NONE"
        mapping_class = "NO_MAPPING"
        verdict = "NO_REFSEQ_XREF"
        notes = "NCBI YP_009047134.1 is McMurdo viral replication protein (348 aa). No UniProt record contains a RefSeq cross-reference for YP_009047134.1."

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

# Verify 30 rows and count categories
counts = {
    'EXACT_VERSION_MATCH': sum(1 for r in table_rows if r['mapping_class'] == 'EXACT_VERSION_MATCH'),
    'BASE_ACCESSION_MATCH_DIFFERENT_VERSION': sum(1 for r in table_rows if r['mapping_class'] == 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION'),
    'RELATED_BUT_NOT_DIRECT': sum(1 for r in table_rows if r['mapping_class'] == 'RELATED_BUT_NOT_DIRECT'),
    'NO_MAPPING': sum(1 for r in table_rows if r['mapping_class'] == 'NO_MAPPING'),
    'AMBIGUOUS': sum(1 for r in table_rows if r['mapping_class'] == 'AMBIGUOUS')
}

print(f"Total Rows: {len(table_rows)}")
print("Counts:")
for k, v in counts.items():
    print(f"  {k}: {v}")
print(f"Sum of counts: {sum(counts.values())}")

