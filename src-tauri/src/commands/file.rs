use crate::bio::checksum::{calculate_file_sha256, verify_file_sha256, ChecksumResult};
use crate::bio::extract::{extract_sequences_by_id, ExtractionResult};
use crate::bio::merge::{merge_sequence_files, MergeResult};
use crate::bio::quality::{generate_fastq_qc_report, FastQcReport};
use crate::bio::split::{split_sequence_file, SplitMode, SplitResult};
use crate::bio::validate::{validate_file, ValidationReport};

#[tauri::command]
pub fn read_text_file_cmd(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path).map_err(|e| format!("Could not read selected file: {}", e))
}

#[tauri::command]
pub fn validate_file_cmd(file_path: String) -> Result<ValidationReport, String> {
    validate_file(&file_path).map_err(|e| format!("Validation error: {}", e))
}

#[tauri::command]
pub fn split_file_cmd(
    input_path: String,
    output_dir: String,
    mode: SplitMode,
    preserve_compression: bool,
) -> Result<SplitResult, String> {
    split_sequence_file(&input_path, &output_dir, mode, preserve_compression)
        .map_err(|e| format!("Splitting error: {}", e))
}

#[tauri::command]
pub fn extract_sequences_cmd(
    input_path: String,
    output_path: String,
    target_ids: Vec<String>,
    exact_match: bool,
) -> Result<ExtractionResult, String> {
    extract_sequences_by_id(&input_path, &output_path, target_ids, exact_match)
        .map_err(|e| format!("Extraction error: {}", e))
}

#[tauri::command]
pub fn calculate_checksum_cmd(file_path: String) -> Result<ChecksumResult, String> {
    calculate_file_sha256(&file_path).map_err(|e| format!("Checksum error: {}", e))
}

#[tauri::command]
pub fn verify_checksum_cmd(file_path: String, expected_hash: String) -> Result<bool, String> {
    verify_file_sha256(&file_path, &expected_hash).map_err(|e| format!("Verification error: {}", e))
}

#[tauri::command]
pub fn merge_files_cmd(
    input_paths: Vec<String>,
    output_path: String,
    validate_output: bool,
) -> Result<MergeResult, String> {
    merge_sequence_files(&input_paths, output_path, validate_output)
        .map_err(|e| format!("Merge error: {}", e))
}

#[tauri::command]
pub fn generate_fastq_qc_report_cmd(file_path: String) -> Result<FastQcReport, String> {
    generate_fastq_qc_report(&file_path).map_err(|e| format!("FastQC error: {}", e))
}
