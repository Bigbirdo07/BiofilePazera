use super::fastq::FastqStreamReader;
use super::io::create_buffered_reader;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastQcReport {
    pub file_name: String,
    pub total_reads: u64,
    pub total_bases: u64,
    pub q20_bases_pct: f64, // % bases with Phred >= 20 (99% accuracy)
    pub q30_bases_pct: f64, // % bases with Phred >= 30 (99.9% accuracy)
    pub mean_phred_score: f64,
    pub per_base_quality_scores: Vec<f64>, // Average quality at position 1..N
    pub per_base_n_content_pct: Vec<f64>,  // % N at position 1..N
    pub gc_content_pct: f64,
    pub overall_status: String, // "PASS", "WARN", "FAIL"
}

pub fn generate_fastq_qc_report<P: AsRef<Path>>(filepath: P) -> std::io::Result<FastQcReport> {
    let path_ref = filepath.as_ref();
    let (reader, _comp) = create_buffered_reader(path_ref)?;
    let mut fastq_reader = FastqStreamReader::new(reader);

    let mut total_reads = 0u64;
    let mut total_bases = 0u64;
    let mut q20_bases = 0u64;
    let mut q30_bases = 0u64;
    let mut gc_count = 0u64;
    let mut phred_sum = 0u64;

    const MAX_POS: usize = 300;
    let mut pos_phred_sum = vec![0u64; MAX_POS];
    let mut pos_n_count = vec![0u64; MAX_POS];
    let mut pos_read_count = vec![0u64; MAX_POS];

    while let Ok(Some(record)) = fastq_reader.next_record() {
        total_reads += 1;
        let seq_bytes = record.sequence.as_bytes();
        let qual_bytes = record.quality.as_bytes();

        let len = seq_bytes.len().min(qual_bytes.len());
        for i in 0..len {
            let base = seq_bytes[i].to_ascii_uppercase();
            let phred = qual_bytes[i].saturating_sub(33);

            total_bases += 1;
            phred_sum += phred as u64;

            if phred >= 20 {
                q20_bases += 1;
            }
            if phred >= 30 {
                q30_bases += 1;
            }
            if base == b'G' || base == b'C' {
                gc_count += 1;
            }

            if i < MAX_POS {
                pos_phred_sum[i] += phred as u64;
                if base == b'N' {
                    pos_n_count[i] += 1;
                }
                pos_read_count[i] += 1;
            }
        }
    }

    if total_bases == 0 {
        return Ok(FastQcReport {
            file_name: path_ref
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            total_reads: 0,
            total_bases: 0,
            q20_bases_pct: 0.0,
            q30_bases_pct: 0.0,
            mean_phred_score: 0.0,
            per_base_quality_scores: Vec::new(),
            per_base_n_content_pct: Vec::new(),
            gc_content_pct: 0.0,
            overall_status: "FAIL".to_string(),
        });
    }

    let q20_pct = (q20_bases as f64 / total_bases as f64) * 100.0;
    let q30_pct = (q30_bases as f64 / total_bases as f64) * 100.0;
    let mean_phred = phred_sum as f64 / total_bases as f64;
    let gc_pct = (gc_count as f64 / total_bases as f64) * 100.0;

    let max_len = pos_read_count
        .iter()
        .position(|&c| c == 0)
        .unwrap_or(MAX_POS);

    let per_base_qual: Vec<f64> = (0..max_len)
        .map(|i| {
            if pos_read_count[i] > 0 {
                pos_phred_sum[i] as f64 / pos_read_count[i] as f64
            } else {
                0.0
            }
        })
        .collect();

    let per_base_n: Vec<f64> = (0..max_len)
        .map(|i| {
            if pos_read_count[i] > 0 {
                (pos_n_count[i] as f64 / pos_read_count[i] as f64) * 100.0
            } else {
                0.0
            }
        })
        .collect();

    let status = if q30_pct >= 80.0 {
        "PASS".to_string()
    } else if q30_pct >= 60.0 {
        "WARN".to_string()
    } else {
        "FAIL".to_string()
    };

    Ok(FastQcReport {
        file_name: path_ref
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        total_reads,
        total_bases,
        q20_bases_pct: q20_pct,
        q30_bases_pct: q30_pct,
        mean_phred_score: mean_phred,
        per_base_quality_scores: per_base_qual,
        per_base_n_content_pct: per_base_n,
        gc_content_pct: gc_pct,
        overall_status: status,
    })
}
