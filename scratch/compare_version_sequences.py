import urllib.request
import time

diff_cases = [
    ("dev_008", "NP_000536.3", "NP_000536.6", "P20823", "HNF1A_HUMAN"),
    ("gen_006", "NP_000042.1", "NP_000042.3", "Q13315", "ATM_HUMAN"),
    ("gen_008", "NP_000517.2", "NP_000517.3", "P02533", "K1C14_HUMAN")
]

def fetch_fasta(acc):
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id={acc}&rettype=fasta&retmode=text"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    time.sleep(0.6)
    with urllib.request.urlopen(req) as resp:
        lines = resp.read().decode().splitlines()
        seq = "".join(line.strip() for line in lines if not line.startswith('>'))
        header = lines[0] if lines else ""
        return header, seq

for cid, bench_acc, uniprot_refseq_acc, u_acc, u_name in diff_cases:
    print("=" * 80)
    print(f"CASE: {cid} | Benchmark Acc: {bench_acc} | UniProt RefSeq Acc: {uniprot_refseq_acc}")
    print(f"UniProt Target: {u_acc} ({u_name})")
    
    h1, s1 = fetch_fasta(bench_acc)
    h2, s2 = fetch_fasta(uniprot_refseq_acc)
    
    print(f"  Benchmark ({bench_acc}): Header: {h1[:60]}... | Length: {len(s1)}")
    print(f"  UniProt XRef ({uniprot_refseq_acc}): Header: {h2[:60]}... | Length: {len(s2)}")
    
    if s1 == s2:
        print("  --> SEQUENCE COMPARISON: 100% IDENTICAL (0 amino acid differences)")
    else:
        diffs = [i for i, (a, b) in enumerate(zip(s1, s2)) if a != b]
        len_diff = abs(len(s1) - len(s2))
        print(f"  --> SEQUENCE COMPARISON: CHANGED ({len(diffs)} point substitutions, length diff = {len_diff})")
        if diffs:
            for idx in diffs[:5]:
                print(f"      Pos {idx+1}: {bench_acc}='{s1[idx]}' vs {uniprot_refseq_acc}='{s2[idx]}'")

