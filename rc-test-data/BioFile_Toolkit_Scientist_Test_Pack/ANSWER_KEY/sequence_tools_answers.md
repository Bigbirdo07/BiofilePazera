# Sequence Tools — Expected Results

## `basic_dna`
Input:
`ATGCCGTAGCTA`

- Length: 12 nt
- GC%: 50.0000%
- Complement: `TACGGCATCGAT`
- Reverse complement: `TAGCTACGGCAT`
- DNA -> RNA: `AUGCCGUAGCUA`

## `coding_control`
Input:
`ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG`

- Length: 39 nt
- Frame +1 translation: `MAIVMGR*KGAR*`
- Frames +1/+2/+3:
  - +1: `MAIVMGR*KGAR*`
  - +2: `WPL*WAAERVPD`
  - +3: `GHCNGPLKGCPI`
- Reverse-complement frames can be checked separately by the app.

## `pam_restriction_control`
Input:
`TTTAGGCCGAATTCAAGCTTGGATCCGCGTCCAGGATTTCC`

Contains explicit motifs:
- EcoRI `GAATTC`
- HindIII `AAGCTT`
- BamHI `GGATCC`
- Multiple `NGG`-style PAM opportunities are present.

## RNA control
RNA:
`AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG`

RNA -> DNA:
`ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG`

Frame +1 translation:
`MAIVMGR*KGAR*`

## IUPAC control
Input:
`ACGTRYSWKMBDHVN`

Complement:
`TGCAYRSWMKVHDBN`

Reverse complement:
`NBDHVKMWSRYACGT`

## Known coding sequence
Input:
`ATGGCTCTGTGGATGCGTCTGCTGCCGCTGCTGGCTCTGCTGTGGGGTCCTGGT`

Expected +1 translation:
`MALWMRLLPLLALLWGPG`
