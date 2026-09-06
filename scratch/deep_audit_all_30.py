import json
import urllib.request
import urllib.parse

with open('scratch/strict_audit_raw.json') as f:
    cases_raw = json.load(f)

print(f"Loaded {len(cases_raw)} cases.")

for c in cases_raw:
    cid = c['case_id']
    acc = c['ncbi_acc']
    base_acc = acc.split('.')[0]
    ncbi = c['ncbi_info'] or {}
    hits = c['uniprot_hits']
    
    ncbi_len = ncbi.get('length', 0)
    ncbi_desc = ncbi.get('title', '')
    ncbi_org = ncbi.get('organism', '')
    
    print("=" * 80)
    print(f"CASE: {cid} | NCBI Accession: {acc} (Base: {base_acc})")
    print(f"  NCBI Record: len={ncbi_len}, org='{ncbi_org}', desc='{ncbi_desc}'")
    print(f"  UniProt Hits matching xref:refseq ({len(hits)}):")
    
    # Check each hit
    for h in hits:
        u_acc = h['uniprot_acc']
        u_name = h['entry_name']
        u_len = h['uniprot_len']
        u_xrefs = h['matched_refseq_ids']
        u_prot = h['protein_name']
        u_org = h['organism']
        print(f"    - UniProt ACC: {u_acc} ({u_name}) | len={u_len} | xrefs={u_xrefs} | prot='{u_prot}' | org='{u_org}'")

