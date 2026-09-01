use super::sequence::parse_sequence_input;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceStats {
    pub header: String,
    pub length: usize,
    pub count_a: usize,
    pub count_c: usize,
    pub count_g: usize,
    pub count_t: usize,
    pub count_u: usize,
    pub count_n: usize,
    pub count_ambiguous: usize,
    pub canonical_base_count: usize, // A + C + G + T + U
    pub gc_count: usize,
    pub gc_percent: f64,
    pub at_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverallStatsSummary {
    pub total_records: usize,
    pub total_length: usize,
    pub shortest_length: usize,
    pub longest_length: usize,
    pub average_length: f64,
    pub total_a: usize,
    pub total_c: usize,
    pub total_g: usize,
    pub total_t: usize,
    pub total_u: usize,
    pub total_n: usize,
    pub total_ambiguous: usize,
    pub total_canonical_bases: usize,
    pub total_gc_count: usize,
    pub overall_gc_percent: f64,
    pub per_record_stats: Vec<SequenceStats>,
}

/// Calculates sequence statistics for a single string sequence.
pub fn calculate_single_sequence_stats(seq: &str, header: String) -> SequenceStats {
    let mut count_a = 0;
    let mut count_c = 0;
    let mut count_g = 0;
    let mut count_t = 0;
    let mut count_u = 0;
    let mut count_n = 0;
    let mut count_ambiguous = 0;
    let mut length = 0;

    for c in seq.chars() {
        if c.is_whitespace() {
            continue;
        }
        length += 1;
        match c.to_ascii_uppercase() {
            'A' => count_a += 1,
            'C' => count_c += 1,
            'G' => count_g += 1,
            'T' => count_t += 1,
            'U' => count_u += 1,
            'N' => count_n += 1,
            'R' | 'Y' | 'S' | 'W' | 'K' | 'M' | 'B' | 'D' | 'H' | 'V' => count_ambiguous += 1,
            _ => count_ambiguous += 1,
        }
    }

    let canonical_bases = count_a + count_c + count_g + count_t + count_u;
    let gc_count = count_g + count_c;

    let gc_percent = if canonical_bases > 0 {
        (gc_count as f64 / canonical_bases as f64) * 100.0
    } else {
        0.0
    };

    let at_count = count_a + count_t + count_u;
    let at_percent = if canonical_bases > 0 {
        (at_count as f64 / canonical_bases as f64) * 100.0
    } else {
        0.0
    };

    SequenceStats {
        header,
        length,
        count_a,
        count_c,
        count_g,
        count_t,
        count_u,
        count_n,
        count_ambiguous,
        canonical_base_count: canonical_bases,
        gc_count,
        gc_percent,
        at_percent,
    }
}

/// Calculates comprehensive sequence statistics across multi-record FASTA or plain sequence input.
pub fn calculate_sequence_stats_workspace(input: &str) -> OverallStatsSummary {
    let records = parse_sequence_input(input);
    if records.is_empty() {
        return OverallStatsSummary {
            total_records: 0,
            total_length: 0,
            shortest_length: 0,
            longest_length: 0,
            average_length: 0.0,
            total_a: 0,
            total_c: 0,
            total_g: 0,
            total_t: 0,
            total_u: 0,
            total_n: 0,
            total_ambiguous: 0,
            total_canonical_bases: 0,
            total_gc_count: 0,
            overall_gc_percent: 0.0,
            per_record_stats: Vec::new(),
        };
    }

    let mut per_record_stats = Vec::new();
    let mut total_length = 0;
    let mut shortest = usize::MAX;
    let mut longest = 0;
    let mut total_a = 0;
    let mut total_c = 0;
    let mut total_g = 0;
    let mut total_t = 0;
    let mut total_u = 0;
    let mut total_n = 0;
    let mut total_ambiguous = 0;
    let mut total_canonical_bases = 0;
    let mut total_gc_count = 0;

    for r in &records {
        let stats = calculate_single_sequence_stats(&r.sequence, r.header.clone());
        total_length += stats.length;
        if stats.length < shortest {
            shortest = stats.length;
        }
        if stats.length > longest {
            longest = stats.length;
        }

        total_a += stats.count_a;
        total_c += stats.count_c;
        total_g += stats.count_g;
        total_t += stats.count_t;
        total_u += stats.count_u;
        total_n += stats.count_n;
        total_ambiguous += stats.count_ambiguous;
        total_canonical_bases += stats.canonical_base_count;
        total_gc_count += stats.gc_count;

        per_record_stats.push(stats);
    }

    if shortest == usize::MAX {
        shortest = 0;
    }

    let total_records = records.len();
    let average_length = if total_records > 0 {
        total_length as f64 / total_records as f64
    } else {
        0.0
    };

    let overall_gc_percent = if total_canonical_bases > 0 {
        (total_gc_count as f64 / total_canonical_bases as f64) * 100.0
    } else {
        0.0
    };

    OverallStatsSummary {
        total_records,
        total_length,
        shortest_length: shortest,
        longest_length: longest,
        average_length,
        total_a,
        total_c,
        total_g,
        total_t,
        total_u,
        total_n,
        total_ambiguous,
        total_canonical_bases,
        total_gc_count,
        overall_gc_percent,
        per_record_stats,
    }
}
