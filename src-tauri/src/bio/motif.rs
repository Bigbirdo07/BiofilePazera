use super::iupac::iupac_char_matches;
use super::sequence::{reverse_complement_seq, CasingOption};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestrictionEnzyme {
    pub name: &'static str,
    pub pattern: &'static str,
    pub cut_offset: usize, // Offset from 5' end where cut occurs
}

pub const COMMON_ENZYMES: &[RestrictionEnzyme] = &[
    RestrictionEnzyme {
        name: "EcoRI",
        pattern: "GAATTC",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "BamHI",
        pattern: "GGATCC",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "HindIII",
        pattern: "AAGCTT",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "NotI",
        pattern: "GCGGCCGC",
        cut_offset: 2,
    },
    RestrictionEnzyme {
        name: "XhoI",
        pattern: "CTCGAG",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "TaqI",
        pattern: "TCGA",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "BglII",
        pattern: "AGATCT",
        cut_offset: 1,
    },
    RestrictionEnzyme {
        name: "PstI",
        pattern: "CTGCAG",
        cut_offset: 5,
    },
    RestrictionEnzyme {
        name: "SmaI",
        pattern: "CCCGGG",
        cut_offset: 3,
    },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrisprPam {
    pub name: &'static str,
    pub pam_pattern: &'static str,
    pub nuclease: &'static str,
}

pub const COMMON_PAMS: &[CrisprPam] = &[
    CrisprPam {
        name: "SpCas9 (NGG)",
        pam_pattern: "NGG",
        nuclease: "Cas9",
    },
    CrisprPam {
        name: "SaCas9 (NNGRRT)",
        pam_pattern: "NNGRRT",
        nuclease: "Cas9",
    },
    CrisprPam {
        name: "Cas12a / Cpf1 (TTTV)",
        pam_pattern: "TTTV",
        nuclease: "Cas12a",
    },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotifMatch {
    pub motif_name: String,
    pub pattern: String,
    pub start_pos: usize,
    pub end_pos: usize,
    pub strand: char, // '+' or '-'
    pub matched_sequence: String,
    pub cut_site_pos: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotifSearchReport {
    pub query_length: usize,
    pub total_matches: usize,
    pub matches: Vec<MotifMatch>,
}

/// Matches an IUPAC pattern against a target sequence starting at index `start_idx`.
fn match_iupac_at(seq: &[char], pattern: &str, start_idx: usize) -> bool {
    let pat_chars: Vec<char> = pattern.chars().collect();
    if start_idx + pat_chars.len() > seq.len() {
        return false;
    }
    for (i, &p_char) in pat_chars.iter().enumerate() {
        let s_char = seq[start_idx + i];
        if !iupac_char_matches(s_char, p_char) {
            return false;
        }
    }
    true
}

/// Scans sequence for restriction enzymes, CRISPR PAMs, or custom IUPAC patterns.
pub fn scan_sequence_for_motifs(
    sequence: &str,
    target_enzymes: Vec<String>,
    custom_pattern: Option<String>,
) -> MotifSearchReport {
    let clean: String = sequence
        .lines()
        .filter(|l| !l.starts_with('>'))
        .flat_map(|l| l.chars())
        .filter(|c| c.is_alphabetic())
        .map(|c| c.to_ascii_uppercase())
        .collect();

    let seq_chars: Vec<char> = clean.chars().collect();
    let rev_clean = reverse_complement_seq(&clean, false, CasingOption::Uppercase);
    let rev_chars: Vec<char> = rev_clean.chars().collect();
    let seq_len = seq_chars.len();

    let mut matches = Vec::new();

    // 1. Scan Restriction Enzymes
    for ez in COMMON_ENZYMES {
        if target_enzymes.contains(&ez.name.to_string()) || target_enzymes.is_empty() {
            let pat_len = ez.pattern.len();
            // Forward strand
            if seq_len >= pat_len {
                for i in 0..=(seq_len - pat_len) {
                    if match_iupac_at(&seq_chars, ez.pattern, i) {
                        let matched_str: String = seq_chars[i..i + pat_len].iter().collect();
                        matches.push(MotifMatch {
                            motif_name: ez.name.to_string(),
                            pattern: ez.pattern.to_string(),
                            start_pos: i + 1,
                            end_pos: i + pat_len,
                            strand: '+',
                            matched_sequence: matched_str,
                            cut_site_pos: Some(i + ez.cut_offset + 1),
                        });
                    }
                }
            }

            // Reverse strand
            if seq_len >= pat_len {
                for i in 0..=(seq_len - pat_len) {
                    if match_iupac_at(&rev_chars, ez.pattern, i) {
                        let matched_str: String = rev_chars[i..i + pat_len].iter().collect();
                        let orig_start = seq_len - (i + pat_len) + 1;
                        let orig_end = seq_len - i;
                        matches.push(MotifMatch {
                            motif_name: format!("{} (Rev)", ez.name),
                            pattern: ez.pattern.to_string(),
                            start_pos: orig_start,
                            end_pos: orig_end,
                            strand: '-',
                            matched_sequence: matched_str,
                            cut_site_pos: Some(orig_end - ez.cut_offset),
                        });
                    }
                }
            }
        }
    }

    // 2. Custom Pattern Search
    if let Some(ref pat) = custom_pattern {
        let clean_pat = pat.trim().to_uppercase();
        let pat_len = clean_pat.len();
        if pat_len > 0 && seq_len >= pat_len {
            for i in 0..=(seq_len - pat_len) {
                if match_iupac_at(&seq_chars, &clean_pat, i) {
                    let matched_str: String = seq_chars[i..i + pat_len].iter().collect();
                    matches.push(MotifMatch {
                        motif_name: "Custom Motif".to_string(),
                        pattern: clean_pat.clone(),
                        start_pos: i + 1,
                        end_pos: i + pat_len,
                        strand: '+',
                        matched_sequence: matched_str,
                        cut_site_pos: None,
                    });
                }
            }
        }
    }

    let total_matches = matches.len();

    MotifSearchReport {
        query_length: seq_len,
        total_matches,
        matches,
    }
}
