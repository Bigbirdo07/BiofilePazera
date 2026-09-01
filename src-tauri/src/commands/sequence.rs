use crate::bio::iupac::{detect_sequence_type, SequenceType};
use crate::bio::motif::{scan_sequence_for_motifs, MotifSearchReport};
use crate::bio::protein::{
    calculate_protein_properties, extract_fasta_from_pdb_text, ProteinProperties,
};
use crate::bio::sequence::{transform_sequence_workspace, CasingOption, TransformResponse};
use crate::bio::statistics::{calculate_sequence_stats_workspace, OverallStatsSummary};
use crate::bio::translation::{translate_sequence, TranslationResponse};

#[tauri::command]
pub fn detect_sequence_type_cmd(input: String) -> SequenceType {
    detect_sequence_type(&input)
}

#[tauri::command]
pub fn transform_sequence_cmd(
    input: String,
    operation: String,
    is_rna: bool,
    casing: CasingOption,
    append_header_suffix: bool,
) -> TransformResponse {
    transform_sequence_workspace(&input, &operation, is_rna, casing, append_header_suffix)
}

#[tauri::command]
pub fn translate_sequence_cmd(
    input: String,
    selected_frame: Option<i8>,
    stop_at_stop_codon: bool,
) -> TranslationResponse {
    translate_sequence(&input, selected_frame, stop_at_stop_codon)
}

#[tauri::command]
pub fn calculate_sequence_stats_cmd(input: String) -> OverallStatsSummary {
    calculate_sequence_stats_workspace(&input)
}

#[tauri::command]
pub fn calculate_protein_properties_cmd(input: String) -> ProteinProperties {
    calculate_protein_properties(&input)
}

#[tauri::command]
pub fn extract_fasta_from_pdb_cmd(pdb_text: String) -> String {
    extract_fasta_from_pdb_text(&pdb_text)
}

#[tauri::command]
pub fn scan_sequence_for_motifs_cmd(
    input: String,
    target_enzymes: Vec<String>,
    custom_pattern: Option<String>,
) -> MotifSearchReport {
    scan_sequence_for_motifs(&input, target_enzymes, custom_pattern)
}
