import { invoke } from '@tauri-apps/api/core';
import {
  SequenceType,
  CasingOption,
  TransformResponse,
  TranslationResponse,
  OverallStatsSummary,
  ValidationReport,
  SplitResult,
  SplitMode,
  ExtractionResult,
  ChecksumResult,
  MergeResult,
  ProteinProperties,
  MotifSearchReport,
  FastQcReport,
} from '../types/bio';

// Check if running inside Tauri environment
const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function detectSequenceType(input: string): Promise<SequenceType> {
  if (isTauri()) {
    try {
      return await invoke<SequenceType>('detect_sequence_type_cmd', { input });
    } catch (e) {
      console.error('Tauri detectSequenceType error:', e);
    }
  }

  // Fallback TypeScript implementation
  const clean = input
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join('')
    .replace(/\s+/g, '')
    .toUpperCase();

  if (!clean) return 'Unknown';
  let hasU = false;
  let hasT = false;
  let otherCount = 0;

  for (const c of clean) {
    if (c === 'U') hasU = true;
    else if (c === 'T') hasT = true;
    else if (!'ACGNRYSWKMBDHV'.includes(c)) otherCount++;
  }

  if (otherCount > clean.length / 10) return 'Protein';
  if (hasU && !hasT) return 'RNA';
  if (hasT && !hasU) return 'DNA';
  return 'DNA';
}

export async function transformSequence(
  input: string,
  operation: string,
  isRna: boolean,
  casing: CasingOption,
  appendHeaderSuffix: boolean
): Promise<TransformResponse> {
  if (isTauri()) {
    try {
      return await invoke<TransformResponse>('transform_sequence_cmd', {
        input,
        operation,
        isRna,
        casing,
        appendHeaderSuffix,
      });
    } catch (e) {
      console.error('Tauri transformSequence error:', e);
    }
  }

  // Fallback transformation logic for web preview
  const lines = input.split('\n');
  let currentHeader = '';
  let currentSeq = '';
  const records: { header: string; seq: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('>')) {
      if (currentHeader || currentSeq) {
        records.push({ header: currentHeader, seq: currentSeq });
        currentSeq = '';
      }
      currentHeader = trimmed;
    } else {
      currentSeq += trimmed;
    }
  }
  if (currentHeader || currentSeq) {
    records.push({ header: currentHeader, seq: currentSeq });
  }

  const isFasta = records.some((r) => r.header.length > 0);
  const outParts: string[] = [];

  const complementChar = (c: string, rna: boolean): string => {
    const mapDna: Record<string, string> = {
      A: 'T', T: 'A', C: 'G', G: 'C', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D', N: 'N',
      a: 't', t: 'a', c: 'g', g: 'c', r: 'y', y: 'r', s: 's', w: 'w', k: 'm', m: 'k', b: 'v', v: 'b', d: 'h', h: 'd', n: 'n',
    };
    const mapRna: Record<string, string> = {
      A: 'U', U: 'A', C: 'G', G: 'C', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K', B: 'V', V: 'B', D: 'H', H: 'D', N: 'N',
      a: 'u', u: 'a', c: 'g', g: 'c', r: 'y', y: 'r', s: 's', w: 'w', k: 'm', m: 'k', b: 'v', v: 'b', d: 'h', h: 'd', n: 'n',
    };
    const dict = rna ? mapRna : mapDna;
    return dict[c] || c;
  };

  for (const r of records) {
    let res = r.seq;
    if (operation === 'reverse') {
      res = res.split('').reverse().join('');
    } else if (operation === 'complement') {
      res = res.split('').map((c) => complementChar(c, isRna)).join('');
    } else if (operation === 'reverse_complement') {
      res = res.split('').reverse().map((c) => complementChar(c, isRna)).join('');
    } else if (operation === 'dna_to_rna') {
      res = res.replace(/T/g, 'U').replace(/t/g, 'u');
    } else if (operation === 'rna_to_dna') {
      res = res.replace(/U/g, 'T').replace(/u/g, 't');
    }

    if (casing === 'uppercase') res = res.toUpperCase();
    if (casing === 'lowercase') res = res.toLowerCase();

    if (isFasta) {
      let h = r.header;
      if (appendHeaderSuffix) h += `_${operation}`;
      outParts.push(`${h}\n${res}`);
    } else {
      outParts.push(res);
    }
  }

  return {
    output_text: outParts.join('\n'),
    records_transformed: records.length,
  };
}

export async function translateSequence(
  input: string,
  selectedFrame: number | null,
  stopAtStopCodon: boolean
): Promise<TranslationResponse> {
  if (isTauri()) {
    try {
      return await invoke<TranslationResponse>('translate_sequence_cmd', {
        input,
        selectedFrame,
        stopAtStopCodon,
      });
    } catch (e) {
      console.error('Tauri translateSequence error:', e);
    }
  }

  const framesToRun = selectedFrame !== null ? [selectedFrame] : [1, 2, 3, -1, -2, -3];
  const cleanSeq = input.split('\n').filter((l) => !l.startsWith('>')).join('').replace(/\s+/g, '').toUpperCase();

  const mockFrames = framesToRun.map((f) => {
    return {
      frame_label: f > 0 ? `+${f}` : `${f}`,
      protein_sequence: `[Frame ${f} translation of ${cleanSeq.length} bases]`,
      amino_acid_count: Math.floor(cleanSeq.length / 3),
      stop_codon_count: 0,
    };
  });

  return { frames: mockFrames };
}

export async function calculateSequenceStats(input: string): Promise<OverallStatsSummary> {
  if (isTauri()) {
    try {
      return await invoke<OverallStatsSummary>('calculate_sequence_stats_cmd', { input });
    } catch (e) {
      console.error('Tauri calculateSequenceStats error:', e);
    }
  }

  const clean = input.split('\n').filter((l) => !l.startsWith('>')).join('').replace(/\s+/g, '').toUpperCase();
  let g = 0, c = 0, a = 0, t = 0, n = 0;
  for (const char of clean) {
    if (char === 'G') g++;
    else if (char === 'C') c++;
    else if (char === 'A') a++;
    else if (char === 'T' || char === 'U') t++;
    else if (char === 'N') n++;
  }
  const canonical = a + c + g + t;
  const gcPct = canonical > 0 ? ((g + c) / canonical) * 100 : 0;
  const atPct = canonical > 0 ? ((a + t) / canonical) * 100 : 0;

  return {
    total_records: 1,
    total_length: clean.length,
    shortest_length: clean.length,
    longest_length: clean.length,
    average_length: clean.length,
    total_a: a,
    total_c: c,
    total_g: g,
    total_t: t,
    total_u: 0,
    total_n: n,
    total_ambiguous: 0,
    total_canonical_bases: canonical,
    total_gc_count: g + c,
    overall_gc_percent: gcPct,
    per_record_stats: [
      {
        header: 'Sequence',
        length: clean.length,
        count_a: a,
        count_c: c,
        count_g: g,
        count_t: t,
        count_u: 0,
        count_n: n,
        count_ambiguous: 0,
        canonical_base_count: canonical,
        gc_count: g + c,
        gc_percent: gcPct,
        at_percent: atPct,
      },
    ],
  };
}

export async function validateFile(filePath: string): Promise<ValidationReport> {
  if (isTauri()) {
    return await invoke<ValidationReport>('validate_file_cmd', { filePath });
  }
  return {
    file_name: filePath,
    format: 'Fastq',
    is_valid: true,
    total_records: 1000,
    valid_records: 1000,
    invalid_records: 0,
    warnings_count: 0,
    total_bases: 150000,
    min_read_length: 150,
    max_read_length: 150,
    avg_read_length: 150.0,
    errors: [],
    errors_capped: false,
  };
}

export async function splitFile(
  inputPath: string,
  outputDir: string,
  mode: SplitMode,
  preserveCompression: boolean
): Promise<SplitResult> {
  if (isTauri()) {
    return await invoke<SplitResult>('split_file_cmd', {
      inputPath,
      outputDir,
      mode,
      preserveCompression,
    });
  }
  throw new Error('Split operation requires Tauri environment');
}

export async function extractSequences(
  inputPath: string,
  outputPath: string,
  targetIds: string[],
  exactMatch: boolean
): Promise<ExtractionResult> {
  if (isTauri()) {
    return await invoke<ExtractionResult>('extract_sequences_cmd', {
      inputPath,
      outputPath,
      targetIds,
      exactMatch,
    });
  }
  throw new Error('Extract operation requires Tauri environment');
}

export async function calculateChecksum(filePath: string): Promise<ChecksumResult> {
  if (isTauri()) {
    return await invoke<ChecksumResult>('calculate_checksum_cmd', { filePath });
  }
  return {
    file_name: filePath,
    file_size_bytes: 1024567,
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };
}

export async function verifyChecksum(filePath: string, expectedHash: string): Promise<boolean> {
  if (isTauri()) {
    return await invoke<boolean>('verify_checksum_cmd', { filePath, expectedHash });
  }
  return true;
}

export async function mergeFiles(
  inputPaths: string[],
  outputPath: string,
  validateOutput: boolean
): Promise<MergeResult> {
  if (isTauri()) {
    return await invoke<MergeResult>('merge_files_cmd', {
      inputPaths,
      outputPath,
      validateOutput,
    });
  }
  return {
    total_input_files: inputPaths.length,
    format: 'Fastq',
    total_records_merged: 5000,
    total_bytes_written: 1250000,
    output_filepath: outputPath,
    output_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  };
}

export async function calculateProteinProperties(input: string): Promise<ProteinProperties> {
  if (isTauri()) {
    return await invoke<ProteinProperties>('calculate_protein_properties_cmd', { input });
  }
  const clean = input.replace(/[^A-Za-z]/g, '');
  return {
    length: clean.length,
    molecular_weight_kda: (clean.length * 110) / 1000,
    isoelectric_point_pi: 6.8,
    composition: {
      hydrophobic: Math.floor(clean.length * 0.4),
      polar: Math.floor(clean.length * 0.3),
      acidic: Math.floor(clean.length * 0.15),
      basic: Math.floor(clean.length * 0.15),
      glycine: Math.floor(clean.length * 0.05),
      total: clean.length,
    },
    hydropathy_profile: [1.2, 0.8, -0.5, -1.2, 2.1, 3.4, 0.1, -2.5, 1.8],
    predicted_helix_pct: 35.5,
    predicted_sheet_pct: 22.0,
    predicted_coil_pct: 42.5,
  };
}

export async function extractFastaFromPdb(pdbText: string): Promise<String> {
  if (isTauri()) {
    return await invoke<string>('extract_fasta_from_pdb_cmd', { pdbText });
  }
  return '>PDB_Chain_A\nMFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPDKVFRSSVLHSTQDLFLPFFSNVTWFHAIHVSGTNGTKRFDNPVLPFNDGVYFASTEKSNIIRGWIFGTTLDSKTQSLLIVNNATNVVIKVCEFQFCNDPFLGVYYHKNNKSWMESEDRVYSSANNCTFEYVSQPFLMDLEGKQGNFKNLREFVFKNIDGYFKIYSKHTPINLVRDLPQGFSALEPLVDLPIGINITRFQTLLALHRSYLTPGDSSSGWTAGAAAYYVGYLQPRTFLLKYNENGTITDAVDCALDPLSETKCTLKSFTVEKGIYQTSNFRVQPTESIVRFPNITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNFNFNGLTGTGVLTESNKKFLPFQQFGRDIADTTDAVRDPQTLEILDITPCSFGGVSVITPGTNTSNQVAVLYQDVNCTEVPVAIHADQLTPTWRVYSTGSNVFQTRAGCLIGAEHVNNSYECDIPIGAGICASYQTQTNSPRRARSVASQSIIAYTMSLGAENSVAYSNNSIIPTNFTISVTTEILPVSMTKTSVDCTMYICGDSTECSNLLLQYGSFCTQLNRALTGIAVEQDKNTQEVFAQVKQIYKTPPIKDFGGFNFSQILPDPSKPSKRSFIEDLLFNKVTLADAGFIKQYGDCLGDIAARDLICAQKFNGLTVLPPLLTDEMIAQYTSALLAGTITSGWTFGAGAALQIPFAMQMAYRFNGIGVTQNVLYENQKLIANQFNSAIGKIQDSLSSTASALGKLQDVVNQNAQALNTLVKQLSSNFGAISSVLNDILSRLDKVEAEVQIDRLITGRLQSLQTYVTQQLIRAAEIRASANLAATKMSECVLGQSKRVDFCGKGYHLMSFPQSAPHGVVFLHVTYVPAQEKNFTTAPAICHDGKAHFPREGVFVSNGTHWFVTQRRFYEPIITTDNTFVSGNCDVVIGIVNNTVYDPLQPELDSFKEELDKYFKNHTSPDVDLGDISGINASVVNIQKEIDRLNEVAKNLNESLIDLQELGKYEQYIKWPWYIWLGFIAGLIAIVMVTIMLCCMTSCCSCLKGCCSCGSCCKFDEDDSEPVLKGVKLHYT';
}

export async function scanSequenceForMotifs(
  input: string,
  targetEnzymes: string[],
  customPattern?: string
): Promise<MotifSearchReport> {
  if (isTauri()) {
    return await invoke<MotifSearchReport>('scan_sequence_for_motifs_cmd', {
      input,
      targetEnzymes,
      customPattern,
    });
  }
  return {
    query_length: input.length,
    total_matches: 2,
    matches: [
      {
        motif_name: 'EcoRI',
        pattern: 'GAATTC',
        start_pos: 15,
        end_pos: 20,
        strand: '+',
        matched_sequence: 'GAATTC',
        cut_site_pos: 16,
      },
      {
        motif_name: 'BamHI',
        pattern: 'GGATCC',
        start_pos: 42,
        end_pos: 47,
        strand: '+',
        matched_sequence: 'GGATCC',
        cut_site_pos: 43,
      },
    ],
  };
}

export async function generateFastqQcReport(filePath: string): Promise<FastQcReport> {
  if (isTauri()) {
    return await invoke<FastQcReport>('generate_fastq_qc_report_cmd', { filePath });
  }
  return {
    file_name: filePath.split('/').pop() || 'sample_run.fastq',
    total_reads: 30841,
    total_bases: 4626150,
    q20_bases_pct: 98.45,
    q30_bases_pct: 94.20,
    mean_phred_score: 36.8,
    per_base_quality_scores: [37.2, 37.5, 37.8, 38.0, 37.9, 37.6, 37.2, 36.8, 36.5, 36.0, 35.8],
    per_base_n_content_pct: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0],
    gc_content_pct: 48.6,
    overall_status: 'PASS',
  };
}
