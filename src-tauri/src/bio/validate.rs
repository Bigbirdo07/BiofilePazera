use super::fasta::FastaStreamReader;
use super::fastq::FastqStreamReader;
use super::io::{create_buffered_reader, detect_format_from_reader, SequenceFormat};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationErrorItem {
    pub record_number: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub file_name: String,
    pub format: SequenceFormat,
    pub is_valid: bool,
    pub total_records: u64,
    pub valid_records: u64,
    pub invalid_records: u64,
    pub warnings_count: u64,
    pub total_bases: u64,
    pub min_read_length: u64,
    pub max_read_length: u64,
    pub avg_read_length: f64,
    pub errors: Vec<ValidationErrorItem>,
    pub errors_capped: bool,
}

/// Runs streaming validation over a FASTA or FASTQ file.
pub fn validate_file<P: AsRef<Path>>(path: P) -> std::io::Result<ValidationReport> {
    let file_name = path
        .as_ref()
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let (mut reader, _comp) = create_buffered_reader(&path)?;
    let format = detect_format_from_reader(&mut reader)?;

    // Re-open reader for full scan
    let (reader, _comp) = create_buffered_reader(&path)?;

    let mut total_records = 0u64;
    let mut valid_records = 0u64;
    let mut invalid_records = 0u64;
    let warnings_count = 0u64;
    let mut total_bases = 0u64;
    let mut min_read_length = u64::MAX;
    let mut max_read_length = 0u64;
    let mut errors = Vec::new();
    let mut errors_capped = false;

    match format {
        SequenceFormat::Fastq => {
            let mut fastq_reader = FastqStreamReader::new(reader);
            loop {
                match fastq_reader.next_record() {
                    Ok(Some(record)) => {
                        total_records += 1;
                        valid_records += 1;
                        let len = record.sequence.len() as u64;
                        total_bases += len;
                        if len < min_read_length {
                            min_read_length = len;
                        }
                        if len > max_read_length {
                            max_read_length = len;
                        }
                    }
                    Ok(None) => break,
                    Err(err) => {
                        total_records += 1;
                        invalid_records += 1;
                        if errors.len() < 1000 {
                            errors.push(ValidationErrorItem {
                                record_number: err.record_number,
                                message: err.message,
                            });
                        } else {
                            errors_capped = true;
                        }
                    }
                }
            }
        }
        SequenceFormat::Fasta => {
            let mut fasta_reader = FastaStreamReader::new(reader);
            while let Ok(Some(record)) = fasta_reader.next_record() {
                total_records += 1;
                let len = record.sequence.len() as u64;
                if len == 0 {
                    invalid_records += 1;
                    if errors.len() < 1000 {
                        errors.push(ValidationErrorItem {
                            record_number: record.record_number,
                            message: format!("Record '{}' has an empty sequence", record.header),
                        });
                    }
                } else {
                    valid_records += 1;
                    total_bases += len;
                    if len < min_read_length {
                        min_read_length = len;
                    }
                    if len > max_read_length {
                        max_read_length = len;
                    }
                }
            }
        }
        SequenceFormat::Unknown => {
            return Ok(ValidationReport {
                file_name,
                format: SequenceFormat::Unknown,
                is_valid: false,
                total_records: 0,
                valid_records: 0,
                invalid_records: 1,
                warnings_count: 0,
                total_bases: 0,
                min_read_length: 0,
                max_read_length: 0,
                avg_read_length: 0.0,
                errors: vec![ValidationErrorItem {
                    record_number: 0,
                    message: "Unknown or unsupported sequence file format".to_string(),
                }],
                errors_capped: false,
            });
        }
    }

    if min_read_length == u64::MAX {
        min_read_length = 0;
    }

    let avg_read_length = if valid_records > 0 {
        total_bases as f64 / valid_records as f64
    } else {
        0.0
    };

    let is_valid = invalid_records == 0 && total_records > 0;

    Ok(ValidationReport {
        file_name,
        format,
        is_valid,
        total_records,
        valid_records,
        invalid_records,
        warnings_count,
        total_bases,
        min_read_length,
        max_read_length,
        avg_read_length,
        errors,
        errors_capped,
    })
}
