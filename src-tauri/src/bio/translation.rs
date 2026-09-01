use super::sequence::reverse_complement_seq;
use super::sequence::CasingOption;
use serde::{Deserialize, Serialize};

/// Standard genetic code lookup table (Codon -> Amino Acid 1-letter code).
pub fn translate_codon(codon: &str) -> char {
    let uppercase = codon.to_uppercase();
    if uppercase.len() != 3 {
        return 'X';
    }

    // Convert any 'T' in DNA codon to 'U' for standard RNA genetic code lookups
    let rna_codon = uppercase.replace('T', "U");

    match rna_codon.as_str() {
        // Phenylalanine (F)
        "UUU" | "UUC" => 'F',
        // Leucine (L)
        "UUA" | "UUG" | "CUU" | "CUC" | "CUA" | "CUG" => 'L',
        // Isoleucine (I)
        "AUU" | "AUC" | "AUA" => 'I',
        // Methionine / Start (M)
        "AUG" => 'M',
        // Valine (V)
        "GUU" | "GUC" | "GUA" | "GUG" => 'V',
        // Serine (S)
        "UCU" | "UCC" | "UCA" | "UCG" | "AGU" | "AGC" => 'S',
        // Proline (P)
        "CCU" | "CCC" | "CCA" | "CCG" => 'P',
        // Threonine (T)
        "ACU" | "ACC" | "ACA" | "ACG" => 'T',
        // Alanine (A)
        "GCU" | "GCC" | "GCA" | "GCG" => 'A',
        // Tyrosine (Y)
        "UAU" | "UAC" => 'Y',
        // Stop Codons (*)
        "UAA" | "UAG" | "UGA" => '*',
        // Histidine (H)
        "CAU" | "CAC" => 'H',
        // Glutamine (Q)
        "CAA" | "CAG" => 'Q',
        // Asparagine (N)
        "AAU" | "AAC" => 'N',
        // Lysine (K)
        "AAA" | "AAG" => 'K',
        // Aspartate (D)
        "GAU" | "GAC" => 'D',
        // Glutamate (E)
        "GAA" | "GAG" => 'E',
        // Cysteine (C)
        "UGU" | "UGC" => 'C',
        // Tryptophan (W)
        "UGG" => 'W',
        // Arginine (R)
        "CGU" | "CGC" | "CGA" | "CGG" | "AGA" | "AGG" => 'R',
        // Glycine (G)
        "GGU" | "GGC" | "GGA" | "GGG" => 'G',

        // Ambiguous codons with unambiguous amino acid translations
        // e.g. GCN -> Alanine, CCN -> Proline, ACN -> Threonine, GCN -> Alanine, CGN -> Arginine, GGN -> Glycine, CTN -> Leucine, GTN -> Valine, TCN -> Serine
        _ => match (rna_codon.as_bytes()[0], rna_codon.as_bytes()[1]) {
            (b'G', b'C') => 'A', // GC* -> Ala
            (b'C', b'C') => 'P', // CC* -> Pro
            (b'A', b'C') => 'T', // AC* -> Thr
            (b'C', b'G') => 'R', // CG* -> Arg
            (b'G', b'G') => 'G', // GG* -> Gly
            (b'C', b'U') => 'L', // CU* -> Leu
            (b'G', b'U') => 'V', // GU* -> Val
            (b'U', b'C') => 'S', // UC* -> Ser
            _ => 'X',
        },
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationFrameResult {
    pub frame_label: String, // "+1", "+2", "+3", "-1", "-2", "-3"
    pub protein_sequence: String,
    pub amino_acid_count: usize,
    pub stop_codon_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResponse {
    pub frames: Vec<TranslationFrameResult>,
}

/// Translates a single sequence in a specific frame (+1, +2, +3, -1, -2, -3).
pub fn translate_frame(
    seq: &str,
    frame: i8, // 1, 2, 3, -1, -2, -3
    stop_at_stop_codon: bool,
) -> TranslationFrameResult {
    let work_seq = if frame < 0 {
        reverse_complement_seq(seq, false, CasingOption::Uppercase)
    } else {
        seq.to_uppercase()
    };

    let offset = (frame.abs() - 1) as usize;
    let chars: Vec<char> = work_seq.chars().collect();
    let mut protein = String::new();
    let mut stop_count = 0;

    let mut i = offset;
    while i + 2 < chars.len() {
        let codon: String = chars[i..i + 3].iter().collect();
        let aa = translate_codon(&codon);

        if aa == '*' {
            stop_count += 1;
            protein.push('*');
            if stop_at_stop_codon {
                break;
            }
        } else {
            protein.push(aa);
        }

        i += 3;
    }

    let frame_label = if frame > 0 {
        format!("+{}", frame)
    } else {
        format!("{}", frame)
    };

    let aa_count = protein.chars().filter(|&c| c != '*').count();

    TranslationFrameResult {
        frame_label,
        protein_sequence: protein,
        amino_acid_count: aa_count,
        stop_codon_count: stop_count,
    }
}

/// Translates a sequence across all requested frames (+1..+3 or all 6 frames).
pub fn translate_sequence(
    seq: &str,
    selected_frame: Option<i8>, // None means all 6 frames
    stop_at_stop_codon: bool,
) -> TranslationResponse {
    let frames_to_run = match selected_frame {
        Some(f) => vec![f],
        None => vec![1, 2, 3, -1, -2, -3],
    };

    let results = frames_to_run
        .into_iter()
        .map(|f| translate_frame(seq, f, stop_at_stop_codon))
        .collect();

    TranslationResponse { frames: results }
}
