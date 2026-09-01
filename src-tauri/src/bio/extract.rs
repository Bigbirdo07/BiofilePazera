use super::fasta::FastaStreamReader;
use super::fastq::FastqStreamReader;
use super::io::{create_buffered_reader, detect_format_from_reader, SequenceFormat};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub total_requested_ids: usize,
    pub found_ids_count: usize,
    pub missing_ids_count: usize,
    pub records_extracted: u64,
    pub output_filepath: String,
    pub missing_ids: Vec<String>,
}

pub fn extract_sequences_by_id<P: AsRef<Path>>(
    input_path: P,
    output_path: P,
    target_ids: Vec<String>,
    exact_match: bool,
) -> std::io::Result<ExtractionResult> {
    let input_path_ref = input_path.as_ref();
    let output_path_ref = output_path.as_ref();

    let clean_ids: Vec<String> = target_ids
        .into_iter()
        .map(|id| {
            id.trim()
                .trim_start_matches('>')
                .trim_start_matches('@')
                .to_string()
        })
        .filter(|id| !id.is_empty())
        .collect();

    let total_requested_ids = clean_ids.len();
    let target_set: HashSet<String> = clean_ids.iter().cloned().collect();
    let mut found_set = HashSet::new();

    let (mut reader, _comp) = create_buffered_reader(input_path_ref)?;
    let format = detect_format_from_reader(&mut reader)?;

    let (reader, _comp) = create_buffered_reader(input_path_ref)?;
    let file = File::create(output_path_ref)?;
    let mut writer = BufWriter::new(file);
    let mut records_extracted = 0u64;

    let matches_id = |header: &str| -> Option<String> {
        let clean_header = header.trim_start_matches('>').trim_start_matches('@');
        let header_first_token = clean_header
            .split_whitespace()
            .next()
            .unwrap_or(clean_header);

        if exact_match {
            if target_set.contains(clean_header) {
                return Some(clean_header.to_string());
            }
            if target_set.contains(header_first_token) {
                return Some(header_first_token.to_string());
            }
        } else {
            for target in &clean_ids {
                if clean_header.contains(target) {
                    return Some(target.to_string());
                }
            }
        }
        None
    };

    match format {
        SequenceFormat::Fastq => {
            let mut fastq_reader = FastqStreamReader::new(reader);
            while let Ok(Some(record)) = fastq_reader.next_record() {
                if let Some(matched_id) = matches_id(&record.header) {
                    found_set.insert(matched_id);
                    let record_text = format!(
                        "{}\n{}\n{}\n{}\n",
                        record.header, record.sequence, record.separator, record.quality
                    );
                    writer.write_all(record_text.as_bytes())?;
                    records_extracted += 1;
                }
            }
        }
        SequenceFormat::Fasta => {
            let mut fasta_reader = FastaStreamReader::new(reader);
            while let Ok(Some(record)) = fasta_reader.next_record() {
                if let Some(matched_id) = matches_id(&record.header) {
                    found_set.insert(matched_id);
                    let record_text = format!("{}\n{}\n", record.header, record.sequence);
                    writer.write_all(record_text.as_bytes())?;
                    records_extracted += 1;
                }
            }
        }
        SequenceFormat::Unknown => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Unknown sequence format",
            ));
        }
    }

    writer.flush()?;

    let missing_ids: Vec<String> = clean_ids
        .into_iter()
        .filter(|id| !found_set.contains(id))
        .collect();

    let found_ids_count = found_set.len();
    let missing_ids_count = missing_ids.len();

    Ok(ExtractionResult {
        total_requested_ids,
        found_ids_count,
        missing_ids_count,
        records_extracted,
        output_filepath: output_path_ref.to_string_lossy().to_string(),
        missing_ids,
    })
}
