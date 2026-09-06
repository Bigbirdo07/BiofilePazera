import json

with open('scratch/sequence_equivalence_audit_raw.json') as f:
    data = json.load(f)

print(f"Total audited cases: {len(data)}")

counts = {
    'CANONICAL_SEQUENCE_EXACT': 0,
    'ISOFORM_SEQUENCE_EXACT': 0,
    'CANONICAL_SEQUENCE_WITH_VARIANTS': 0,
    'ISOFORM_SEQUENCE_WITH_VARIANTS': 0,
    'PARTIAL_SEQUENCE': 0,
    'NO_EXACT_UNIPROT_SEQUENCE_MATCH': 0,
    'UNABLE_TO_DETERMINE': 0
}

mapped_cases = [d for d in data if d['database_mapping_class'] in ['EXACT_VERSION_MATCH', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION']]
print(f"Total database-mapped cases: {len(mapped_cases)}")

for d in data:
    cid = d['case_id']
    acc = d['ncbi_accession']
    u_acc = d['uniprot_accession']
    rel = d['sequence_relationship']
    iso = d['matched_uniprot_isoform']
    ncbi_l = d['ncbi_length']
    u_can_l = d['uniprot_canonical_length']
    notes = d['notes']
    
    if d['database_mapping_class'] in ['EXACT_VERSION_MATCH', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION']:
        counts[rel] += 1
        print(f"[{cid}] {acc} -> UniProt {u_acc} | NCBI Len: {ncbi_l} | Can Len: {u_can_l} | Rel: {rel} | Iso: {iso}")
        print(f"    Notes: {notes}")
    else:
        print(f"[{cid}] {acc} -> NOT MAPPED ({d['database_mapping_class']})")

print("\nSEQUENCE RELATIONSHIP COUNTS (For 27 Database-Mapped Cases):")
for k, v in counts.items():
    print(f"  {k}: {v}")
print(f"Total Mapped Cases Evaluated: {sum(counts.values())}")

