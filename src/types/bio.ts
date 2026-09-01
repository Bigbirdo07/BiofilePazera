export type SequenceType = 'DNA' | 'RNA' | 'Protein' | 'Unknown';

export type CasingOption = 'uppercase' | 'lowercase' | 'preserve';

export interface FastaRecord {
  header: string;
  sequence: string;
}

export interface TransformResponse {
  output_text: string;
  records_transformed: number;
}

export interface TranslationFrameResult {
  frame_label: string;
  protein_sequence: string;
  amino_acid_count: number;
  stop_codon_count: number;
}

export interface TranslationResponse {
  frames: TranslationFrameResult[];
}

export interface SequenceStats {
  header: string;
  length: number;
  count_a: number;
  count_c: number;
  count_g: number;
  count_t: number;
  count_u: number;
  count_n: number;
  count_ambiguous: number;
  canonical_base_count: number;
  gc_count: number;
  gc_percent: number;
  at_percent: number;
}

export interface OverallStatsSummary {
  total_records: number;
  total_length: number;
  shortest_length: number;
  longest_length: number;
  average_length: number;
  total_a: number;
  total_c: number;
  total_g: number;
  total_t: number;
  total_u: number;
  total_n: number;
  total_ambiguous: number;
  total_canonical_bases: number;
  total_gc_count: number;
  overall_gc_percent: number;
  per_record_stats: SequenceStats[];
}

export type SequenceFormat = 'Fasta' | 'Fastq' | 'Unknown';
export type FileCompression = 'Plain' | 'Gzip';

export type SplitMode =
  | { max_size_mb: number }
  | { max_records: number }
  | { num_parts: number };

export interface ValidationErrorItem {
  record_number: number;
  message: string;
}

export interface ValidationReport {
  file_name: string;
  format: SequenceFormat;
  is_valid: boolean;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  warnings_count: number;
  total_bases: number;
  min_read_length: number;
  max_read_length: number;
  avg_read_length: number;
  errors: ValidationErrorItem[];
  errors_capped: boolean;
}

export interface SplitPartManifestItem {
  part: number;
  filename: string;
  filepath: string;
  size_bytes: number;
  records_count: number;
  sha256: string;
}

export interface SplitManifest {
  tool: string;
  version: string;
  timestamp: string;
  original_filename: string;
  original_size_bytes: number;
  original_sha256: string;
  format: SequenceFormat;
  compression: FileCompression;
  split_mode: SplitMode;
  parts: SplitPartManifestItem[];
}

export interface SplitResult {
  manifest: SplitManifest;
  manifest_filepath: string;
  warnings: string[];
}

export interface ExtractionResult {
  total_requested_ids: number;
  found_ids_count: number;
  missing_ids_count: number;
  records_extracted: number;
  output_filepath: string;
  missing_ids: string[];
}

export interface ChecksumResult {
  file_name: string;
  file_size_bytes: number;
  sha256_hash: string;
}

export interface MergeResult {
  total_input_files: number;
  format: SequenceFormat;
  total_records_merged: number;
  total_bytes_written: number;
  output_filepath: string;
  output_sha256: string;
}

export interface AminoAcidComposition {
  hydrophobic: number;
  polar: number;
  acidic: number;
  basic: number;
  glycine: number;
  total: number;
}

export interface ProteinProperties {
  length: number;
  molecular_weight_kda: number;
  isoelectric_point_pi: number;
  composition: AminoAcidComposition;
  hydropathy_profile: number[];
  predicted_helix_pct: number;
  predicted_sheet_pct: number;
  predicted_coil_pct: number;
}

export interface MotifMatch {
  motif_name: string;
  pattern: string;
  start_pos: number;
  end_pos: number;
  strand: string;
  matched_sequence: string;
  cut_site_pos?: number;
}

export interface MotifSearchReport {
  query_length: number;
  total_matches: number;
  matches: MotifMatch[];
}

export interface FastQcReport {
  file_name: string;
  total_reads: number;
  total_bases: number;
  q20_bases_pct: number;
  q30_bases_pct: number;
  mean_phred_score: number;
  per_base_quality_scores: number[];
  per_base_n_content_pct: number[];
  gc_content_pct: number;
  overall_status: 'PASS' | 'WARN' | 'FAIL';
}

export type PageView = 'home' | 'sequence_tools' | 'file_tools' | 'inspect' | 'protein_studio' | 'history' | 'settings';
