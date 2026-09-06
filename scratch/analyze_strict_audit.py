import json

with open('scratch/strict_audit_raw.json') as f:
    data = json.load(f)

for case in data:
    cid = case['case_id']
    acc = case['ncbi_acc']
    ncbi = case['ncbi_info']
    hits = case['uniprot_hits']
    print(f"[{cid}] NCBI: {acc} | Len: {ncbi['length'] if ncbi else 'N/A'} | Desc: {ncbi['title'] if ncbi else 'N/A'}")
    if hits:
        for h in hits:
            print(f"   -> UniProt: {h['uniprot_acc']} ({h['entry_name']}) | Len: {h['uniprot_len']} | RefSeq XRefs: {h['matched_refseq_ids']} | Prot: {h['protein_name']}")
    else:
        print("   -> NO DIRECT UNIPROT REFSEQ XREF MATCH")

