use super::checksum::calculate_file_sha256;
use super::fasta::FastaStreamReader;
use super::fastq::FastqStreamReader;
use super::io::{
    create_buffered_reader, detect_format_from_reader, FileCompression, SequenceFormat,
};
use flate2::write::GzEncoder;
use flate2::Compression;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SplitMode {
    MaxSizeMb(f64),
    MaxRecords(u64),
    NumParts(u64),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitPartManifestItem {
    pub part: usize,
    pub filename: String,
    pub filepath: String,
    pub size_bytes: u64,
    pub records_count: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitManifest {
    pub tool: String,
    pub version: String,
    pub timestamp: String,
    pub original_filename: String,
    pub original_size_bytes: u64,
    pub original_sha256: String,
    pub format: SequenceFormat,
    pub compression: FileCompression,
    pub split_mode: SplitMode,
    pub parts: Vec<SplitPartManifestItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitResult {
    pub manifest: SplitManifest,
    pub manifest_filepath: String,
    pub warnings: Vec<String>,
}

pub fn split_sequence_file<P: AsRef<Path>>(
    input_path: P,
    output_dir: P,
    mode: SplitMode,
    preserve_compression: bool,
) -> std::io::Result<SplitResult> {
    let input_path_ref = input_path.as_ref();
    let output_dir_ref = output_dir.as_ref();
    fs::create_dir_all(output_dir_ref)?;

    // Calculate original file checksum
    let orig_checksum = calculate_file_sha256(input_path_ref)?;
    let (mut reader, comp) = create_buffered_reader(input_path_ref)?;
    let format = detect_format_from_reader(&mut reader)?;

    let is_gzip_output = match comp {
        FileCompression::Gzip => preserve_compression,
        FileCompression::Plain => false,
    };

    let base_name = input_path_ref
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "sample".to_string());
    let clean_base = base_name
        .trim_end_matches(".fastq")
        .trim_end_matches(".fasta");

    let ext = match format {
        SequenceFormat::Fastq => {
            if is_gzip_output {
                "fastq.gz"
            } else {
                "fastq"
            }
        }
        SequenceFormat::Fasta => {
            if is_gzip_output {
                "fasta.gz"
            } else {
                "fasta"
            }
        }
        SequenceFormat::Unknown => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Unknown format",
            ))
        }
    };

    let target_bytes_per_part = match mode {
        SplitMode::MaxSizeMb(mb) => (mb * 1024.0 * 1024.0) as u64,
        SplitMode::MaxRecords(_) => u64::MAX,
        SplitMode::NumParts(parts) => {
            if parts > 0 {
                orig_checksum.file_size_bytes / parts
            } else {
                u64::MAX
            }
        }
    };

    let target_records_per_part = match mode {
        SplitMode::MaxRecords(rec) => rec,
        _ => u64::MAX,
    };

    let (reader, _comp) = create_buffered_reader(input_path_ref)?;

    let mut part_index = 1usize;
    let mut current_part_records = 0u64;
    let mut current_part_bytes = 0u64;
    let mut warnings = Vec::new();
    let mut part_manifests = Vec::new();

    let create_part_writer =
        |part_idx: usize| -> std::io::Result<(Box<dyn Write>, PathBuf, String)> {
            let filename = format!("{}_part_{:04}.{}", clean_base, part_idx, ext);
            let filepath = output_dir_ref.join(&filename);
            let file = File::create(&filepath)?;
            let writer: Box<dyn Write> = if is_gzip_output {
                Box::new(BufWriter::new(GzEncoder::new(file, Compression::default())))
            } else {
                Box::new(BufWriter::new(file))
            };
            Ok((writer, filepath, filename))
        };

    let (mut current_writer, mut current_filepath, mut current_filename) =
        create_part_writer(part_index)?;

    if format == SequenceFormat::Fastq {
        let mut fastq_reader = FastqStreamReader::new(reader);
        while let Ok(Some(record)) = fastq_reader.next_record() {
            let record_text = format!(
                "{}\n{}\n{}\n{}\n",
                record.header, record.sequence, record.separator, record.quality
            );
            let rec_bytes = record_text.len() as u64;

            if rec_bytes > target_bytes_per_part {
                warnings.push(format!(
                    "Record #{} ({} bp) exceeded requested maximum size and was preserved intact.",
                    record.record_number,
                    record.sequence.len()
                ));
            }

            if (current_part_bytes + rec_bytes > target_bytes_per_part
                || current_part_records >= target_records_per_part)
                && current_part_records > 0
            {
                // Finalize current part
                current_writer.flush()?;
                drop(current_writer);

                let part_sha = calculate_file_sha256(&current_filepath)?;
                part_manifests.push(SplitPartManifestItem {
                    part: part_index,
                    filename: current_filename,
                    filepath: current_filepath.to_string_lossy().to_string(),
                    size_bytes: part_sha.file_size_bytes,
                    records_count: current_part_records,
                    sha256: part_sha.sha256_hash,
                });

                part_index += 1;
                current_part_records = 0;
                current_part_bytes = 0;

                let (w, p, f) = create_part_writer(part_index)?;
                current_writer = w;
                current_filepath = p;
                current_filename = f;
            }

            current_writer.write_all(record_text.as_bytes())?;
            current_part_records += 1;
            current_part_bytes += rec_bytes;
        }
    } else if format == SequenceFormat::Fasta {
        let mut fasta_reader = FastaStreamReader::new(reader);
        while let Ok(Some(record)) = fasta_reader.next_record() {
            let record_text = format!("{}\n{}\n", record.header, record.sequence);
            let rec_bytes = record_text.len() as u64;

            if (current_part_bytes + rec_bytes > target_bytes_per_part
                || current_part_records >= target_records_per_part)
                && current_part_records > 0
            {
                current_writer.flush()?;
                drop(current_writer);

                let part_sha = calculate_file_sha256(&current_filepath)?;
                part_manifests.push(SplitPartManifestItem {
                    part: part_index,
                    filename: current_filename,
                    filepath: current_filepath.to_string_lossy().to_string(),
                    size_bytes: part_sha.file_size_bytes,
                    records_count: current_part_records,
                    sha256: part_sha.sha256_hash,
                });

                part_index += 1;
                current_part_records = 0;
                current_part_bytes = 0;

                let (w, p, f) = create_part_writer(part_index)?;
                current_writer = w;
                current_filepath = p;
                current_filename = f;
            }

            current_writer.write_all(record_text.as_bytes())?;
            current_part_records += 1;
            current_part_bytes += rec_bytes;
        }
    }

    if current_part_records > 0 {
        current_writer.flush()?;
        drop(current_writer);

        let part_sha = calculate_file_sha256(&current_filepath)?;
        part_manifests.push(SplitPartManifestItem {
            part: part_index,
            filename: current_filename,
            filepath: current_filepath.to_string_lossy().to_string(),
            size_bytes: part_sha.file_size_bytes,
            records_count: current_part_records,
            sha256: part_sha.sha256_hash,
        });
    }

    let manifest = SplitManifest {
        tool: "BioFile Toolkit".to_string(),
        version: "1.0.0".to_string(),
        timestamp: chrono::Local::now().to_rfc3339(),
        original_filename: orig_checksum.file_name,
        original_size_bytes: orig_checksum.file_size_bytes,
        original_sha256: orig_checksum.sha256_hash,
        format,
        compression: comp,
        split_mode: mode,
        parts: part_manifests,
    };

    let manifest_filename = format!("{}_split_manifest.json", clean_base);
    let manifest_filepath = output_dir_ref.join(&manifest_filename);
    let manifest_json = serde_json::to_string_pretty(&manifest)?;
    fs::write(&manifest_filepath, manifest_json)?;

    Ok(SplitResult {
        manifest,
        manifest_filepath: manifest_filepath.to_string_lossy().to_string(),
        warnings,
    })
}
