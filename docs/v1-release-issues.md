# BioFile Toolkit V1 — Release Issues Log

This document tracks all bugs, edge-case failures, and audit findings classified by severity:

- **P0**: Data corruption or scientifically incorrect output (RELEASE BLOCKER)
- **P1**: Major scientific calculation or file-processing failure (RELEASE BLOCKER)
- **P2**: Significant usability or performance degradation
- **P3**: Minor non-blocking issue or UI inconsistency
- **P4**: Cosmetic UI or formatting request

---

## Issue Log

| Issue ID | Severity | Feature Area | Description | Status | Resolution / Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ISSUE-001` | P2 | Product Copy | Memory usage claimed "≤30 MB RAM" without published benchmark matrix. | **RESOLVED** | Updated UI copy to: *"Streaming architecture designed to keep processing memory bounded as file size increases."* Added benchmark suite. |
| `ISSUE-002` | P2 | Product Copy | App claimed "100% offline" despite AlphaFold DB UniProt lookup button. | **RESOLVED** | Clarified copy: *"Sequence files and local analyses are processed on your computer. Online database retrieval occurs only when explicitly requested."* Added visible `[ONLINE]` tags to remote lookup buttons. |
| `ISSUE-003` | P3 | Translation Copy | 6-frame translation referred to as "ORF identification" in prose. | **RESOLVED** | Updated language to *"six-frame translation / coding-region exploration"* to reflect standard reading frame output accurately. |
| `ISSUE-004` | P3 | Protein Studio | AlphaFold structure viewer referred to as "AlphaFold prediction engine". | **RESOLVED** | Updated language to *"AlphaFold DB structure viewer"* to explicitly indicate structure retrieval from the public EMBL-EBI database. |

---

## Release Blocking Criteria
No release candidate may be published while any **P0** or **P1** issues remain open.
