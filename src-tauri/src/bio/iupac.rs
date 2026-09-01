//! IUPAC nucleotide and amino acid lookup rules.

/// Returns the complement of a DNA nucleotide character (case-preserving).
pub fn complement_dna_char(c: char) -> char {
    match c {
        'A' => 'T',
        'T' => 'A',
        'C' => 'G',
        'G' => 'C',
        'R' => 'Y',
        'Y' => 'R',
        'S' => 'S',
        'W' => 'W',
        'K' => 'M',
        'M' => 'K',
        'B' => 'V',
        'V' => 'B',
        'D' => 'H',
        'H' => 'D',
        'N' => 'N',

        'a' => 't',
        't' => 'a',
        'c' => 'g',
        'g' => 'c',
        'r' => 'y',
        'y' => 'r',
        's' => 's',
        'w' => 'w',
        'k' => 'm',
        'm' => 'k',
        'b' => 'v',
        'v' => 'b',
        'd' => 'h',
        'h' => 'd',
        'n' => 'n',

        other => other,
    }
}

/// Returns the complement of an RNA nucleotide character (case-preserving).
pub fn complement_rna_char(c: char) -> char {
    match c {
        'A' => 'U',
        'U' => 'A',
        'C' => 'G',
        'G' => 'C',
        'R' => 'Y',
        'Y' => 'R',
        'S' => 'S',
        'W' => 'W',
        'K' => 'M',
        'M' => 'K',
        'B' => 'V',
        'V' => 'B',
        'D' => 'H',
        'H' => 'D',
        'N' => 'N',

        'a' => 'u',
        'u' => 'a',
        'c' => 'g',
        'g' => 'c',
        'r' => 'y',
        'y' => 'r',
        's' => 's',
        'w' => 'w',
        'k' => 'm',
        'm' => 'k',
        'b' => 'v',
        'v' => 'b',
        'd' => 'h',
        'h' => 'd',
        'n' => 'n',

        other => complement_dna_char(other),
    }
}

#[derive(Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SequenceType {
    DNA,
    RNA,
    Protein,
    Unknown,
}

/// Detects whether a sequence string is likely DNA, RNA, Protein, or Unknown.
pub fn detect_sequence_type(seq: &str) -> SequenceType {
    let clean: String = seq
        .lines()
        .filter(|line| !line.starts_with('>'))
        .flat_map(|line| line.chars())
        .filter(|c| !c.is_whitespace())
        .collect();

    if clean.is_empty() {
        return SequenceType::Unknown;
    }

    let uppercase = clean.to_uppercase();
    let mut has_u = false;
    let mut has_t = false;
    let mut non_dna_rna_count = 0;
    let total_len = uppercase.chars().count();

    for c in uppercase.chars() {
        match c {
            'U' => has_u = true,
            'T' => has_t = true,
            'A' | 'C' | 'G' | 'N' => {}
            'R' | 'Y' | 'S' | 'W' | 'K' | 'M' | 'B' | 'D' | 'H' | 'V' => {}
            _ => non_dna_rna_count += 1,
        }
    }

    if non_dna_rna_count > total_len / 10 {
        // High proportion of non-nucleotide characters suggests Protein
        return SequenceType::Protein;
    }

    if has_u && !has_t {
        SequenceType::RNA
    } else if !has_u {
        SequenceType::DNA // Default to DNA if no U is present
    } else {
        SequenceType::Unknown // Has both T and U, ambiguous
    }
}

/// Checks if a sequence character matches an IUPAC pattern character (with wildcards).
pub fn iupac_char_matches(seq_char: char, pat_char: char) -> bool {
    let s = seq_char.to_ascii_uppercase();
    let p = pat_char.to_ascii_uppercase();
    if p == 'N' || s == 'N' || p == s {
        return true;
    }
    match p {
        'R' => s == 'A' || s == 'G',
        'Y' => s == 'C' || s == 'T' || s == 'U',
        'S' => s == 'G' || s == 'C',
        'W' => s == 'A' || s == 'T' || s == 'U',
        'K' => s == 'G' || s == 'T' || s == 'U',
        'M' => s == 'A' || s == 'C',
        'B' => s == 'C' || s == 'G' || s == 'T' || s == 'U',
        'D' => s == 'A' || s == 'G' || s == 'T' || s == 'U',
        'H' => s == 'A' || s == 'C' || s == 'T' || s == 'U',
        'V' => s == 'A' || s == 'C' || s == 'G',
        _ => false,
    }
}
