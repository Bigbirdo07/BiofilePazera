pub mod bio;
pub mod commands;
pub mod jobs;

use commands::file::*;
use commands::sequence::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_sequence_type_cmd,
            read_text_file_cmd,
            transform_sequence_cmd,
            translate_sequence_cmd,
            calculate_sequence_stats_cmd,
            validate_file_cmd,
            split_file_cmd,
            extract_sequences_cmd,
            calculate_checksum_cmd,
            verify_checksum_cmd,
            merge_files_cmd,
            calculate_protein_properties_cmd,
            extract_fasta_from_pdb_cmd,
            scan_sequence_for_motifs_cmd,
            generate_fastq_qc_report_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
