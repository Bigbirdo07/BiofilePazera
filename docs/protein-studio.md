# Protein Studio

Protein Studio is the BioFile Toolkit workspace for protein sequence properties, structure visualization, and source-aware interpretation. It supports three primary workflows only.

## Inputs

1. Structure File: `.pdb`, `.cif`, `.mmcif`
2. UniProt / AlphaFold DB: accession identifiers such as `P01308`, `P04637`, and `P0DTC2`
3. Protein Sequence: `.fasta`, `.fa`, `.faa`, `.txt`, or pasted amino-acid sequence

FASTQ files are rejected in Protein Studio because they contain sequencing reads rather than protein structures. The UI routes FASTQ users to Sequencing QC.

## Local vs Online

Local operations:

- sequence parsing;
- sequence-derived protein properties;
- PDB coordinate visualization;
- PDB ATOM sequence extraction;
- hydropathy;
- mutation context inspection.

Online operations:

- AlphaFold DB metadata retrieval;
- AlphaFold DB coordinate retrieval;
- AlphaFold DB confidence/PAE data retrieval.
- UniProt curated biology and experimental-structure cross-reference retrieval.

Online requests are explicit user actions. BioFile sends the accession identifier to external scientific databases. Local sequence and structure files are not uploaded.

## Structure Sources

Protein Studio classifies loaded structures as:

- `EXPERIMENTAL`: deposited experimental structures, such as X-ray, NMR, or cryo-EM PDB files;
- `ALPHAFOLD_PREDICTED`: AlphaFold DB predicted structures retrieved online;
- `LOCAL_UNKNOWN`: local coordinate files without enough metadata to classify confidently;
- sequence-only input: amino-acid information without atomic coordinates.

Experimental structures and predicted structures are not interpreted identically.

## Protein Sequence Analysis

Sequence-only input produces:

- length;
- molecular mass;
- estimated pI;
- amino-acid composition;
- Kyte-Doolittle hydropathy.

A sequence-only FASTA does not inherently contain a 3D structure. Protein Studio does not fabricate coordinates or generate synthetic backbones.

## UniProt FASTA Detection

Standard UniProt FASTA headers such as:

```text
>sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
```

are parsed locally to extract:

- accession;
- entry name;
- protein name;
- organism;
- gene;
- sequence.

If an accession is detected, Protein Studio offers an explicit online AlphaFold DB structure fetch. No network request occurs until the user clicks the fetch action.

RefSeq protein accessions can be resolved through UniProt when a mapping is available. Transcript records such as `NM_000207.3` are translated locally before their protein mapping is used. The original identifier and resolved UniProt accession remain visible. A sequence with no reliable identifier or mapping remains sequence-only.

## AlphaFold DB Retrieval

BioFile Toolkit retrieves existing AlphaFold DB model records. It does not run AlphaFold inference, generate new predictions, or upload local sequences for prediction.

## pLDDT

pLDDT estimates AlphaFold's local confidence for each residue. It is not a direct experimental accuracy measurement and is not a probability that a structure is correct.

Protein Studio uses these categories:

- `>90`: Very High
- `70-90`: Confident
- `50-70`: Low
- `<50`: Very Low

Low pLDDT is not proof of protein flexibility. It indicates low prediction confidence and may correspond to disorder or structural uncertainty.

## PAE

Predicted Aligned Error (PAE) describes relative positional uncertainty between residues. PAE helps distinguish local residue confidence from uncertainty in the relative placement of larger regions or domains.

AlphaFold DB currently provides PAE JSON with:

- `predicted_aligned_error`: a square residue-by-residue matrix;
- `max_predicted_aligned_error`: the maximum possible PAE value.

Protein Studio validates the matrix shape, numeric values, maximum value, and expected residue count before rendering a heatmap. Missing or malformed PAE does not crash the workspace.

## Biology

When a UniProt accession is available, the Biology tab retrieves curated UniProt JSON and displays identity, gene, organism, function, subcellular location, cofactors, sequence features, and associated experimental PDB references when those fields exist. Missing fields are shown as `No annotation available`; missing data is not treated as proof that a feature is absent.

Feature ranges can highlight corresponding sequence positions when numbering is compatible. Signal peptides, processed chains, isoforms, unresolved residues, and other numbering differences can prevent a direct mapping, so Protein Studio does not silently shift canonical positions.

The experimental structure list links to deposited RCSB records. When canonical mapping and at least three usable C-alpha pairs are available, a selected experimental chain can be compared with the AlphaFold model using the comparison workflow described below.

## Disorder & Structural Uncertainty

Low pLDDT is reported as low prediction confidence, not as proof of disorder or flexibility. UniProt disorder, compositionally biased, and flexible-region annotations are displayed separately as curated evidence. Where both signals are present, the UI describes them as consistent independent evidence; it does not claim that AlphaFold proves disorder. Feature mapping remains position-based and is reported as uncertain when canonical and observed numbering differ.

## PTMs

Relevant UniProt modified-residue and modification features are shown as curated PTMs and can highlight their annotated residue when mapping is compatible. Protein Studio does not modify AlphaFold coordinates to simulate a PTM. The displayed model may not explicitly represent the structural effect of that modification.

## Cellular Context

Curated UniProt function, subcellular location, cofactors, processing, domains, membrane regions, active sites, binding sites, and other available features are shown only when present in the source response. A structure is displayed outside the complete cellular environment; membranes, crowding, solvent, ions, cofactors, PTMs, partners, pH, and other conditions can influence behavior.

## Experimental Structural Evidence

The Evidence tab lists UniProt-linked experimental PDB references with method and resolution when supplied. References can be opened from RCSB or loaded into the existing NGL viewer. Coverage is shown only when authoritative metadata provides it; unavailable coverage is not inferred. Opening an experimental structure clears AlphaFold PAE and keeps experimental B-factor semantics. A mapped experimental chain can be compared with AlphaFold using canonical residue correspondence and rigid-body superposition.

## Evidence Summary

Evidence dimensions remain separate: local pLDDT, relative-position PAE, curated annotations, and experimental structure availability. Protein Studio does not calculate a combined trust score.

## Mutation Inspector

Mutation Inspector compares a single amino-acid substitution against the loaded sequence and, when coordinates exist, highlights the residue location in the structure view.

It reports descriptive context:

- amino-acid class change;
- charge class change;
- polarity class change;
- hydropathy delta;
- approximate residue mass delta;
- local pLDDT for AlphaFold models when the selected residue has a confidence value.

Mutation Inspector is not a stability predictor, pathogenicity predictor, disease classifier, FoldX/Rosetta replacement, or molecular-dynamics engine. It does not generate a mutant structure.

## Hydropathy

Hydropathy uses the existing Kyte-Doolittle implementation with window size 9. Scores above zero are hydrophobic regions. Protein Studio does not label hydropathy peaks as transmembrane domains because it does not include a validated membrane-domain predictor.

## Experimental Structures

Experimental PDB B-factors are not AlphaFold pLDDT. For experimental structures, Protein Studio does not show AlphaFold confidence metrics or PAE panels.

## Experimental Evidence

The Evidence tab starts with UniProt's curated PDB cross-references; it does not run BLAST, homology, or sequence-similarity searches. When the tab is opened, BioFile requests structured entry, polymer-entity, and non-polymer-entity metadata from the RCSB Data API. A mapped chain is reported only when RCSB explicitly identifies the same UniProt accession. Chain length alone is never used to guess a mapping.

When available, the evidence card reports experimental method, resolution, release date, mapped entity/chains, deposited construct length, canonical coverage, mapped sequence identity, and other molecules such as ions, ligands, nucleic acids, or additional polymer chains. Canonical mapping is accepted only from explicit RCSB UniProt references or RCSB SIFTS alignment data for the active accession. BioFile does not guess from sequence similarity, protein name, chain length, first chain, or alphabetical order. Network failure is reported separately from unavailable mapping. Canonical UniProt positions and PDB author residue numbering remain distinct; detailed insertion-code and mature-chain reconciliation is not yet exposed.

Experimental coverage is not AlphaFold accuracy or whole-model validation. A PDB may represent a truncated construct and may contain unresolved residues. Separate PDB entries are reported as separate experimental structures; BioFile does not currently determine whether they represent the same or different conformational states. Comparison is limited to one explicitly selected mapped chain at a time.

## Canonical Residue Numbering

When reliable mapping is available, Protein Studio uses the UniProt canonical position as the shared biological residue identity. Experimental structures additionally retain the PDB author chain and author residue number. RCSB SIFTS alignment segments and polymer-entity-instance mappings translate between these systems; insertion codes remain text values. Discontinuous segments are not extrapolated across gaps, and unmapped residues are shown without a guessed canonical position.

## Unified Residue Inspector

Structure, Confidence, Biology, Evidence, Sequence, and Mutation views share one selected canonical residue. Selecting a sequence position, Biology feature, NGL residue, or validated mutation updates the same inspector. Experimental coverage is reported as coordinate coverage for the selected canonical residue, not as validation count or accuracy.

## Scientific Limitations

AlphaFold does not establish biological activity, dynamics, mutation stability, pathogenicity, drug binding, cellular behavior, or the structural effect of a PTM. Low prediction confidence and curated disorder are related but distinct evidence types.

Protein Dynamics: AlphaFold DB models represent predicted structural conformations, not molecular-dynamics trajectories. The model should not be interpreted as a simulation of protein bending, folding, or movement over time.

Binding & Drug Design: A predicted protein structure alone does not establish a drug-binding pose or binding affinity. Ligand placement and atomic interaction details should be validated with appropriate experimental or computational methods.

Cellular Context: Protein structures are viewed outside the full cellular environment. Crowding, membranes, cofactors, post-translational modifications, interacting partners, pH, ionic conditions, and other cellular factors may alter biological behavior.

## References

- AlphaFold DB FAQ: https://alphafold.ebi.ac.uk/faq

# AlphaFold vs Experimental Comparison

Protein Studio can compare one UniProt-linked experimental PDB chain with the active AlphaFold DB model when reliable SIFTS/RCSB canonical mapping and at least three usable corresponding C-alpha atoms are available. Pairing uses UniProt canonical positions, preserves PDB author chain/residue numbering, and excludes unmapped or unresolved residues.

- The comparison applies a rigid-body Kabsch/Horn superposition, then reports post-superposition C-alpha RMSD and per-residue C-alpha displacement. These are geometric measurements for the matched experimental region only. RMSD is not AlphaFold accuracy, a validation percentage, or a trust score. Partial coverage, construct mutations, ligands, partners, experimental conditions, and unresolved residues can all affect interpretation. No RMSD/conformation claim is made for unmatched residues or separate PDB entries.

# Uploaded FASTA vs Canonical UniProt Sequence

Before BioFile associates an uploaded FASTA sequence with a UniProt accession or AlphaFold DB model, it explicitly evaluates sequence compatibility.

## Database Mapping vs Sequence Identity

A valid RefSeq-to-UniProt database cross-reference or accession mapping does NOT guarantee sequence identity. An uploaded FASTA sequence may represent a non-canonical isoform, a sequence variant with point substitutions, a truncated construct, or a historical record.

BioFile never assumes `uploaded sequence == canonical sequence` based on accession mapping alone.

## Sequence Compatibility States

BioFile classifies the relationship between the uploaded sequence and the canonical UniProt reference into one of the following states:

- `CANONICAL_EXACT`: 100% sequence identity to the UniProt canonical sequence. Position $N$ of the uploaded sequence equals canonical position $N$ (`DIRECT_1_TO_1`).
- `ISOFORM_EXACT`: 100% sequence identity to an authoritative documented UniProt isoform (e.g. Q13117-3).
- `CANONICAL_WITH_SUBSTITUTIONS`: Uploaded sequence matches canonical length but contains amino-acid substitutions.
- `ISOFORM_WITH_DIFFERENCES`: Uploaded sequence matches an isoform reference with additional substitutions or insertions/deletions.
- `PARTIAL`: Uploaded sequence shares partial sequence alignment ($\ge 80\%$ identity) with gaps.
- `UNRELATED_OR_UNRESOLVED`: Uploaded sequence cannot be confidently aligned or resolved to the reference.

## Sequence Alignment & Numbering Translation

For non-canonical sequences, BioFile computes a deterministic Needleman-Wunsch global alignment between the uploaded sequence and the canonical UniProt sequence.

- **Purpose**: Establishes coordinate correspondence (`uploadedPosition` $\leftrightarrow$ `canonicalPosition`) for residue inspection and annotation mapping.
- **Scoring System**: Match = +2, Mismatch = -1, Gap penalty = -2.
- **Position Maps**: Each uploaded position maps either to an exact canonical position or to `null` if aligned to a canonical gap.

## AlphaFold DB Canonical Model Labeling

When the uploaded FASTA differs from the canonical sequence:

- The AlphaFold DB model is labeled as **"Canonical reference model"** (not "Structure of uploaded sequence").
- An explicit **warning banner** is rendered before/with the 3D structure: *"This AlphaFold DB model represents the UniProt canonical sequence, not the exact uploaded FASTA sequence."*
- **AlphaFold Confidence (pLDDT / PAE)** is explicitly labeled as **"Canonical AlphaFold model confidence"**.
- **Structural Comparison (RMSD)** includes a notice: *"Comparison uses canonical UniProt coordinates."*

## Dual-Coordinate Residue Inspector

The Unified Residue Inspector displays both coordinates when sequences differ:

- **Uploaded FASTA Position**: residue index and one-letter code in uploaded sequence.
- **Canonical UniProt Position**: corresponding canonical 3D model residue index and code, or *"Not represented (aligned to gap)"* if deleted in the uploaded sequence.

## Mutation Inspector Reference Frame

When a FASTA sequence is active, the Mutation Inspector uses the **Uploaded FASTA sequence** as the primary wild-type (WT) reference. Mutation validation checks substitutions against the uploaded WT residue. If the user inspects a canonical-reference context, the reference frame is explicitly labeled to prevent visual disagreement.

## Biology Features & Experimental Evidence Mapping

- **Curated Biology Annotations**: UniProt canonical annotations are mapped to uploaded positions via the alignment map. Annotations falling in deleted regions are displayed as *"Not present in uploaded sequence"* rather than attaching to incorrect nearest residues.
- **Experimental Evidence**: RCSB PDB coverage is shown as canonical coverage, and mapped to uploaded sequence coordinates only where alignment supports it. Canonical experimental coverage and uploaded sequence coverage remain clearly distinguished.
