# Protein Studio — Expected Results

## 1UBQ reference FASTA
Sequence:
`MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG`

- Length: 76 aa
- Expected identity: ubiquitin reference sequence used for the 1UBQ validation control.

## 1CRN reference FASTA
Sequence:
`TTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGACCPGDYAN`

- Length: 46 aa
- Expected identity: crambin reference sequence used for the 1CRN validation control.

## Protein property controls
- `hydrophobic_control` should show a strongly hydrophobic profile.
- `hydrophilic_control` should be much less hydrophobic / strongly polar-charged.
- `mixed_control` contains a hydrophobic N-terminal region plus acidic C-terminal tail.

These are qualitative controls; exact hydropathy values depend on the documented window size.

## Minimal PDB
`04_minimal_experimental_structure.pdb`

Expected PDB -> FASTA sequence:
`AGSLK`

Expected length:
5 residues

Critical semantics:
- File is marked `X-RAY DIFFRACTION`.
- B-factor values are ordinary experimental-style B values.
- They must NOT be labeled as AlphaFold pLDDT.

## Online accession controls
- `P04637`: human p53 canonical protein; expected canonical length 393 aa.
- `1UBQ`: experimental X-ray structure.
- `1CRN`: experimental X-ray structure.
