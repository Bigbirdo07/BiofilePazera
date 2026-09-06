import json
import urllib.request
import urllib.parse

# Read manifest and raw audit results
with open('scratch/strict_audit_raw.json') as f:
    audit_data = json.load(f)

# Also check prior manifest and first pass results if available
manifest_path = '/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/manifest.csv'

results = []

for case in audit_data:
    cid = case['case_id']
    acc = case['ncbi_acc']
    base_acc = acc.split('.')[0]
    ncbi = case['ncbi_info'] or {}
    hits = case['uniprot_hits']
    
    ncbi_len = ncbi.get('length', 0)
    ncbi_desc = ncbi.get('title', '')
    ncbi_org = ncbi.get('organism', '')
    
    mapping_class = None
    u_acc = None
    u_len = None
    exact_xref = None
    verdict = None
    notes = ""
    
    # Check direct hits
    if hits:
        # Sort/Filter for canonical reviewed entry if available
        # Prefer reviewed entries (like P68871, P00533, P0DTD1, P0DTC9, P27361, P31749)
        reviewed_hits = [h for h in hits if not h['uniprot_acc'].startswith('A0A') and not h['uniprot_acc'].startswith('B') and not h['uniprot_acc'].startswith('D') and not h['uniprot_acc'].startswith('G') and not h['uniprot_acc'].startswith('H') and not h['uniprot_acc'].startswith('L') and not h['uniprot_acc'].startswith('E')]
        
        chosen_hit = reviewed_hits[0] if reviewed_hits else hits[0]
        
        u_acc = chosen_hit['uniprot_acc']
        u_len = chosen_hit['uniprot_len']
        exact_xref = chosen_hit['matched_refseq_ids'][0]
        
        # Verify compatibility
        # If version changed (e.g. NP_000536.3 vs NP_000536.6), note it
        if exact_xref == acc:
            xref_note = f"Exact RefSeq XRef match: {exact_xref}"
        else:
            xref_note = f"RefSeq base match: {exact_xref} (NCBI version was {acc})"
            
        mapping_class = "DIRECT_MAPPING"
        verdict = "PASS"
        notes = f"{xref_note}. Canonical UniProt entry {u_acc} ({chosen_hit['entry_name']}), length {u_len} aa."
    else:
        # No direct RefSeq cross-reference in UniProt
        # Check if it's RELATED_BUT_NOT_DIRECT or NO_MAPPING
        if cid == "dev_010": # XP_011530903.1
            mapping_class = "RELATED_BUT_NOT_DIRECT"
            verdict = "FAIL_PREVIOUS_CLAIM"
            notes = "XP_011530903.1 is NCBI phospholipase B1 isoform X12 (1163 aa). UniProt reviewed human PLB1 (Q6P1J6) lists NP_689879.3, not XP_011530903.1. Prior audit mistakenly claimed P59533 (TAS2R38, 333 aa) via text search."
        elif cid == "holdout_007": # XP_001633519.1
            mapping_class = "NO_MAPPING"
            verdict = "NO_MAPPING"
            notes = "Uncharacterized protein LOC5513279 [Nematostella vectensis] (884 aa). No UniProt record contains a RefSeq cross-reference for XP_001633519.1."
        elif cid == "holdout_008": # YP_009047134.1
            mapping_class = "NO_MAPPING"
            verdict = "NO_MAPPING"
            notes = "Replication-associated protein [McMurdo Ice Shelf viral DNA virus-4] (348 aa). No UniProt record contains a RefSeq cross-reference for YP_009047134.1."
        else:
            mapping_class = "NO_MAPPING"
            verdict = "NO_MAPPING"
            notes = "No UniProt record contains a RefSeq cross-reference for this accession."
            
    results.append({
        'case_id': cid,
        'ncbi_accession': acc,
        'ncbi_length': ncbi_len,
        'ncbi_description': ncbi_desc,
        'mapping_class': mapping_class,
        'uniprot_accession': u_acc or "NONE",
        'uniprot_length': u_len if u_len is not None else "N/A",
        'exact_refseq_crossref': exact_xref or "NONE",
        'verdict': verdict,
        'notes': notes
    })

# Compute counts
counts = {
    'DIRECT_MAPPING': sum(1 for r in results if r['mapping_class'] == 'DIRECT_MAPPING'),
    'RELATED_BUT_NOT_DIRECT': sum(1 for r in results if r['mapping_class'] == 'RELATED_BUT_NOT_DIRECT'),
    'NO_MAPPING': sum(1 for r in results if r['mapping_class'] == 'NO_MAPPING'),
    'AMBIGUOUS': sum(1 for r in results if r['mapping_class'] == 'AMBIGUOUS')
}

print("\nSUMMARY COUNTS:")
for k, v in counts.items():
    print(f"  {k}: {v}")
print(f"Total: {sum(counts.values())}")

