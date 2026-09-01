# BioFile Toolkit V1 — RC Scientist Usability Test Protocol

**Version**: `1.0.0-rc.1`  
**Purpose**: Formal usability, discoverability, and scientific trust test protocol for beta testers.

> [!IMPORTANT]
> **Tester Instructions**: Perform each task without receiving assistance on which button to click. Report whether the interface was self-explanatory and whether the calculated outputs were clear and trustworthy.

---

## Part A: 10 Guided Core Tasks

### TASK 1 — REVERSE COMPLEMENT
- **Input Sequence**: `ATGCCGTAGCTA`
- **Prompt**: *"Generate the reverse complement of this DNA sequence."*
- **Success Criteria**: Discovers Sequence Tools, enters sequence, selects Reverse Complement, copies output (`TAGCTACGGCAT`).
- **Scoring**: Time, Errors, Confusion, Assistance required.

### TASK 2 — DNA → RNA TRANSCRIPTION
- **Prompt**: *"Convert this DNA sequence to RNA."*
- **Success Criteria**: Discovers DNA $\rightarrow$ RNA transcription option (`AUGCCGUAGCUA`).

### TASK 3 — SIX-FRAME TRANSLATION
- **Input Sequence**: Nucleotide sequence containing open reading frames.
- **Prompt**: *"Look at possible protein translations from this DNA sequence."*
- **Success Criteria**: Discovers Six-Frame Translation table, understands frames (+1..+3, -1..-3).

### TASK 4 — INSPECT FASTA FILE
- **Input File**: `rc-test-data/valid_small.fasta`
- **Prompt**: *"Tell me how many sequences are in this file and its overall GC content."*
- **Success Criteria**: Discovers Inspect workspace, views record count & GC percentage.

### TASK 5 — VALIDATE A BROKEN FASTA
- **Input File**: `rc-test-data/invalid_small.fasta`
- **Prompt**: *"Something may be wrong with this file. Find the problem."*
- **Success Criteria**: Discovers File Validator tool, reads line-by-line syntax error explanation.

### TASK 6 — FASTQ QUALITY CONTROL
- **Input File**: `rc-test-data/valid_small.fastq`
- **Prompt**: *"Check whether this sequencing dataset looks technically good and identify Q20 and Q30 percentages."*
- **Success Criteria**: Navigates to Sequencing QC, inspects Phred score distribution and Q20/Q30 metrics.

### TASK 7 — SMART SPLIT LARGE FASTQ
- **Input File**: `rc-test-data/large_split_test.fastq` (~7.1 MB, 50,000 reads)
- **Prompt**: *"I need to send this FASTQ file, but each file part must be smaller than 3 MB."*
- **Success Criteria**: Uses Smart Split, configures size limit (or record limit 10,000), inspects created part files and split manifest.


### TASK 8 — EXTRACT SEQUENCES BY ID
- **Input File**: `rc-test-data/valid_small.fasta` + ID list (`rc-test-data/id_list.txt`)
- **Prompt**: *"Create a new FASTA containing only the sequences matching these IDs."*
- **Success Criteria**: Discovers Sequence Extractor by ID, inputs target IDs, exports subset FASTA.

### TASK 9 — SHA-256 CHECKSUM VERIFICATION
- **Input File**: `rc-test-data/valid_small.fasta` + SHA-256 hash string (`rc-test-data/checksum_example.sha256`)
- **Prompt**: *"Verify that this copied file is identical to the original using the supplied SHA-256 value."*
- **Success Criteria**: Opens Checksum tool, pastes reference hash, confirms hash match badge.

### TASK 10 — PROTEIN STRUCTURE LOOKUP
- **Prompt**: *"View the predicted structure associated with UniProt accession `P0DTC2` (SARS-CoV-2 Spike protein)."*
- **Success Criteria**: Enters accession in Protein Studio, notes `[ONLINE]` badge, understands pLDDT residue confidence scores.

---

## Part B: 5 Unstructured Scenarios

1. **Scenario 1**: *"You received a FASTQ from a collaborator. Explore the file and determine its quality."*
2. **Scenario 2**: *"You have a DNA sequence and want to learn anything biologically useful about it."*
3. **Scenario 3**: *"You need to send a large 5 GB sequencing file to a core facility with bandwidth limits."*
4. **Scenario 4**: *"You suspect a sequencing file received from a vendor was corrupted in transit."*
5. **Scenario 5**: *"You are investigating a protein accession and want to inspect its predicted 3D structure."*
