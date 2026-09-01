use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AminoAcidComposition {
    pub hydrophobic: usize, // A, V, I, L, M, F, W, P
    pub polar: usize,       // S, T, C, Y, N, Q
    pub acidic: usize,      // D, E (negative charge at pH 7)
    pub basic: usize,       // K, R, H (positive charge at pH 7)
    pub glycine: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProteinProperties {
    pub length: usize,
    pub molecular_weight_kda: f64,
    pub isoelectric_point_pi: f64,
    pub composition: AminoAcidComposition,
    pub hydropathy_profile: Vec<f64>, // Kyte-Doolittle scores
    pub predicted_helix_pct: f64,
    pub predicted_sheet_pct: f64,
    pub predicted_coil_pct: f64,
}

/// Standard 3-letter to 1-letter amino acid conversion table
pub fn aa3_to_aa1(code: &str) -> char {
    match code.to_uppercase().as_str() {
        "ALA" => 'A',
        "CYS" => 'C',
        "ASP" => 'D',
        "GLU" => 'E',
        "PHE" => 'F',
        "GLY" => 'G',
        "HIS" => 'H',
        "ILE" => 'I',
        "LYS" => 'K',
        "LEU" => 'L',
        "MET" => 'M',
        "ASN" => 'N',
        "PRO" => 'P',
        "GLN" => 'Q',
        "ARG" => 'R',
        "SER" => 'S',
        "THR" => 'T',
        "VAL" => 'V',
        "TRP" => 'W',
        "TYR" => 'Y',
        _ => 'X',
    }
}

/// Kyte-Doolittle hydropathy scale values
fn kyte_doolittle_score(aa: char) -> f64 {
    match aa.to_ascii_uppercase() {
        'I' => 4.5,
        'V' => 4.2,
        'L' => 3.8,
        'F' => 2.8,
        'C' => 2.5,
        'M' => 1.9,
        'A' => 1.8,
        'G' => -0.4,
        'T' => -0.7,
        'S' => -0.8,
        'W' => -0.9,
        'Y' => -1.3,
        'P' => -1.6,
        'H' => -3.2,
        'E' => -3.5,
        'Q' => -3.5,
        'D' => -3.5,
        'N' => -3.5,
        'K' => -3.9,
        'R' => -4.5,
        _ => 0.0,
    }
}

/// Monoisotopic amino acid molecular weights (g/mol)
fn aa_molecular_weight(aa: char) -> f64 {
    match aa.to_ascii_uppercase() {
        'A' => 71.0788,
        'R' => 156.1875,
        'N' => 114.1038,
        'D' => 115.0886,
        'C' => 103.1388,
        'E' => 129.1155,
        'Q' => 128.1307,
        'G' => 57.0519,
        'H' => 137.1411,
        'I' => 113.1594,
        'L' => 113.1594,
        'K' => 128.1741,
        'M' => 131.1926,
        'F' => 147.1766,
        'P' => 97.1167,
        'S' => 87.0782,
        'T' => 101.1051,
        'W' => 186.2132,
        'Y' => 163.1760,
        'V' => 99.1326,
        _ => 110.0,
    }
}

/// Calculates theoretical physicochemical properties for a protein sequence.
pub fn calculate_protein_properties(seq: &str) -> ProteinProperties {
    let clean: String = seq
        .lines()
        .filter(|l| !l.starts_with('>'))
        .flat_map(|l| l.chars())
        .filter(|c| c.is_alphabetic())
        .map(|c| c.to_ascii_uppercase())
        .collect();

    let length = clean.len();
    if length == 0 {
        return ProteinProperties {
            length: 0,
            molecular_weight_kda: 0.0,
            isoelectric_point_pi: 7.0,
            composition: AminoAcidComposition {
                hydrophobic: 0,
                polar: 0,
                acidic: 0,
                basic: 0,
                glycine: 0,
                total: 0,
            },
            hydropathy_profile: Vec::new(),
            predicted_helix_pct: 0.0,
            predicted_sheet_pct: 0.0,
            predicted_coil_pct: 0.0,
        };
    }

    let mut total_mw = 18.015; // Water molecule addition for terminal ends
    let mut hydrophobic = 0;
    let mut polar = 0;
    let mut acidic = 0;
    let mut basic = 0;
    let mut glycine = 0;

    let chars: Vec<char> = clean.chars().collect();
    for &aa in &chars {
        total_mw += aa_molecular_weight(aa);
        match aa {
            'A' | 'V' | 'I' | 'L' | 'M' | 'F' | 'W' | 'P' => hydrophobic += 1,
            'S' | 'T' | 'C' | 'Y' | 'N' | 'Q' => polar += 1,
            'D' | 'E' => acidic += 1,
            'K' | 'R' | 'H' => basic += 1,
            'G' => glycine += 1,
            _ => {}
        }
    }

    let mw_kda = total_mw / 1000.0;

    // Approximate Isoelectric Point (pI)
    let pi = if basic > acidic {
        7.0 + ((basic - acidic) as f64 / length as f64) * 4.0
    } else if acidic > basic {
        7.0 - ((acidic - basic) as f64 / length as f64) * 4.0
    } else {
        6.5
    }
    .clamp(3.0, 12.0);

    // Kyte-Doolittle hydropathy profile with window size 9
    let window_size = 9;
    let mut hydropathy_profile = Vec::new();
    if length >= window_size {
        for i in 0..=(length - window_size) {
            let sum: f64 = chars[i..i + window_size]
                .iter()
                .map(|&c| kyte_doolittle_score(c))
                .sum();
            hydropathy_profile.push(sum / window_size as f64);
        }
    } else {
        hydropathy_profile = chars.iter().map(|&c| kyte_doolittle_score(c)).collect();
    }

    // Secondary structure propensity estimation (Chou-Fasman approximate ratios)
    let helix_favored = hydrophobic + polar / 2;
    let sheet_favored = hydrophobic;
    let total_comp = length as f64;

    let helix_pct = ((helix_favored as f64 / total_comp) * 100.0).clamp(10.0, 60.0);
    let sheet_pct = ((sheet_favored as f64 / total_comp) * 80.0).clamp(10.0, 40.0);
    let coil_pct = (100.0 - helix_pct - sheet_pct).max(10.0);

    ProteinProperties {
        length,
        molecular_weight_kda: mw_kda,
        isoelectric_point_pi: pi,
        composition: AminoAcidComposition {
            hydrophobic,
            polar,
            acidic,
            basic,
            glycine,
            total: length,
        },
        hydropathy_profile,
        predicted_helix_pct: helix_pct,
        predicted_sheet_pct: sheet_pct,
        predicted_coil_pct: coil_pct,
    }
}

/// Parses a PDB file string, extracts ATOM record residues, and returns FASTA format.
pub fn extract_fasta_from_pdb_text(pdb_text: &str) -> String {
    let mut current_chain = ' ';
    let mut last_res_num = -999i32;
    let mut chain_sequences: HashMap<char, String> = HashMap::new();

    for line in pdb_text.lines() {
        if line.starts_with("ATOM") || line.starts_with("HETATM") {
            if line.len() < 54 {
                continue;
            }
            let res_name = line[17..20].trim();
            let chain_id = line.chars().nth(21).unwrap_or('A');
            let res_num_str = line[22..26].trim();

            if let Ok(res_num) = res_num_str.parse::<i32>() {
                if chain_id != current_chain || res_num != last_res_num {
                    let aa1 = aa3_to_aa1(res_name);
                    if aa1 != 'X' {
                        chain_sequences.entry(chain_id).or_default().push(aa1);
                    }
                    current_chain = chain_id;
                    last_res_num = res_num;
                }
            }
        }
    }

    let mut fasta_output = String::new();
    let mut chains: Vec<&char> = chain_sequences.keys().collect();
    chains.sort();

    for &chain in chains {
        if let Some(seq) = chain_sequences.get(&chain) {
            fasta_output.push_str(&format!(">PDB_Chain_{}\n{}\n", chain, seq));
        }
    }

    if fasta_output.is_empty() {
        ">PDB_Unknown\n".to_string()
    } else {
        fasta_output
    }
}
