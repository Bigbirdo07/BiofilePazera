# BioFile Toolkit — Real NCBI FASTA Generalization Benchmark

This benchmark directory contains a curated dataset of **30 real-world protein FASTA files** downloaded directly from official NCBI E-utilities endpoints. It is designed to evaluate BioFile Toolkit's ability to handle un-curated protein sequences across diverse species, structural classes, sequence lengths, and database mapping states **without modifying BioFile runtime code**.

---

## Benchmark Dataset Structure

```
benchmarks/ncbi_fasta/
├── development/           # 10 NCBI FASTAs (dev_001 to dev_010)
├── generalization/        # 10 NCBI FASTAs (gen_001 to gen_010)
├── blind_holdout/         # 10 NCBI FASTAs (holdout_001 to holdout_010)
├── accession_blind/       # 10 Identifier-stripped FASTAs (blind_protein_001 to 010)
├── manifest.csv           # Master dataset metadata & mapping manifest
├── first_pass_results.csv # First-pass BioFile test suite results
├── README.md              # Dataset description and layout
└── generalization-report.md # Comprehensive benchmark generalization report
```

---

## Dataset Summary Statistics

- **Total Records**: 30 real NCBI proteins (3 splits: 10 dev, 10 generalization, 10 blind holdout)
- **Blind Accession Copies**: 10 identifier-stripped FASTAs in `accession_blind/` (`>blind_protein_001` to `010`)
- **Organisms Represented (9)**: Escherichia coli str. K-12 substr. MG1655, Homo sapiens, Macaca mulatta, McMurdo Ice Shelf pond-associated circular DNA virus-4, Nematostella vectensis, Pan troglodytes, Pyrococcus, Severe acute respiratory syndrome coronavirus 2, copper-containing
- **Sequence Length Range**: 21 aa – 7096 aa (Mean: 800 aa)
- **UniProt Mapping Rate**: 27/30 (90.0%)
- **AlphaFold Model Availability Rate**: 26/30 (86.7%)
- **Experimental PDB Structure Rate**: 0/30 (0.0%)

---

## First-Pass BioFile Evaluation Summary

- **Total Evaluated**: 30 cases
- **Full Pass**: 28/30 (93.3%)
- **Pass with Limitations**: 2/30 (6.7%)
- **Fail**: 0/30 (0.0%)
- **Scientific Safety Rate**: 100% (Zero fabricated UniProt accessions or 3D models on unmapped records)

See [`generalization-report.md`](generalization-report.md) for full breakdown and detailed findings.
