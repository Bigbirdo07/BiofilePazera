# Protein Studio Permanent Acceptance Set

These four proteins are the required acceptance set for Protein Studio changes and release candidates.

| Input | Primary purpose | Expected source |
| --- | --- | --- |
| `P01308` / `P01308_INS_HUMAN_ncbi.fasta` | FASTA accession detection, AlphaFold retrieval, Biology, and Mutation | AlphaFold DB predicted model |
| `P04637` / `P04637_P53_HUMAN_ncbi.fasta` | Larger protein, confidence, PAE, and annotations | AlphaFold DB predicted model |
| `1UBQ` | Experimental structure safety/control | RCSB experimental PDB, 76 residues |
| `1CRN` | Small experimental structure safety/control | RCSB experimental PDB, 46 residues |

## Required Invariants

- P01308 FASTA is analyzed locally, recognizes `P01308`, and offers an explicit online AlphaFold DB fetch.
- P01308 retrieval renders coordinates, pLDDT, PAE, Biology annotations, and Mutation Inspector context.
- P04637 resolves to the canonical 393-aa AlphaFold model and renders pLDDT, PAE, and Biology annotations.
- 1UBQ and 1CRN remain experimental. Neither may display pLDDT, PAE, or AlphaFold badges.
- Switching between AlphaFold and experimental inputs clears stale accession, organism, confidence, PAE, and residue-selection state.
- Local FASTA/PDB analysis remains available when online retrieval is unavailable.
- Online requests transmit identifiers/database queries, not local sequence or structure files.

## Canonical P01308 FASTA

```text
>sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED
LQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN
```

This set is intentionally stable. New acceptance cases may supplement it, but these four must remain in every Protein Studio release verification pass.
