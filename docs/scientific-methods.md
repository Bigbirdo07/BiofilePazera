# BioFile Toolkit V1 — Scientific Methods & Mathematical Conventions

**Version**: `1.0.0-rc.2`
**Purpose**: Document all mathematical formulas, biological algorithms, and assumptions for scientific transparency and publication reproducibility.

---

## 1. Sequence Transformations & IUPAC Mapping

### Complement Matrix
Nucleotide complementation follows standard IUPAC recommendations for 15 nucleic acid characters:

$$\begin{aligned}
\text{A} &\leftrightarrow \text{T} & \text{C} &\leftrightarrow \text{G} & \text{R (A/G)} &\leftrightarrow \text{Y (C/T)} & \text{S (G/C)} &\leftrightarrow \text{S} \\
\text{W (A/T)} &\leftrightarrow \text{W} & \text{K (G/T)} &\leftrightarrow \text{M (A/C)} & \text{B (C/G/T)} &\leftrightarrow \text{V (A/C/G)} & \text{D (A/G/T)} &\leftrightarrow \text{H (A/C/T)} \\
\text{N} &\leftrightarrow \text{N}
\end{aligned}$$

---

## 2. GC Content Formula

$$\text{GC \%} = \frac{N_{\text{G}} + N_{\text{C}}}{N_{\text{A}} + N_{\text{C}} + N_{\text{G}} + N_{\text{T}} + N_{\text{U}}} \times 100$$

> [!NOTE]
> Ambiguous bases (`N`, `R`, `Y`, etc.) are excluded from the denominator to ensure GC% accurately reflects canonical base proportions.

---

## 3. FASTQ Quality Metrics & Phred Model

Phred quality scores $Q$ are mapped from ASCII characters using Phred+33 offset:

$$Q = \text{ord}(\text{char}) - 33$$

Base-call error probability $P_e$ is defined as:

$$P_e = 10^{-\frac{Q}{10}}$$

- **Q20**: $Q \ge 20 \implies P_e \le 0.01$ (99% Accuracy threshold)
- **Q30**: $Q \ge 30 \implies P_e \le 0.001$ (99.9% Accuracy threshold)

---

## 4. Protein Properties & Hydropathy

### Kyte-Doolittle Hydropathy Scale
Hydropathy scores use the standard Kyte-Doolittle amino acid values:
`I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4, T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5, Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5`

Calculated over a sliding window of size $W = 9$ residues.

---

## 5. AlphaFold pLDDT Score Interpretation

Per-residue predicted Local Distance Difference Test (pLDDT) confidence ranges:
- **Very High**: $\text{pLDDT} > 90$
- **Confident**: $70 \le \text{pLDDT} \le 90$
- **Low**: $50 \le \text{pLDDT} < 70$
- **Very Low**: $\text{pLDDT} < 50$ (often corresponds to intrinsically disordered regions)

---

## 6. Cryptographic Hash

File integrity fingerprints use standard **SHA-256** (FIPS 180-4) calculated over raw file bytes.
