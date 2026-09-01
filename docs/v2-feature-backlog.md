# BioFile Toolkit — V2 Feature Request Backlog

**Scope Policy**: Feature freeze in effect for V1. New capability requests from RC testers will be logged here and evaluated for V2 planning.

---

## 1. File Formats & I/O
- [ ] **BAM / CRAM Alignment Inspection**: View BAM alignment header, mapping quality statistics, and flag metrics.
- [ ] **VCF Variant File Support**: Basic VCF header parsing and variant count statistics.
- [ ] **BED / GFF / GTF Annotation Inspection**: Genomic interval parsing and feature length calculations.
- [ ] **GenBank / EMBL Record Parsing**: Parse annotated feature tables and gene locus tags.

---

## 2. Sequence Analysis & Tools
- [ ] **ORF Finder**: Open reading frame detection with min amino acid length filters.
- [ ] **Primer Tm Calculator**: Nearest-neighbor melting temperature calculations for PCR primers.
- [ ] **Motif & Pattern Discovery**: Flexible regex / IUPAC motif scanning across multi-sequence FASTA files.
- [ ] **Expanded Restriction Enzyme Library**: Add full REBASE enzyme dictionary with methylation sensitivity flags.
- [ ] **CRISPR Off-Target Scoring**: Genome-wide mismatch scoring for sgRNA guide selection.

---

## 3. Quality Control & Trimming
- [ ] **Adapter Trimming**: Standard Illumina adapter clipping.
- [ ] **Quality Trimming**: Sliding-window Phred quality score trimming.
- [ ] **Duplication Rate Estimation**: K-mer / sequence duplication metrics.

---

## 4. Protein & Structure
- [ ] **InterPro Domain Annotation**: Domain boundary fetching from InterPro REST API.
- [ ] **Secondary Structure Prediction**: Basic helix/sheet composition scoring.
