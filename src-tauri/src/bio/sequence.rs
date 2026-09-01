use super::iupac::{complement_dna_char, complement_rna_char};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CasingOption {
    Uppercase,
    Lowercase,
    Preserve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastaRecord {
    pub header: String,
    pub sequence: String,
}

/// Parses multi-record FASTA string or plain sequence into FastaRecord structs.
pub fn parse_sequence_input(input: &str) -> Vec<FastaRecord> {
    let mut records = Vec::new();
    let mut current_header: Option<String> = None;
    let mut current_seq = String::new();

    for line in input.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with('>') {
            if let Some(header) = current_header.take() {
                records.push(FastaRecord {
                    header,
                    sequence: current_seq,
                });
                current_seq = String::new();
            }
            current_header = Some(trimmed.to_string());
        } else if current_header.is_some() {
            current_seq.push_str(trimmed);
        } else {
            // Plain sequence without header
            current_seq.push_str(trimmed);
        }
    }

    if let Some(header) = current_header {
        records.push(FastaRecord {
            header,
            sequence: current_seq,
        });
    } else if !current_seq.is_empty() {
        records.push(FastaRecord {
            header: String::new(),
            sequence: current_seq,
        });
    }

    records
}

/// Applies requested casing option to a sequence string.
pub fn apply_casing(seq: &str, casing: CasingOption) -> String {
    match casing {
        CasingOption::Uppercase => seq.to_uppercase(),
        CasingOption::Lowercase => seq.to_lowercase(),
        CasingOption::Preserve => seq.to_string(),
    }
}

/// Reverses a nucleotide sequence string.
pub fn reverse_seq(seq: &str, casing: CasingOption) -> String {
    let reversed: String = seq.chars().rev().collect();
    apply_casing(&reversed, casing)
}

/// Complements a nucleotide sequence string (DNA or RNA).
pub fn complement_seq(seq: &str, is_rna: bool, casing: CasingOption) -> String {
    let comp: String = seq
        .chars()
        .map(|c| {
            if is_rna {
                complement_rna_char(c)
            } else {
                complement_dna_char(c)
            }
        })
        .collect();
    apply_casing(&comp, casing)
}

/// Reverse-complements a nucleotide sequence string (DNA or RNA).
pub fn reverse_complement_seq(seq: &str, is_rna: bool, casing: CasingOption) -> String {
    let rev_comp: String = seq
        .chars()
        .rev()
        .map(|c| {
            if is_rna {
                complement_rna_char(c)
            } else {
                complement_dna_char(c)
            }
        })
        .collect();
    apply_casing(&rev_comp, casing)
}

/// Transcribes DNA to RNA (T/t -> U/u).
pub fn dna_to_rna(seq: &str, casing: CasingOption) -> String {
    let rna: String = seq
        .chars()
        .map(|c| match c {
            'T' => 'U',
            't' => 'u',
            other => other,
        })
        .collect();
    apply_casing(&rna, casing)
}

/// Reverse transcribes RNA to DNA (U/u -> T/t).
pub fn rna_to_dna(seq: &str, casing: CasingOption) -> String {
    let dna: String = seq
        .chars()
        .map(|c| match c {
            'U' => 'T',
            'u' => 't',
            other => other,
        })
        .collect();
    apply_casing(&dna, casing)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformResponse {
    pub output_text: String,
    pub records_transformed: usize,
}

/// High-level function to transform text (multi-FASTA or plain sequence) with header options.
pub fn transform_sequence_workspace(
    input: &str,
    operation: &str,
    is_rna: bool,
    casing: CasingOption,
    append_header_suffix: bool,
) -> TransformResponse {
    let records = parse_sequence_input(input);
    if records.is_empty() {
        return TransformResponse {
            output_text: String::new(),
            records_transformed: 0,
        };
    }

    let is_fasta = records.iter().any(|r| !r.header.is_empty());
    let mut output_parts = Vec::new();

    for r in &records {
        let transformed = match operation {
            "reverse" => reverse_seq(&r.sequence, casing),
            "complement" => complement_seq(&r.sequence, is_rna, casing),
            "reverse_complement" => reverse_complement_seq(&r.sequence, is_rna, casing),
            "dna_to_rna" => dna_to_rna(&r.sequence, casing),
            "rna_to_dna" => rna_to_dna(&r.sequence, casing),
            _ => apply_casing(&r.sequence, casing),
        };

        if is_fasta {
            let mut header = r.header.clone();
            if append_header_suffix {
                let suffix = match operation {
                    "reverse" => "_reversed",
                    "complement" => "_complemented",
                    "reverse_complement" => "_reverse_complement",
                    "dna_to_rna" => "_rna",
                    "rna_to_dna" => "_dna",
                    _ => "",
                };
                header.push_str(suffix);
            }
            output_parts.push(format!("{}\n{}", header, transformed));
        } else {
            output_parts.push(transformed);
        }
    }

    TransformResponse {
        output_text: output_parts.join("\n"),
        records_transformed: records.len(),
    }
}
