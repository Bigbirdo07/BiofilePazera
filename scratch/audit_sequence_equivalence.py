import json
import urllib.request
import time
import os
import glob

# Read strict audit raw results
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
        print(f"Error: {path} not found")
        return None
    with open(path) as f:
        lines = f.read().splitlines()
        seq = "".join(l.strip() for l in lines if not l.startswith('>'))
        return seq

def fetch_uniprot_canonical(u_acc):
    url = f"https://rest.uniprot.org/uniprotkb/{u_acc}.fasta"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    time.sleep(0.3)
    try:
        with urllib.request.urlopen(req) as resp:
            lines = resp.read().decode().splitlines()
            seq = "".join(l.strip() for l in lines if not l.startswith('>'))
            return seq
    except Exception as e:
        print(f"Error fetching canonical FASTA for {u_acc}: {e}")
        return None

def fetch_uniprot_isoforms(u_acc):
    # Fetch UniProt JSON entry to find all isoform accessions and sequences
    url = f"https://rest.uniprot.org/uniprotkb/{u_acc}.json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    time.sleep(0.3)
    isoforms = {}
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            comments = data.get('comments', [])
            for c in comments:
                if c.get('commentType') == 'ALTERNATIVE PRODUCTS':
                    for iso in c.get('isoforms', []):
                        iso_ids = iso.get('isoformIds', [])
                        iso_name = iso.get('name', {}).get('value', '')
                        iso_seq_status = iso.get('isoformSequence', {}).get('type', '')
                        for iid in iso_ids:
                            isoforms[iid] = {
                                'isoform_id': iid,
                                'name': iso_name,
                                'status': iso_seq_status
                            }
    except Exception as e:
        print(f"Error fetching isoforms JSON for {u_acc}: {e}")
        
    # Fetch FASTA for each isoform
    isoform_seqs = {}
    for iid in isoforms:
        url = f"https://rest.uniprot.org/uniprotkb/{iid}.fasta"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        time.sleep(0.3)
        try:
            with urllib.request.urlopen(req) as resp:
                lines = resp.read().decode().splitlines()
                seq = "".join(l.strip() for l in lines if not l.startswith('>'))
                isoform_seqs[iid] = seq
        except Exception as e:
            print(f"Error fetching isoform FASTA for {iid}: {e}")
            
    return isoform_seqs

print("Starting UniProt sequence equivalence audit...")

analysis_results = []

for cid in case_order:
    c = case_map[cid]
    acc = c['ncbi_acc']
    split = c['split']
    
    if cid in pref_map:
        u_acc, db_class = pref_map[cid]
        ncbi_seq = read_local_fasta(cid, split, acc)
        canonical_seq = fetch_uniprot_canonical(u_acc)
        isoform_seqs = fetch_uniprot_isoforms(u_acc)
        
        analysis_results.append({
            'case_id': cid,
            'ncbi_acc': acc,
            'uniprot_acc': u_acc,
            'db_class': db_class,
            'ncbi_seq': ncbi_seq,
            'canonical_seq': canonical_seq,
            'isoform_seqs': isoform_seqs
        })

with open('scratch/sequence_audit_data.json', 'w') as f:
    # write summary
    json.dump([{
        'case_id': r['case_id'],
        'ncbi_acc': r['ncbi_acc'],
        'uniprot_acc': r['uniprot_acc'],
        'ncbi_len': len(r['ncbi_seq']) if r['ncbi_seq'] else 0,
        'canonical_len': len(r['canonical_seq']) if r['canonical_seq'] else 0,
        'isoform_ids': list(r['isoform_seqs'].keys()),
        'isoform_lens': {k: len(v) for k, v in r['isoform_seqs'].items()}
    } for r in analysis_results], f, indent=2)

print("Saved sequence audit data summary to scratch/sequence_audit_data.json")

