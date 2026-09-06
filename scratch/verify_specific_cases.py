import json
import urllib.request

accs = ['P0DTD1', 'P0DTC9', 'P0DTC3', 'P0DTC4', 'P59533']

for acc in accs:
    url = f"https://rest.uniprot.org/uniprotkb/{acc}.json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            entry = json.loads(resp.read().decode())
            primary_acc = entry.get('primaryAccession')
            entry_name = entry.get('uniProtkbId')
            xrefs = entry.get('uniProtKBCrossReferences', [])
            refseq_xrefs = [x for x in xrefs if x.get('database') == 'RefSeq']
            print(f"=== UniProt {primary_acc} ({entry_name}) ===")
            print(f"RefSeq XRefs ({len(refseq_xrefs)}):")
            for rx in refseq_xrefs:
                print(f"  id: {rx.get('id')} | moleculeType: {rx.get('moleculeType')} | properties: {rx.get('properties')}")
    except Exception as e:
        print(f"Error fetching {acc}: {e}")

