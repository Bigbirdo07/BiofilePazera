import json
import urllib.request
import os
import glob

with open('scratch/strict_audit_raw.json') as f:
    data = json.load(f)

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

diff_version_cases = []

for case in data:
    cid = case['case_id']
    ncbi_acc = case['ncbi_acc']
    hits = case['uniprot_hits']
    
    if cid in pref_map:
        matched_hit = [h for h in hits if h['uniprot_acc'] == pref_map[cid]][0]
        uniprot_acc = matched_hit['uniprot_acc']
        uniprot_xref = matched_hit['matched_refseq_ids'][0]
        
        if ncbi_acc != uniprot_xref:
            diff_version_cases.append({
                'case_id': cid,
                'benchmark_refseq': ncbi_acc,
                'uniprot_refseq': uniprot_xref,
                'uniprot_acc': uniprot_acc,
                'entry_name': matched_hit['entry_name'],
                'ncbi_len': case['ncbi_info']['length'],
                'uniprot_len': matched_hit['uniprot_len']
            })

print(f"Found {len(diff_version_cases)} BASE_ACCESSION_MATCH_DIFFERENT_VERSION cases:")
for d in diff_version_cases:
    print(f"  [{d['case_id']}] Benchmark: {d['benchmark_refseq']} vs UniProt RefSeq: {d['uniprot_refseq']} (UniProt: {d['uniprot_acc']}, {d['entry_name']}) | NCBI Len: {d['ncbi_len']} vs UniProt Len: {d['uniprot_len']}")

