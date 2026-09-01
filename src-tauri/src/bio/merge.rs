use super::checksum::calculate_file_sha256;
use super::fasta::FastaStreamReader;
use super::fastq::FastqStreamReader;
use super::io::{create_buffered_reader, detect_format_from_reader, SequenceFormat};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeResult {
    pub total_input_files: usize,
    pub format: SequenceFormat,
    pub total_records_merged: u64,
    pub total_bytes_written: u64,
    pub output_filepath: String,
    pub output_sha256: String,
}

pub fn merge_sequence_files<P: AsRef<Path>>(
    input_paths: &[P],
    output_path: P,
    validate_output: bool,
) -> std::io::Result<MergeResult> {
    if input_paths.is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "No input files provided for merging",
        ));
    }

    let output_path_ref = output_path.as_ref();
    let mut detected_format = SequenceFormat::Unknown;

    // 1. Verify format compatibility across all input files
    for path in input_paths {
        let (mut reader, _comp) = create_buffered_reader(path)?;
        let fmt = detect_format_from_reader(&mut reader)?;
        if fmt == SequenceFormat::Unknown {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unrecognized format in file: {}", path.as_ref().display()),
            ));
        }
        if detected_format == SequenceFormat::Unknown {
            detected_format = fmt;
        } else if detected_format != fmt {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!(
                    "Incompatible file formats: cannot merge {:?} with {:?}",
                    detected_format, fmt
                ),
            ));
        }
    }

    // 2. Perform streaming merge
    let out_file = File::create(output_path_ref)?;
    let mut writer = BufWriter::new(out_file);
    let mut total_records_merged = 0u64;

    for path in input_paths {
        let (reader, _comp) = create_buffered_reader(path)?;
        match detected_format {
            SequenceFormat::Fastq => {
                let mut fastq_reader = FastqStreamReader::new(reader);
                while let Ok(Some(record)) = fastq_reader.next_record() {
                    let text = format!(
                        "{}\n{}\n{}\n{}\n",
                        record.header, record.sequence, record.separator, record.quality
                    );
                    writer.write_all(text.as_bytes())?;
                    total_records_merged += 1;
                }
            }
            SequenceFormat::Fasta => {
                let mut fasta_reader = FastaStreamReader::new(reader);
                while let Ok(Some(record)) = fasta_reader.next_record() {
                    let text = format!("{}\n{}\n", record.header, record.sequence);
                    writer.write_all(text.as_bytes())?;
                    total_records_merged += 1;
                }
            }
            SequenceFormat::Unknown => unreachable!(),
        }
    }

    writer.flush()?;

    if validate_output {
        let (_r, _c) = create_buffered_reader(output_path_ref)?;
    }

    let checksum = calculate_file_sha256(output_path_ref)?;

    Ok(MergeResult {
        total_input_files: input_paths.len(),
        format: detected_format,
        total_records_merged,
        total_bytes_written: checksum.file_size_bytes,
        output_filepath: output_path_ref.to_string_lossy().to_string(),
        output_sha256: checksum.sha256_hash,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_merge_fasta_files() {
        let f1 = "../scratch_merge_1.fasta";
        let f2 = "../scratch_merge_2.fasta";
        let out = "../scratch_merged_out.fasta";

        fs::write(f1, ">seq1\nATGC\n").unwrap();
        fs::write(f2, ">seq2\nCGTA\n").unwrap();

        let res = merge_sequence_files(&[f1, f2], out, true).unwrap();
        assert_eq!(res.total_records_merged, 2);
        assert_eq!(res.format, SequenceFormat::Fasta);

        let content = fs::read_to_string(out).unwrap();
        assert!(content.contains(">seq1"));
        assert!(content.contains(">seq2"));

        let _ = fs::remove_file(f1);
        let _ = fs::remove_file(f2);
        let _ = fs::remove_file(out);
    }
}
