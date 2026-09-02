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

The experimental structure list links to deposited RCSB records. AlphaFold/experimental overlay and RMSD comparison are deferred until alignment and coordinate mapping are validated.

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

## Scientific Limitations

Protein Dynamics: AlphaFold DB models represent predicted structural conformations, not molecular-dynamics trajectories. The model should not be interpreted as a simulation of protein bending, folding, or movement over time.

Binding & Drug Design: A predicted protein structure alone does not establish a drug-binding pose or binding affinity. Ligand placement and atomic interaction details should be validated with appropriate experimental or computational methods.

Cellular Context: Protein structures are viewed outside the full cellular environment. Crowding, membranes, cofactors, post-translational modifications, interacting partners, pH, ionic conditions, and other cellular factors may alter biological behavior.

## References

- AlphaFold DB FAQ: https://alphafold.ebi.ac.uk/faq
