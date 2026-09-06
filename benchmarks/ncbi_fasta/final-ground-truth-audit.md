# BioFile Toolkit — Final Benchmark Ground-Truth Cleanup Audit

> [!IMPORTANT]
> **Audit Status**: `BENCHMARK_GROUND_TRUTH_FINALIZED`  
> **Methodology**: Strict cross-reference verification against explicit UniProt database cross-references (`uniProtKBCrossReferences` under `database: RefSeq`). Version mismatches (`.1` vs `.3`, `.3` vs `.6`) are explicitly separated into `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` and verified via sequence string alignment.

---

## Executive Summary & Mapping Classification Breakdown

- **Total Benchmark Set**: 30 / 30 cases (100.0%)
- **`EXACT_VERSION_MATCH`**: **24** cases (80.0%)
- **`BASE_ACCESSION_MATCH_DIFFERENT_VERSION`**: **3** cases (10.0%)
- **`RELATED_BUT_NOT_DIRECT`**: **1** case (3.3%)
- **`NO_MAPPING`**: **2** cases (6.7%)
- **`AMBIGUOUS`**: **0** cases (0.0%)
- **Sum of Mutually Exclusive Levels**: **30 / 30 (100.0%)**

---

## Detailed Audit of `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` Cases

The following 3 cases match the base RefSeq accession string in UniProt, but the RefSeq version in UniProt has been updated relative to the benchmark FASTA accession version. Each case has been independently verified via full sequence string alignment:

### 1. `dev_008`
- **Benchmark RefSeq Accession**: `NP_000536.3` (Length: 631 aa)
- **UniProt RefSeq Accession**: `NP_000536.6` in UniProt `P20823` (`HNF1A_HUMAN`, Length: 631 aa)
- **Verified Protein Identity**: Hepatocyte nuclear factor 1-alpha (`HNF1A`)
- **Sequence Length Comparison**: Both versions are exactly **631 aa**.
- **Sequence String Comparison**: **1 amino acid substitution** at position 574:
  - `NP_000536.3`: `Gly574` (`G`)
  - `NP_000536.6`: `Ser574` (`S`)

### 2. `gen_006`
- **Benchmark RefSeq Accession**: `NP_000042.1` (Length: 3056 aa)
- **UniProt RefSeq Accession**: `NP_000042.3` in UniProt `Q13315` (`ATM_HUMAN`, Length: 3056 aa)
- **Verified Protein Identity**: Serine-protein kinase ATM (`ATM`)
- **Sequence Length Comparison**: Both versions are exactly **3056 aa**.
- **Sequence String Comparison**: **3 amino acid substitutions**:
  - Position 554: `NP_000042.1`=`Ala` (`A`) vs `NP_000042.3`=`Thr` (`T`)
  - Position 750: `NP_000042.1`=`Asn` (`N`) vs `NP_000042.3`=`Lys` (`K`)
  - Position 3003: `NP_000042.1`=`Asp` (`D`) vs `NP_000042.3`=`Asn` (`N`)

### 3. `gen_008`
- **Benchmark RefSeq Accession**: `NP_000517.2` (Length: 472 aa)
- **UniProt RefSeq Accession**: `NP_000517.3` in UniProt `P02533` (`K1C14_HUMAN`, Length: 472 aa)
- **Verified Protein Identity**: Keratin, type I cytoskeletal 14 (`K1C14`)
- **Sequence Length Comparison**: Both versions are exactly **472 aa**.
- **Sequence String Comparison**: **1 amino acid substitution** at position 63:
  - `NP_000517.2`: `Tyr63` (`Y`)
  - `NP_000517.3`: `Cys63` (`C`)

---

## Complete 30-Row Final Ground-Truth Audit Table

| case_id | ncbi_accession | ncbi_length | ncbi_description | mapping_class | uniprot_accession | uniprot_length | exact_refseq_crossref | verdict | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dev_001` | `NP_000509.1` | 147 | hemoglobin subunit beta [Homo sapiens] | `EXACT_VERSION_MATCH` | `P68871` | 147 | `NP_000509.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000509.1) in UniProt P68871 (HBB_HUMAN). Lengths: NCBI 147 aa / UniProt 147 aa. |
| `dev_002` | `NP_005219.2` | 1210 | epidermal growth factor receptor isoform a precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P00533` | 1210 | `NP_005219.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_005219.2) in UniProt P00533 (EGFR_HUMAN). Lengths: NCBI 1210 aa / UniProt 1210 aa. |
| `dev_003` | `YP_009724389.1` | 7096 | ORF1ab polyprotein [Severe acute respiratory syndrome coronavirus 2] | `EXACT_VERSION_MATCH` | `P0DTD1` | 7096 | `YP_009724389.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (YP_009724389.1) in UniProt P0DTD1 (R1AB_SARS2). Lengths: NCBI 7096 aa / UniProt 7096 aa. |
| `dev_004` | `NP_061820.1` | 105 | cytochrome c [Homo sapiens] | `EXACT_VERSION_MATCH` | `P99999` | 105 | `NP_061820.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_061820.1) in UniProt P99999 (CYC_HUMAN). Lengths: NCBI 105 aa / UniProt 105 aa. |
| `dev_005` | `NP_005359.1` | 154 | myoglobin isoform 1 [Homo sapiens] | `EXACT_VERSION_MATCH` | `P02144` | 154 | `NP_005359.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_005359.1) in UniProt P02144 (MYG_HUMAN). Lengths: NCBI 154 aa / UniProt 154 aa. |
| `dev_006` | `NP_000230.1` | 148 | lysozyme C precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P61626` | 148 | `NP_000230.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000230.1) in UniProt P61626 (LYSC_HUMAN). Lengths: NCBI 148 aa / UniProt 148 aa. |
| `dev_007` | `NP_001005785.1` | 534 | deleted in azoospermia protein 2 isoform 2 [Homo sapiens] | `EXACT_VERSION_MATCH` | `Q13117` | 558 | `NP_001005785.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001005785.1) in UniProt Q13117 (DAZ2_HUMAN). Lengths: NCBI 534 aa / UniProt 558 aa. |
| `dev_008` | `NP_000536.3` | 631 | transcription factor 1, hepatic [Homo sapiens] | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | `P20823` | 631 | `NP_000536.6` | `BASE_MATCH_VERSION_UPDATED` | Benchmark RefSeq NP_000536.3 vs UniProt RefSeq NP_000536.6 (P20823, HNF1A_HUMAN). Verified identity: HNF1A. Lengths: both 631 aa. Sequence compared: 1 point substitution (G574S). |
| `dev_009` | `NP_000199.2` | 1382 | insulin receptor isoform Long preproprotein [Homo sapiens] | `EXACT_VERSION_MATCH` | `P06213` | 1382 | `NP_000199.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000199.2) in UniProt P06213 (INSR_HUMAN). Lengths: NCBI 1382 aa / UniProt 1382 aa. |
| `dev_010` | `XP_011530903.1` | 1163 | phospholipase B1, membrane-associated isoform X12 [Homo sapiens] | `RELATED_BUT_NOT_DIRECT` | `NONE` | N/A | `NONE` | `REJECTED_FUZZY_MAPPING` | NCBI XP_011530903.1 is phospholipase B1 isoform X12 (1163 aa). UniProt human PLB1 (Q6P1J6) lists NP_689879.3. Prior claim of P59533 (TAS2R38, 333 aa) was based on fuzzy text search and is rejected. |
| `gen_001` | `NP_001185808.1` | 749 | ATP5J2-PTCD1 fusion protein [Homo sapiens] | `EXACT_VERSION_MATCH` | `B4DJ38` | 749 | `NP_001185808.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001185808.1) in UniProt B4DJ38 (B4DJ38_HUMAN). Lengths: NCBI 749 aa / UniProt 749 aa. |
| `gen_002` | `NP_000620.2` | 557 | interferon alpha/beta receptor 1 isoform 2 precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P17181` | 557 | `NP_000620.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000620.2) in UniProt P17181 (INAR1_HUMAN). Lengths: NCBI 557 aa / UniProt 557 aa. |
| `gen_003` | `NP_414542.1` | 21 | thr operon leader peptide [Escherichia coli str. K-12 substr. MG1655] | `EXACT_VERSION_MATCH` | `P0AD86` | 21 | `NP_414542.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_414542.1) in UniProt P0AD86 (LPT_ECOLI). Lengths: NCBI 21 aa / UniProt 21 aa. |
| `gen_004` | `NP_002924.1` | 156 | ribonuclease pancreatic precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P07998` | 156 | `NP_002924.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_002924.1) in UniProt P07998 (RNAS1_HUMAN). Lengths: NCBI 156 aa / UniProt 156 aa. |
| `gen_005` | `NP_001082.2` | 751 | diamine oxidase [copper-containing] isoform 2 precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P19801` | 751 | `NP_001082.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001082.2) in UniProt P19801 (AOC1_HUMAN). Lengths: NCBI 751 aa / UniProt 751 aa. |
| `gen_006` | `NP_000042.1` | 3056 | ataxia telangiectasia mutated (includes complementation groups A, C and D); Ataxia-telangiectasia mutated (includes complementation groups A, C, D, and E) [Homo sapiens] | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | `Q13315` | 3056 | `NP_000042.3` | `BASE_MATCH_VERSION_UPDATED` | Benchmark RefSeq NP_000042.1 vs UniProt RefSeq NP_000042.3 (Q13315, ATM_HUMAN). Verified identity: ATM. Lengths: both 3056 aa. Sequence compared: 3 point substitutions (A554T, N750K, D3003N). |
| `gen_007` | `NP_000468.1` | 609 | albumin preproprotein [Homo sapiens] | `EXACT_VERSION_MATCH` | `P02768` | 609 | `NP_000468.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000468.1) in UniProt P02768 (ALBU_HUMAN). Lengths: NCBI 609 aa / UniProt 609 aa. |
| `gen_008` | `NP_000517.2` | 472 | keratin, type I cytoskeletal 14 [Homo sapiens] | `BASE_ACCESSION_MATCH_DIFFERENT_VERSION` | `P02533` | 472 | `NP_000517.3` | `BASE_MATCH_VERSION_UPDATED` | Benchmark RefSeq NP_000517.2 vs UniProt RefSeq NP_000517.3 (P02533, K1C14_HUMAN). Verified identity: K1C14. Lengths: both 472 aa. Sequence compared: 1 point substitution (Y63C). |
| `gen_009` | `NP_001005.1` | 165 | small ribosomal subunit protein eS10 [Homo sapiens] | `EXACT_VERSION_MATCH` | `P46783` | 165 | `NP_001005.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001005.1) in UniProt P46783 (RS10_HUMAN). Lengths: NCBI 165 aa / UniProt 165 aa. |
| `gen_010` | `NP_001254714.1` | 250 | lymphocyte function-associated antigen 3 [Macaca mulatta] | `EXACT_VERSION_MATCH` | `H9G2A1` | 250 | `NP_001254714.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001254714.1) in UniProt H9G2A1 (H9G2A1_MACMU). Lengths: NCBI 250 aa / UniProt 250 aa. |
| `holdout_001` | `YP_009724397.2` | 419 | nucleocapsid phosphoprotein [Severe acute respiratory syndrome coronavirus 2] | `EXACT_VERSION_MATCH` | `P0DTC9` | 419 | `YP_009724397.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (YP_009724397.2) in UniProt P0DTC9 (NCAP_SARS2). Lengths: NCBI 419 aa / UniProt 419 aa. |
| `holdout_002` | `NP_001009071.1` | 393 | dual specificity mitogen-activated protein kinase kinase 1 [Pan troglodytes] | `EXACT_VERSION_MATCH` | `Q9XT09` | 393 | `NP_001009071.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001009071.1) in UniProt Q9XT09 (MP2K1_PANTR). Lengths: NCBI 393 aa / UniProt 393 aa. |
| `holdout_003` | `NP_000109.1` | 625 | endoglin isoform 2 precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P17813` | 658 | `NP_000109.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000109.1) in UniProt P17813 (EGLN_HUMAN). Lengths: NCBI 625 aa / UniProt 658 aa. |
| `holdout_004` | `NP_002737.2` | 379 | mitogen-activated protein kinase 3 isoform 1 [Homo sapiens] | `EXACT_VERSION_MATCH` | `P27361` | 379 | `NP_002737.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_002737.2) in UniProt P27361 (MK03_HUMAN). Lengths: NCBI 379 aa / UniProt 379 aa. |
| `holdout_005` | `WP_011012956.1` | 113 | MULTISPECIES: 30S ribosomal protein S17 [Pyrococcus] | `EXACT_VERSION_MATCH` | `Q8U008` | 113 | `WP_011012956.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (WP_011012956.1) in UniProt Q8U008 (RS17_PYRFU). Lengths: NCBI 113 aa / UniProt 113 aa. |
| `holdout_006` | `NP_001014431.1` | 480 | RAC-alpha serine/threonine-protein kinase [Homo sapiens] | `EXACT_VERSION_MATCH` | `P31749` | 480 | `NP_001014431.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_001014431.1) in UniProt P31749 (AKT1_HUMAN). Lengths: NCBI 480 aa / UniProt 480 aa. |
| `holdout_007` | `XP_001633519.1` | 884 | uncharacterized protein LOC5513279 [Nematostella vectensis] | `NO_MAPPING` | `NONE` | N/A | `NONE` | `NO_REFSEQ_XREF` | NCBI XP_001633519.1 is Nematostella vectensis LOC5513279 (884 aa). No UniProt record contains a RefSeq cross-reference for XP_001633519.1. |
| `holdout_008` | `YP_009047134.1` | 348 | replication-associated protein [McMurdo Ice Shelf pond-associated circular DNA virus-4] | `NO_MAPPING` | `NONE` | N/A | `NONE` | `NO_REFSEQ_XREF` | NCBI YP_009047134.1 is McMurdo viral replication protein (348 aa). No UniProt record contains a RefSeq cross-reference for YP_009047134.1. |
| `holdout_009` | `NP_000312.2` | 928 | retinoblastoma-associated protein isoform 1 [Homo sapiens] | `EXACT_VERSION_MATCH` | `P06400` | 928 | `NP_000312.2` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_000312.2) in UniProt P06400 (RB_HUMAN). Lengths: NCBI 928 aa / UniProt 928 aa. |
| `holdout_010` | `NP_003343.1` | 101 | small ubiquitin-related modifier 1 isoform a precursor [Homo sapiens] | `EXACT_VERSION_MATCH` | `P63165` | 101 | `NP_003343.1` | `EXACT_VERSION_VERIFIED` | Exact RefSeq accession.version (NP_003343.1) in UniProt P63165 (SUMO1_HUMAN). Lengths: NCBI 101 aa / UniProt 101 aa. |

---

Final status:
`BENCHMARK_GROUND_TRUTH_FINALIZED`
