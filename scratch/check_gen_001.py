import json

with open('scratch/sequence_equivalence_audit_raw.json') as f:
    data = json.load(f)

for d in data:
    if d['case_id'] == 'gen_001':
        print("gen_001:", d)

