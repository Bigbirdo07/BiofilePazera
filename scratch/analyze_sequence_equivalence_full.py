import json
import os
import urllib.request
import time

with open('scratch/strict_audit_raw.json') as f:
    audit_data = json.load(f)

case_map = {c['case_id']: c for c in audit_data}

pref_map = {
    'dev_001': ('P68871', 'EXACT_VERSION_MATCH'),
    'dev_002': ('P00533', 'EXACT_VERSION_MATCH'),
    'dev_003': ('P0DTD1', 'EXACT_VERSION_MATCH'),
    'dev_004': ('P99999', 'EXACT_VERSION_MATCH'),
    'dev_005': ('P02144', 'EXACT_VERSION_MATCH'),
    'dev_006': ('P61626', 'EXACT_VERSION_MATCH'),
    'dev_007': ('Q13117', 'EXACT_VERSION_MATCH'),
    'dev_008': ('P20823', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION'),
    'dev_009': ('P06213', 'EXACT_VERSION_MATCH'),
    'gen_001': ('B4DJ38', 'EXACT_VERSION_MATCH'),
    'gen_002': ('P17181', 'EXACT_VERSION_MATCH'),
    'gen_003': ('P0AD86', 'EXACT_VERSION_MATCH'),
    'gen_004': ('P07998', 'EXACT_VERSION_MATCH'),
    'gen_005': ('P19801', 'EXACT_VERSION_MATCH'),
    'gen_006': ('Q13315', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION'),
    'gen_007': ('P02768', 'EXACT_VERSION_MATCH'),
    'gen_008': ('P02533', 'BASE_ACCESSION_MATCH_DIFFERENT_VERSION'),
    'gen_009': ('P46783', 'EXACT_VERSION_MATCH'),
    'gen_010': ('H9G2A1', 'EXACT_VERSION_MATCH'),
    'holdout_001': ('P0DTC9', 'EXACT_VERSION_MATCH'),
    'holdout_002': ('Q9XT09', 'EXACT_VERSION_MATCH'),
    'holdout_003': ('P17813', 'EXACT_VERSION_MATCH'),
    'holdout_004': ('P27361', 'EXACT_VERSION_MATCH'),
    'holdout_005': ('Q8U008', 'EXACT_VERSION_MATCH'),
    'holdout_006': ('P31749', 'EXACT_VERSION_MATCH'),
    'holdout_009': ('P06400', 'EXACT_VERSION_MATCH'),
    'holdout_010': ('P63165', 'EXACT_VERSION_MATCH')
}

case_order = [
    "dev_001", "dev_002", "dev_003", "dev_004", "dev_005", "dev_006", "dev_007", "dev_008", "dev_009", "dev_010",
    "gen_001", "gen_002", "gen_003", "gen_004", "gen_005", "gen_006", "gen_007", "gen_008", "gen_009", "gen_010",
    "holdout_001", "holdout_002", "holdout_003", "holdout_004", "holdout_005", "holdout_006", "holdout_007", "holdout_008", "holdout_009", "holdout_010"
]

def read_local_fasta(cid, split, acc):
    path = f"/Users/albertopaz/Pazera-chompchomp/benchmarks/ncbi_fasta/{split}/{cid}_{acc.replace('.', '_')}.fasta"
    if not os.path.exists(path):
        return None
    with open(path) as f:
        lines = f.read().splitlines()
        seq = "".join(l.strip() for l in lines if not l.startswith('>'))
        return seq

def fetch_uniprot_canonical(u_acc):
    url = f"https://rest.uniprot.org/uniprotkb/{u_acc}.fasta"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    time.sleep(0.1)
    with urllib.request.urlopen(req) as resp:
        lines = resp.read().decode().splitlines()
        return "".join(l.strip() for l in lines if not l.startswith('>'))

def fetch_uniprot_isoforms_dict(u_acc):
    # Fetch isoform fasta directly from UniProt if available or via JSON
    url = f"https://rest.uniprot.org/uniprotkb/{u_acc}.json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    time.sleep(0.1)
    isoforms = {}
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        comments = data.get('comments', [])
        for c in comments:
            if c.get('commentType') == 'ALTERNATIVE PRODUCTS':
                for iso in c.get('isoforms', []):
                    iso_ids = iso.get('isoformIds', [])
                    for iid in iso_ids:
                        isoforms[iid] = None
    
    # fetch each isoform FASTA
    for iid in list(isoforms.keys()):
        try:
            url_i = f"https://rest.uniprot.org/uniprotkb/{iid}.fasta"
            req_i = urllib.request.Request(url_i, headers={'User-Agent': 'Mozilla/5.0'})
            time.sleep(0.1)
            with urllib.request.urlopen(req_i) as resp_i:
                lines = resp_i.read().decode().splitlines()
                isoforms[iid] = "".join(l.strip() for l in lines if not l.startswith('>'))
        except Exception as e:
            print(f"  Warning: failed to fetch isoform FASTA for {iid}: {e}")
            
    return isoforms

audited_rows = []

for cid in case_order:
    c = case_map[cid]
    acc = c['ncbi_acc']
    split = c['split']
    
    if cid not in pref_map:
        # Not mapped case
        if cid == "dev_010":
            audited_rows.append({
                'case_id': cid,
                'ncbi_accession': acc,
                'uniprot_accession': 'NONE',
                'database_mapping_class': 'RELATED_BUT_NOT_DIRECT',
                'ncbi_length': 1163,
                'uniprot_canonical_length': 'N/A',
                'sequence_relationship': 'NO_EXACT_UNIPROT_SEQUENCE_MATCH',
                'matched_uniprot_isoform': 'NONE',
                'sequence_identity': '0.0%',
                'substitutions': 0,
                'insertions': 0,
                'deletions': 0,
                'alphafold_sequence_compatible': 'NO_ALPHAFOLD_MODEL',
                'pdb_canonical_mapping_safe': 'REQUIRES_ALIGNMENT',
                'notes': 'Unmapped RefSeq XP_011530903.1 (Phospholipase B1 isoform X12). No direct UniProt cross-reference.'
            })
        else:
            audited_rows.append({
                'case_id': cid,
                'ncbi_accession': acc,
                'uniprot_accession': 'NONE',
                'database_mapping_class': 'NO_MAPPING',
                'ncbi_length': c['ncbi_info']['length'] if c['ncbi_info'] else 'N/A',
                'uniprot_canonical_length': 'N/A',
                'sequence_relationship': 'NO_EXACT_UNIPROT_SEQUENCE_MATCH',
                'matched_uniprot_isoform': 'NONE',
                'sequence_identity': '0.0%',
                'substitutions': 0,
                'insertions': 0,
                'deletions': 0,
                'alphafold_sequence_compatible': 'NO_ALPHAFOLD_MODEL',
                'pdb_canonical_mapping_safe': 'REQUIRES_ALIGNMENT',
                'notes': f'Unmapped RefSeq {acc}. No explicit UniProt cross-reference.'
            })
        continue
        
    u_acc, db_class = pref_map[cid]
    ncbi_seq = read_local_fasta(cid, split, acc)
    canonical_seq = fetch_uniprot_canonical(u_acc)
    isoform_dict = fetch_uniprot_isoforms_dict(u_acc)
    
    ncbi_len = len(ncbi_seq) if ncbi_seq else 0
    can_len = len(canonical_seq) if canonical_seq else 0
    
    print(f"Auditing [{cid}] NCBI {acc} ({ncbi_len} aa) vs UniProt {u_acc} Canonical ({can_len} aa) [Isoforms: {list(isoform_dict.keys())}]")
    
    # 1. Check exact match with canonical sequence
    if ncbi_seq == canonical_seq:
        seq_rel = "CANONICAL_SEQUENCE_EXACT"
        matched_iso = "NONE"
        seq_id = "100.0%"
        subs = 0
        ins = 0
        dels = 0
        af_compat = "DIRECT_ALPHAFOLD_CANONICAL_COMPATIBLE"
        pdb_safe = "YES"
        notes = f"NCBI FASTA sequence is 100% character-for-character identical to UniProt {u_acc} canonical sequence ({can_len} aa)."
    else:
        # Check exact match with any isoform
        iso_match = None
        for iid, iseq in isoform_dict.items():
            if iseq and ncbi_seq == iseq:
                iso_match = iid
                break
                
        if iso_match:
            seq_rel = "ISOFORM_SEQUENCE_EXACT"
            matched_iso = iso_match
            seq_id = "100.0%"
            subs = 0
            ins = 0
            dels = 0
            af_compat = "ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS"
            pdb_safe = "REQUIRES_ALIGNMENT"
            notes = f"NCBI FASTA sequence is 100% character-for-character identical to documented UniProt isoform {iso_match} ({ncbi_len} aa). Differs from canonical {u_acc} ({can_len} aa)."
        else:
            # Check substitutions vs canonical
            if ncbi_len == can_len:
                diffs = [i for i, (a, b) in enumerate(zip(ncbi_seq, canonical_seq)) if a != b]
                subs = len(diffs)
                ins = 0
                dels = 0
                seq_id = f"{(ncbi_len - subs) / ncbi_len * 100:.1f}%"
                seq_rel = "CANONICAL_SEQUENCE_WITH_VARIANTS"
                matched_iso = "NONE"
                af_compat = "ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS"
                pdb_safe = "REQUIRES_ALIGNMENT"
                notes = f"Same length as canonical {u_acc} ({can_len} aa), but contains {subs} amino acid point substitution(s). Sequence identity {seq_id}."
            else:
                # Isoform or length difference with variants
                # Check closest isoform length
                iso_len_match = None
                for iid, iseq in isoform_dict.items():
                    if iseq and len(iseq) == ncbi_len:
                        iso_len_match = iid
                        diffs = [i for i, (a, b) in enumerate(zip(ncbi_seq, iseq)) if a != b]
                        subs = len(diffs)
                        ins = 0
                        dels = 0
                        seq_id = f"{(ncbi_len - subs) / ncbi_len * 100:.1f}%"
                        break
                        
                if iso_len_match:
                    seq_rel = "ISOFORM_SEQUENCE_WITH_VARIANTS"
                    matched_iso = iso_len_match
                    af_compat = "ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS"
                    pdb_safe = "REQUIRES_ALIGNMENT"
                    notes = f"Matches length of isoform {iso_len_match} ({ncbi_len} aa), with {subs} substitution(s). Differs from canonical {u_acc} ({can_len} aa)."
                else:
                    seq_rel = "NO_EXACT_UNIPROT_SEQUENCE_MATCH"
                    matched_iso = "NONE"
                    subs = abs(ncbi_len - can_len)
                    ins = 0
                    dels = 0
                    seq_id = "N/A"
                    af_compat = "ALPHAFOLD_CANONICAL_SEQUENCE_DIFFERS"
                    pdb_safe = "REQUIRES_ALIGNMENT"
                    notes = f"Sequence length mismatch ({ncbi_len} aa vs canonical {can_len} aa) and no exact isoform match found."

    audited_rows.append({
        'case_id': cid,
        'ncbi_accession': acc,
        'uniprot_accession': u_acc,
        'database_mapping_class': db_class,
        'ncbi_length': ncbi_len,
        'uniprot_canonical_length': can_len,
        'sequence_relationship': seq_rel,
        'matched_uniprot_isoform': matched_iso,
        'sequence_identity': seq_id,
        'substitutions': subs,
        'insertions': ins,
        'deletions': dels,
        'alphafold_sequence_compatible': af_compat,
        'pdb_canonical_mapping_safe': pdb_safe,
        'notes': notes
    })

print("\nAudit completed for all cases!")
with open('scratch/sequence_equivalence_audit_raw.json', 'w') as f:
    json.dump(audited_rows, f, indent=2)

