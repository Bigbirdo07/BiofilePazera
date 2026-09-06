import json
import urllib.request
import urllib.parse
import os
import glob
import re

cases = [
    ("dev_001", "NP_000509.1", "development"),
    ("dev_002", "NP_005219.2", "development"),
    ("dev_003", "YP_009724389.1", "development"),
    ("dev_004", "NP_061820.1", "development"),
    ("dev_005", "NP_005359.1", "development"),
    ("dev_006", "NP_000230.1", "development"),
    ("dev_007", "NP_001005785.1", "development"),
    ("dev_008", "NP_000536.3", "development"),
    ("dev_009", "NP_000199.2", "development"),
    ("dev_010", "XP_011530903.1", "development"),

    ("gen_001", "NP_001185808.1", "generalization"),
    ("gen_002", "NP_000620.2", "generalization"),
    ("gen_003", "NP_414542.1", "generalization"),
    ("gen_004", "NP_002924.1", "generalization"),
    ("gen_005", "NP_001082.2", "generalization"),
    ("gen_006", "NP_000042.1", "generalization"),
    ("gen_007", "NP_000468.1", "generalization"),
    ("gen_008", "NP_000517.2", "generalization"),
    ("gen_009", "NP_001005.1", "generalization"),
    ("gen_010", "NP_001254714.1", "generalization"),

    ("holdout_001", "YP_009724397.2", "blind_holdout"),
    ("holdout_002", "NP_001009071.1", "blind_holdout"),
    ("holdout_003", "NP_000109.1", "blind_holdout"),
    ("holdout_004", "NP_002737.2", "blind_holdout"),
    ("holdout_005", "WP_011012956.1", "blind_holdout"),
    ("holdout_006", "NP_001014431.1", "blind_holdout"),
    ("holdout_007", "XP_001633519.1", "blind_holdout"),
    ("holdout_008", "YP_009047134.1", "blind_holdout"),
    ("holdout_009", "NP_000312.2", "blind_holdout"),
    ("holdout_010", "NP_003343.1", "blind_holdout")
]

def fetch_ncbi_info(accession):
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=protein&id={accession}&retmode=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            result = data.get('result', {})
            uids = result.get('uids', [])
            if uids:
                uid = uids[0]
                rec = result.get(uid, {})
                title = rec.get('title', '')
                slen = rec.get('slen', 0)
                organism = rec.get('organism', '')
                caption = rec.get('caption', '')
                return {
                    'accession_version': caption if '.' in caption else accession,
                    'length': slen,
                    'title': title,
                    'organism': organism
                }
    except Exception as e:
        print(f"Error fetching NCBI for {accession}: {e}")
    return None

def query_uniprot_exact_xref(accession):
    base_acc = accession.split('.')[0]
    hits = []
    
    # Try searching UniProt for xref refseq matching versioned and unversioned accession
    for search_term in [accession, base_acc]:
        query_str = f"xref:refseq-{search_term}"
        url = f"https://rest.uniprot.org/uniprotkb/search?query={urllib.parse.quote(query_str)}&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                results = data.get('results', [])
                for entry in results:
                    primary_acc = entry.get('primaryAccession', '')
                    entry_name = entry.get('uniProtkbId', '')
                    seq_len = entry.get('sequence', {}).get('length', 0)
                    
                    xrefs = entry.get('uniProtKBCrossReferences', [])
                    matched_refseq_ids = []
                    for xref in xrefs:
                        if xref.get('database') == 'RefSeq':
                            xref_id = xref.get('id', '')
                            # Exact check: xref_id must equal accession or base_acc or match version
                            if xref_id == accession or xref_id == base_acc or xref_id.split('.')[0] == base_acc:
                                matched_refseq_ids.append(xref_id)
                    
                    if matched_refseq_ids:
                        hits.append({
                            'uniprot_acc': primary_acc,
                            'entry_name': entry_name,
                            'uniprot_len': seq_len,
                            'matched_refseq_ids': matched_refseq_ids,
                            'protein_name': entry.get('proteinDescription', {}).get('recommendedName', {}).get('fullName', {}).get('value', ''),
                            'organism': entry.get('organism', {}).get('scientificName', '')
                        })
        except Exception as e:
            print(f"Error querying UniProt for {search_term}: {e}")
            
    # Deduplicate hits by UniProt accession
    unique_hits = {}
    for h in hits:
        unique_hits[h['uniprot_acc']] = h
    return list(unique_hits.values())

full_results = []
for case_id, acc, split in cases:
    ncbi_info = fetch_ncbi_info(acc)
    uniprot_hits = query_uniprot_exact_xref(acc)
    full_results.append({
        'case_id': case_id,
        'ncbi_acc': acc,
        'split': split,
        'ncbi_info': ncbi_info,
        'uniprot_hits': uniprot_hits
    })

with open('scratch/strict_audit_raw.json', 'w') as f:
    json.dump(full_results, f, indent=2)

print("Saved raw audit query to scratch/strict_audit_raw.json")
