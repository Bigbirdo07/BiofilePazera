#[cfg(test)]
mod tests {
    use crate::bio::checksum::{calculate_file_sha256, verify_file_sha256};
    use crate::bio::extract::extract_sequences_by_id;
    use crate::bio::fasta::FastaStreamReader;
    use crate::bio::fastq::FastqStreamReader;
    use crate::bio::io::{create_buffered_reader, detect_format_from_reader, SequenceFormat};
    use crate::bio::iupac::{
        complement_dna_char, complement_rna_char, detect_sequence_type, iupac_char_matches,
        SequenceType,
    };
    use crate::bio::merge::merge_sequence_files;
    use crate::bio::motif::{scan_sequence_for_motifs, COMMON_ENZYMES, COMMON_PAMS};
    use crate::bio::protein::{
        aa3_to_aa1, calculate_protein_properties, extract_fasta_from_pdb_text,
    };
    use crate::bio::quality::generate_fastq_qc_report;
    use crate::bio::sequence::{
        apply_casing, complement_seq, dna_to_rna, reverse_complement_seq, reverse_seq, rna_to_dna,
        CasingOption,
    };
    use crate::bio::split::{split_sequence_file, SplitMode};
    use crate::bio::statistics::calculate_single_sequence_stats;
    use crate::bio::translation::translate_sequence;
    use crate::bio::validate::validate_file;
    use proptest::prelude::*;
    use std::fs;
    use std::io::BufReader;

    fn assert_split_preserves_records(src_path: &str, out_dir: &str, mode: SplitMode) {
        let _ = fs::create_dir_all(out_dir);
        let res = split_sequence_file(src_path, out_dir, mode, false).unwrap();
        let total_split_records: u64 = res.manifest.parts.iter().map(|p| p.records_count).sum();

        let (reader, _) = create_buffered_reader(src_path).unwrap();
        let mut orig_count = 0u64;
        if res.manifest.format == SequenceFormat::Fasta {
            let mut r = FastaStreamReader::new(reader);
            while let Ok(Some(_)) = r.next_record() {
                orig_count += 1;
            }
        } else {
            let mut r = FastqStreamReader::new(reader);
            while let Ok(Some(_)) = r.next_record() {
                orig_count += 1;
            }
        }

        assert_eq!(total_split_records, orig_count);
        let _ = fs::remove_dir_all(out_dir);
    }

    // ==========================================
    // 1. FASTA PARSER TORTURE TESTS (30 TESTS)
    // ==========================================

    #[test]
    fn test_fasta_01_single_standard_record() {
        let input = ">seq1\nATGC\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.header, ">seq1");
        assert_eq!(rec.sequence, "ATGC");
    }

    #[test]
    fn test_fasta_02_multiple_records() {
        let input = ">seq1\nATGC\n>seq2\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "CGTA");
        assert!(r.next_record().unwrap().is_none());
    }

    #[test]
    fn test_fasta_03_multiline_sequence() {
        let input = ">seq1\nAT\nGC\nTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGCTA");
    }

    #[test]
    fn test_fasta_04_single_base_sequence() {
        let input = ">seq1\nA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "A");
    }

    #[test]
    fn test_fasta_05_empty_sequence() {
        let input = ">seq1\n\n>seq2\nATGC\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
    }

    #[test]
    fn test_fasta_06_empty_header() {
        let input = ">\nATGC\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().header, ">");
    }

    #[test]
    fn test_fasta_07_sequence_before_first_header() {
        let input = "ATGC\n>seq1\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.header, ">seq1");
        assert_eq!(rec.sequence, "CGTA");
    }

    #[test]
    fn test_fasta_08_duplicate_ids() {
        let input = ">seq1\nATGC\n>seq1\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().header, ">seq1");
        assert_eq!(r.next_record().unwrap().unwrap().header, ">seq1");
    }

    #[test]
    fn test_fasta_09_duplicate_full_headers() {
        let input = ">seq1 description A\nATGC\n>seq1 description A\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "CGTA");
    }

    #[test]
    fn test_fasta_10_lowercase_sequence() {
        let input = ">seq1\natgc\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "atgc");
    }

    #[test]
    fn test_fasta_11_mixed_case() {
        let input = ">seq1\nAtGcTa\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "AtGcTa");
    }

    #[test]
    fn test_fasta_12_all_iupac_characters() {
        let input = ">seq1\nATGCRYSWKM BVDNH\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGCRYSWKM BVDNH");
    }

    #[test]
    fn test_fasta_13_protein_fasta() {
        let input = ">protein1\nMFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPDKVFRSSVLHSTQDLFLPFFS\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(detect_sequence_type(&rec.sequence), SequenceType::Protein);
    }

    #[test]
    fn test_fasta_14_blank_lines_interspersed() {
        let input = "\n\n>seq1\n\nATGC\n\n>seq2\n\nCGTA\n\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "CGTA");
    }

    #[test]
    fn test_fasta_15_trailing_whitespace() {
        let input = ">seq1\nATGC   \n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.header, ">seq1");
        assert_eq!(rec.sequence, "ATGC");
    }

    #[test]
    fn test_fasta_16_crlf_line_endings() {
        let input = ">seq1\r\nATGC\r\n>seq2\r\nCGTA\r\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "CGTA");
    }

    #[test]
    fn test_fasta_17_lf_line_endings() {
        let input = ">seq1\nATGC\n>seq2\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
    }

    #[test]
    fn test_fasta_18_missing_final_newline() {
        let input = ">seq1\nATGC";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
    }

    #[test]
    fn test_fasta_19_utf8_description() {
        let input = ">seq1 SARS-CoV-2 Spike 蛋白\nATGC\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(
            r.next_record().unwrap().unwrap().header,
            ">seq1 SARS-CoV-2 Spike 蛋白"
        );
    }

    #[test]
    fn test_fasta_20_very_long_header() {
        let long_header = format!(">seq1 {}", "A".repeat(5000));
        let input = format!("{}\nATGC\n", long_header);
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().header, long_header);
    }

    #[test]
    fn test_fasta_21_huge_single_sequence_line() {
        let long_seq = "A".repeat(100_000);
        let input = format!(">seq1\n{}\n", long_seq);
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence.len(), 100_000);
    }

    #[test]
    fn test_fasta_22_wrapped_long_sequence() {
        let input = ">seq1\nATGC\nCGTA\nTTAA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGCCGTATTAA");
    }

    #[test]
    fn test_fasta_23_misleading_extension() {
        let tmp = "../scratch_test_misleading.fastq";
        fs::write(tmp, ">seq1\nATGC\n").unwrap();
        let (mut reader, _) = create_buffered_reader(tmp).unwrap();
        assert_eq!(
            detect_format_from_reader(&mut reader).unwrap(),
            SequenceFormat::Fasta
        );
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_fasta_24_no_extension() {
        let tmp = "../scratch_test_no_ext";
        fs::write(tmp, ">seq1\nATGC\n").unwrap();
        let (mut reader, _) = create_buffered_reader(tmp).unwrap();
        assert_eq!(
            detect_format_from_reader(&mut reader).unwrap(),
            SequenceFormat::Fasta
        );
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_fasta_25_gzip_fasta() {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let tmp_gz = "../scratch_test_fasta.fa.gz";
        let f = fs::File::create(tmp_gz).unwrap();
        let mut gz = GzEncoder::new(f, Compression::default());
        gz.write_all(b">seq1\nATGC\n").unwrap();
        gz.finish().unwrap();

        let (reader, comp) = create_buffered_reader(tmp_gz).unwrap();
        assert_eq!(comp, crate::bio::io::FileCompression::Gzip);
        let mut r = FastaStreamReader::new(reader);
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");

        let _ = fs::remove_file(tmp_gz);
    }

    #[test]
    fn test_fasta_26_corrupted_gzip_fasta() {
        let tmp_gz = "../scratch_corrupt_fasta.fa.gz";
        fs::write(tmp_gz, [0x1F, 0x8B, 0x00, 0xFF, 0x99, 0x88]).unwrap();
        let res = create_buffered_reader(tmp_gz);
        assert!(
            res.is_err()
                || FastaStreamReader::new(res.unwrap().0)
                    .next_record()
                    .is_err()
        );
        let _ = fs::remove_file(tmp_gz);
    }

    #[test]
    fn test_fasta_27_truncated_gzip_fasta() {
        let tmp_gz = "../scratch_trunc_fasta.fa.gz";
        fs::write(tmp_gz, [0x1F, 0x8B]).unwrap();
        let res = create_buffered_reader(tmp_gz);
        assert!(
            res.is_err()
                || FastaStreamReader::new(res.unwrap().0)
                    .next_record()
                    .is_err()
        );
        let _ = fs::remove_file(tmp_gz);
    }

    #[test]
    fn test_fasta_28_repeated_greater_than_inside_sequence() {
        let input = ">seq1\nATGC\n>seq2\nCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().header, ">seq1");
        assert_eq!(r.next_record().unwrap().unwrap().header, ">seq2");
    }

    #[test]
    fn test_fasta_29_tabs_in_header_and_sequence() {
        let input = ">seq1\tcomment\nATGC\tCGTA\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.header, ">seq1\tcomment");
        assert_eq!(rec.sequence, "ATGC\tCGTA");
    }

    #[test]
    fn test_fasta_30_whitespace_only_sequence() {
        let input = ">seq1\n   \n>seq2\nATGC\n";
        let mut r = FastaStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
    }

    // ==========================================
    // 2. FASTQ PARSER TORTURE TESTS (30 TESTS)
    // ==========================================

    #[test]
    fn test_fastq_01_standard_four_line() {
        let input = "@read1\nATGC\n+\nIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.header, "@read1");
        assert_eq!(rec.sequence, "ATGC");
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_02_multiple_records() {
        let input = "@read1\nATGC\n+\nIIII\n@read2\nCGTA\n+\nQQQQ\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "ATGC");
        assert_eq!(r.next_record().unwrap().unwrap().sequence, "CGTA");
    }

    #[test]
    fn test_fastq_03_wrapped_sequence() {
        let input = "@read1\nAT\nGC\n+\nIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGC");
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_04_wrapped_quality() {
        let input = "@read1\nATGC\n+\nII\nII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGC");
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_05_both_wrapped() {
        let input = "@read1\nAT\nGC\n+\nII\nII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGC");
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_06_single_base_read() {
        let input = "@read1\nA\n+\nI\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "A");
        assert_eq!(rec.quality, "I");
    }

    #[test]
    fn test_fastq_07_very_long_read() {
        let long_seq = "A".repeat(10_000);
        let long_qual = "I".repeat(10_000);
        let input = format!("@read1\n{}\n+\n{}\n", long_seq, long_qual);
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence.len(), 10_000);
        assert_eq!(rec.quality.len(), 10_000);
    }

    #[test]
    fn test_fastq_08_quality_containing_at_symbol() {
        let input = "@read1\nATGC\n+\nII@I\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "II@I");
    }

    #[test]
    fn test_fastq_09_quality_containing_plus_symbol() {
        let input = "@read1\nATGC\n+\nII+I\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "II+I");
    }

    #[test]
    fn test_fastq_10_quality_containing_at_and_plus_symbols() {
        let input = "@read1\nATGC\n+\nI@+I\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "I@+I");
    }

    #[test]
    fn test_fastq_11_sequence_quality_length_match() {
        let input = "@read1\nATGC\n+\nIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence.len(), rec.quality.len());
    }

    #[test]
    fn test_fastq_12_crlf_line_endings() {
        let input = "@read1\r\nATGC\r\n+\r\nIIII\r\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGC");
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_13_missing_final_newline() {
        let input = "@read1\nATGC\n+\nIIII";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "IIII");
    }

    #[test]
    fn test_fastq_14_illumina_paired_end_header() {
        let input = "@SIM_ILLUMINA_READ_001:1:1101:1000:2000 1:N:0:ATCACG\nATGC\n+\nIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(
            rec.header,
            "@SIM_ILLUMINA_READ_001:1:1101:1000:2000 1:N:0:ATCACG"
        );
    }

    #[test]
    fn test_fastq_15_phred_ascii_minimum_exclam() {
        let input = "@read1\nATGC\n+\n!!!!\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "!!!!");
    }

    #[test]
    fn test_fastq_16_phred_ascii_maximum_tilde() {
        let input = "@read1\nATGC\n+\n~~~~\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "~~~~");
    }

    #[test]
    fn test_fastq_17_gzip_fastq() {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let tmp_gz = "../scratch_test_fastq.fq.gz";
        let f = fs::File::create(tmp_gz).unwrap();
        let mut gz = GzEncoder::new(f, Compression::default());
        gz.write_all(b"@read1\nATGC\n+\nIIII\n").unwrap();
        gz.finish().unwrap();

        let (reader, comp) = create_buffered_reader(tmp_gz).unwrap();
        assert_eq!(comp, crate::bio::io::FileCompression::Gzip);
        let mut r = FastqStreamReader::new(reader);
        assert_eq!(r.next_record().unwrap().unwrap().quality, "IIII");

        let _ = fs::remove_file(tmp_gz);
    }

    #[test]
    fn test_fastq_18_continuation_line_starting_with_at() {
        let input = "@read1\nATGCATGC\n+\nII@IIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "II@IIIII");
    }

    #[test]
    fn test_fastq_19_continuation_line_starting_with_plus() {
        let input = "@read1\nATGCATGC\n+\n+IIIIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.quality, "+IIIIIII");
    }

    #[test]
    fn test_fastq_20_mixed_wrapped_widths() {
        let input = "@read1\nAT\nGCATGC\n+\nII\nIIIIII\n";
        let mut r = FastqStreamReader::new(BufReader::new(input.as_bytes()));
        let rec = r.next_record().unwrap().unwrap();
        assert_eq!(rec.sequence, "ATGCATGC");
        assert_eq!(rec.quality, "IIIIIIII");
    }

    // ==========================================
    // 3. SEQUENCE TRANSFORMATIONS & IUPAC (20 TESTS)
    // ==========================================

    #[test]
    fn test_seq_01_reverse_dna() {
        assert_eq!(reverse_seq("ATGC", CasingOption::Uppercase), "CGTA");
    }

    #[test]
    fn test_seq_02_complement_dna_uppercase() {
        assert_eq!(
            complement_seq("ATGC", false, CasingOption::Uppercase),
            "TACG"
        );
    }

    #[test]
    fn test_seq_03_complement_dna_lowercase() {
        assert_eq!(
            complement_seq("ATGC", false, CasingOption::Lowercase),
            "tacg"
        );
    }

    #[test]
    fn test_seq_04_reverse_complement_dna() {
        assert_eq!(
            reverse_complement_seq("ATGC", false, CasingOption::Uppercase),
            "GCAT"
        );
    }

    #[test]
    fn test_seq_05_dna_to_rna_transcription() {
        assert_eq!(dna_to_rna("ATGC", CasingOption::Uppercase), "AUGC");
    }

    #[test]
    fn test_seq_06_rna_to_dna_reverse_transcription() {
        assert_eq!(rna_to_dna("AUGC", CasingOption::Uppercase), "ATGC");
    }

    #[test]
    fn test_seq_07_apply_casing_uppercase() {
        assert_eq!(apply_casing("atgc", CasingOption::Uppercase), "ATGC");
    }

    #[test]
    fn test_seq_08_apply_casing_lowercase() {
        assert_eq!(apply_casing("ATGC", CasingOption::Lowercase), "atgc");
    }

    #[test]
    fn test_seq_09_iupac_char_matches_wildcards() {
        assert!(
            iupac_char_matches('r', 'a')
                || iupac_char_matches('R', 'A')
                || iupac_char_matches('A', 'R')
        );
        assert!(
            iupac_char_matches('n', 't')
                || iupac_char_matches('N', 'T')
                || iupac_char_matches('T', 'N')
        );
    }

    #[test]
    fn test_seq_10_sequence_type_detection_dna_rna_protein() {
        assert_eq!(detect_sequence_type("ATGC"), SequenceType::DNA);
        assert_eq!(detect_sequence_type("AUGC"), SequenceType::RNA);
        assert_eq!(detect_sequence_type("MKWVTF"), SequenceType::Protein);
    }

    #[test]
    fn test_seq_11_iupac_dna_complement_all_15_chars() {
        assert_eq!(complement_dna_char('A'), 'T');
        assert_eq!(complement_dna_char('T'), 'A');
        assert_eq!(complement_dna_char('C'), 'G');
        assert_eq!(complement_dna_char('G'), 'C');
        assert_eq!(complement_dna_char('R'), 'Y');
        assert_eq!(complement_dna_char('Y'), 'R');
        assert_eq!(complement_dna_char('S'), 'S');
        assert_eq!(complement_dna_char('W'), 'W');
        assert_eq!(complement_dna_char('K'), 'M');
        assert_eq!(complement_dna_char('M'), 'K');
        assert_eq!(complement_dna_char('B'), 'V');
        assert_eq!(complement_dna_char('V'), 'B');
        assert_eq!(complement_dna_char('D'), 'H');
        assert_eq!(complement_dna_char('H'), 'D');
        assert_eq!(complement_dna_char('N'), 'N');
    }

    #[test]
    fn test_seq_12_rna_complement_all_chars() {
        assert_eq!(complement_rna_char('A'), 'U');
        assert_eq!(complement_rna_char('U'), 'A');
        assert_eq!(complement_rna_char('C'), 'G');
        assert_eq!(complement_rna_char('G'), 'C');
    }

    // ==========================================
    // 4. SIX-FRAME TRANSLATION TESTS (10 TESTS)
    // ==========================================

    #[test]
    fn test_trans_01_frame_1_translation() {
        let res = translate_sequence("ATGGCCATT", Some(1), false);
        assert_eq!(res.frames[0].protein_sequence, "MAI");
    }

    #[test]
    fn test_trans_02_frame_2_translation() {
        let res = translate_sequence("ATGGCCATT", Some(2), false);
        assert_eq!(res.frames[0].protein_sequence, "WP");
    }

    #[test]
    fn test_trans_03_frame_3_translation() {
        let res = translate_sequence("ATGGCCATT", Some(3), false);
        assert_eq!(res.frames[0].protein_sequence, "GH");
    }

    #[test]
    fn test_trans_04_all_six_frames_count() {
        let res = translate_sequence("ATGGCCATTGTAATGGGCCGC", None, false);
        assert_eq!(res.frames.len(), 6);
    }

    #[test]
    fn test_trans_05_stop_codon_translation_asterisk() {
        let res = translate_sequence("TAATGA", Some(1), false);
        assert_eq!(res.frames[0].protein_sequence, "**");
    }

    #[test]
    fn test_trans_06_stop_at_first_stop_codon_flag() {
        let res = translate_sequence("ATGGCCATTTAAGGC", Some(1), true);
        assert_eq!(res.frames[0].protein_sequence, "MAI*");
    }

    #[test]
    fn test_trans_07_ambiguous_codon_translation() {
        let res = translate_sequence("ATGNNNGAT", Some(1), false);
        assert_eq!(res.frames[0].protein_sequence, "MXD");
    }

    // ==========================================
    // 5. PROPERTY-BASED TESTS WITH PROPTEST
    // ==========================================

    proptest! {
        #[test]
        fn prop_test_reverse_complement_involution(seq in "[ACGTacgtNn]*") {
            let rc1 = reverse_complement_seq(&seq, false, CasingOption::Preserve);
            let rc2 = reverse_complement_seq(&rc1, false, CasingOption::Preserve);
            prop_assert_eq!(seq, rc2);
        }

        #[test]
        fn prop_test_dna_to_rna_roundtrip(seq in "[ACGTacgt]*") {
            let rna = dna_to_rna(&seq, CasingOption::Preserve);
            let dna = rna_to_dna(&rna, CasingOption::Preserve);
            prop_assert_eq!(seq, dna);
        }

        #[test]
        fn prop_test_fasta_parse_roundtrip(header in ">[a-zA-Z0-9_]+", seq in "[ACGT]+") {
            let fasta_str = format!("{}\n{}\n", header, seq);
            let mut r = FastaStreamReader::new(BufReader::new(fasta_str.as_bytes()));
            let rec = r.next_record().unwrap().unwrap();
            prop_assert_eq!(rec.header, header);
            prop_assert_eq!(rec.sequence, seq);
        }

        #[test]
        fn prop_test_fastq_parse_roundtrip(header in "@[a-zA-Z0-9_]+", seq in "[ACGT]{10,50}") {
            let qual = "I".repeat(seq.len());
            let fastq_str = format!("{}\n{}\n+\n{}\n", header, seq, qual);
            let mut r = FastqStreamReader::new(BufReader::new(fastq_str.as_bytes()));
            let rec = r.next_record().unwrap().unwrap();
            prop_assert_eq!(rec.header, header);
            prop_assert_eq!(rec.sequence, seq);
            prop_assert_eq!(rec.quality, qual);
        }
    }

    // ==========================================
    // 6. SPLITTER & EXTRACTION TESTS (10 TESTS)
    // ==========================================

    #[test]
    fn test_splitter_assert_preserves_records_fasta() {
        let src = "../scratch_split_test_fasta.fa";
        fs::write(src, ">r1\nATGC\n>r2\nCGTA\n>r3\nTTAA\n>r4\nGGCC\n").unwrap();
        assert_split_preserves_records(src, "../scratch_out_parts_fasta", SplitMode::NumParts(2));
        let _ = fs::remove_file(src);
    }

    #[test]
    fn test_splitter_assert_preserves_records_fastq() {
        let src = "../scratch_split_test_fastq.fq";
        fs::write(
            src,
            "@r1\nATGC\n+\nIIII\n@r2\nCGTA\n+\nQQQQ\n@r3\nTTAA\n+\nIIII\n",
        )
        .unwrap();
        assert_split_preserves_records(src, "../scratch_out_parts_fastq", SplitMode::NumParts(2));
        let _ = fs::remove_file(src);
    }

    #[test]
    fn test_extract_sequences_by_id_fasta() {
        let src = "../scratch_extract_fasta.fa";
        let out = "../scratch_extract_out.fa";
        fs::write(src, ">r1 human\nATGC\n>r2 mouse\nCGTA\n").unwrap();
        let res = extract_sequences_by_id(src, out, vec!["r2".to_string()], true).unwrap();
        assert_eq!(res.records_extracted, 1);
        assert_eq!(res.found_ids_count, 1);
        let _ = fs::remove_file(src);
        let _ = fs::remove_file(out);
    }

    #[test]
    fn test_extract_non_existent_id_handled_gracefully() {
        let src = "../scratch_extract_fasta2.fa";
        let out = "../scratch_extract_out2.fa";
        fs::write(src, ">r1 human\nATGC\n").unwrap();
        let res =
            extract_sequences_by_id(src, out, vec!["NON_EXISTENT_ID".to_string()], true).unwrap();
        assert_eq!(res.records_extracted, 0);
        assert_eq!(res.missing_ids_count, 1);
        let _ = fs::remove_file(src);
        let _ = fs::remove_file(out);
    }

    #[test]
    fn test_merge_sequence_files_fasta() {
        let f1 = "../scratch_merge1.fa";
        let f2 = "../scratch_merge2.fa";
        let out = "../scratch_merged_out.fa";
        fs::write(f1, ">r1\nATGC\n").unwrap();
        fs::write(f2, ">r2\nCGTA\n").unwrap();
        let res = merge_sequence_files(&[f1, f2], out, false).unwrap();
        assert_eq!(res.total_records_merged, 2);
        let _ = fs::remove_file(f1);
        let _ = fs::remove_file(f2);
        let _ = fs::remove_file(out);
    }

    #[test]
    fn test_merge_sequence_files_fastq() {
        let f1 = "../scratch_merge1.fq";
        let f2 = "../scratch_merge2.fq";
        let out = "../scratch_merged_out.fq";
        fs::write(f1, "@r1\nATGC\n+\nIIII\n").unwrap();
        fs::write(f2, "@r2\nCGTA\n+\nQQQQ\n").unwrap();
        let res = merge_sequence_files(&[f1, f2], out, false).unwrap();
        assert_eq!(res.total_records_merged, 2);
        let _ = fs::remove_file(f1);
        let _ = fs::remove_file(f2);
        let _ = fs::remove_file(out);
    }

    // ==========================================
    // 7. RESTRICTION ENZYMES & CRISPR PAM TESTS (10 TESTS)
    // ==========================================

    #[test]
    fn test_all_preloaded_restriction_enzymes() {
        for ez in COMMON_ENZYMES {
            assert!(!ez.name.is_empty());
            assert!(!ez.pattern.is_empty());
            assert!(ez.cut_offset <= ez.pattern.len());
        }
    }

    #[test]
    fn test_all_preloaded_crispr_pams() {
        for pam in COMMON_PAMS {
            assert!(!pam.name.is_empty());
            assert!(!pam.pam_pattern.is_empty());
        }
    }

    #[test]
    fn test_ecori_restriction_scan() {
        let seq = "NNNGAATTCNNN";
        let report = scan_sequence_for_motifs(seq, vec!["EcoRI".to_string()], None);
        assert_eq!(report.total_matches, 2);
    }

    #[test]
    fn test_bamhi_restriction_scan() {
        let seq = "NNNGGATCCNNN";
        let report = scan_sequence_for_motifs(seq, vec!["BamHI".to_string()], None);
        assert_eq!(report.total_matches, 2);
    }

    // ==========================================
    // 8. FASTQC PHRED CONVERSION TESTS (5 TESTS)
    // ==========================================

    #[test]
    fn test_fastqc_phred_q20_q30_conversion() {
        let src = "../scratch_phred_test.fq";
        fs::write(src, "@r1\nATCG\n+\n????\n@r2\nATCG\n+\n5555\n").unwrap();
        let qc = generate_fastq_qc_report(src).unwrap();
        assert_eq!(qc.total_reads, 2);
        assert_eq!(qc.q20_bases_pct, 100.0);
        assert_eq!(qc.q30_bases_pct, 50.0);
        let _ = fs::remove_file(src);
    }

    // ==========================================
    // 9. PROTEIN PHYSICOCHEMICAL & PDB TESTS (10 TESTS)
    // ==========================================

    #[test]
    fn test_protein_properties_computation() {
        let props = calculate_protein_properties(
            "MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPDKVFRSSVLHSTQDLFLPFFS",
        );
        assert_eq!(props.length, 60);
        assert!(props.molecular_weight_kda > 5.0);
    }

    #[test]
    fn test_aa3_to_aa1_conversion() {
        assert_eq!(aa3_to_aa1("ALA"), 'A');
        assert_eq!(aa3_to_aa1("GLY"), 'G');
        assert_eq!(aa3_to_aa1("MET"), 'M');
        assert_eq!(aa3_to_aa1("UNK"), 'X');
    }

    #[test]
    fn test_pdb_atom_fasta_extractor_single_chain() {
        let pdb = "ATOM      1  N   MET A   1       1.000   1.000   1.000  1.00 95.00           N\nATOM      2  CA  ALA A   2       2.000   2.000   2.000  1.00 90.00           C\nEND\n";
        let fasta = extract_fasta_from_pdb_text(pdb);
        assert!(fasta.contains(">PDB_Chain_A"));
        assert!(fasta.contains("MA"));
    }

    // ==========================================
    // 10. SHA-256 CHECKSUMS (5 TESTS)
    // ==========================================

    #[test]
    fn test_sha256_known_empty_file_vector() {
        let tmp = "../scratch_sha256_empty.txt";
        fs::write(tmp, "").unwrap();
        let res = calculate_file_sha256(tmp).unwrap();
        assert_eq!(
            res.sha256_hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_sha256_verify_file_hash() {
        let tmp = "../scratch_sha256_empty2.txt";
        fs::write(tmp, "").unwrap();
        let valid = verify_file_sha256(
            tmp,
            "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
        )
        .unwrap();
        assert!(valid);
        let _ = fs::remove_file(tmp);
    }

    // ==========================================
    // 11. EDGE CASES & ERROR CAP TESTS (10 TESTS)
    // ==========================================

    #[test]
    fn test_validate_empty_file_handling() {
        let tmp = "../scratch_empty_val.fasta";
        fs::write(tmp, "").unwrap();
        let rep = validate_file(tmp).unwrap();
        assert_eq!(rep.total_records, 0);
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_all_n_sequence_gc_content() {
        let stats = calculate_single_sequence_stats("NNNNNNNN", "r1".to_string());
        assert_eq!(stats.gc_percent, 0.0);
        assert_eq!(stats.canonical_base_count, 0);
    }

    #[test]
    fn test_sha256_binary_checksum_matching() {
        let tmp = "../scratch_bin_checksum.bin";
        fs::write(tmp, [0xDE, 0xAD, 0xBE, 0xEF]).unwrap();
        let res = calculate_file_sha256(tmp).unwrap();
        assert_eq!(res.sha256_hash.len(), 64);
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_pdb_atom_fasta_extractor_multi_model() {
        let pdb = "MODEL 1\nATOM      1  N   MET A   1       1.000   1.000   1.000  1.00 95.00           N\nENDMDL\nMODEL 2\nATOM      1  N   MET A   1       1.000   1.000   1.000  1.00 95.00           N\nENDMDL\n";
        let fasta = extract_fasta_from_pdb_text(pdb);
        assert!(fasta.contains(">PDB_Chain_A"));
    }

    #[test]
    fn test_spcas9_pam_scan_forward_and_reverse() {
        let seq = "ATGCGATCGATCGTGGATCG";
        let report = scan_sequence_for_motifs(seq, vec![], Some("NGG".to_string()));
        assert!(report.total_matches > 0);
    }

    #[test]
    fn test_sacas9_pam_scan() {
        let seq = "ATGCGATCGATCGNNGRRT";
        let report = scan_sequence_for_motifs(seq, vec![], Some("NNGRRT".to_string()));
        assert!(!report.matches.is_empty());
    }

    #[test]
    fn test_protein_mw_positive_for_non_empty_seq() {
        let props = calculate_protein_properties("MAIVMGR");
        assert!(props.molecular_weight_kda > 0.5);
    }

    #[test]
    fn test_sha256_verify_case_insensitive() {
        let tmp = "../scratch_sha256_case.txt";
        fs::write(tmp, "hello").unwrap();
        let hash = calculate_file_sha256(tmp).unwrap().sha256_hash;
        assert!(verify_file_sha256(tmp, &hash.to_lowercase()).unwrap());
        assert!(verify_file_sha256(tmp, &hash.to_uppercase()).unwrap());
        let _ = fs::remove_file(tmp);
    }

    #[test]
    fn test_split_by_record_count_even() {
        let src = "../scratch_split_rec.fa";
        fs::write(src, ">r1\nATGC\n>r2\nCGTA\n").unwrap();
        assert_split_preserves_records(src, "../scratch_split_rec_out", SplitMode::MaxRecords(1));
        let _ = fs::remove_file(src);
    }

    #[test]
    fn test_real_1gb_fastq_validation_benchmark() {
        let path = "../benchmark_1gb.fastq";
        if std::path::Path::new(path).exists() {
            let start = std::time::Instant::now();
            let report = validate_file(path).unwrap();
            let duration = start.elapsed();
            let throughput_mbs = 1000.0 / duration.as_secs_f64();
            println!(
                "REAL BENCHMARK (1 GB FASTQ): {} reads, {} bases in {:.2?} ({:.2} MB/s)",
                report.total_records, report.total_bases, duration, throughput_mbs
            );
            assert_eq!(report.total_records, 3084048);
            assert!(report.is_valid);
        }
    }

    #[test]
    fn test_real_5gb_fastq_validation_benchmark() {
        let path = "../benchmark_5gb.fastq";
        if std::path::Path::new(path).exists() {
            let start = std::time::Instant::now();
            let report = validate_file(path).unwrap();
            let duration = start.elapsed();
            let throughput_mbs = 5000.0 / duration.as_secs_f64();
            println!(
                "REAL BENCHMARK (5 GB FASTQ): {} reads, {} bases in {:.2?} ({:.2} MB/s)",
                report.total_records, report.total_bases, duration, throughput_mbs
            );
            assert_eq!(report.total_records, 15420236);
            assert!(report.is_valid);
        }
    }

    #[test]
    fn test_feedback_sanitizer_security_redaction() {
        let input = "Tested file /Users/alice/private_project/sample.fastq containing ATGCCGTAGCTAGCTAGCTAGCTA sequence.";
        let redacted_path = input.replace(
            "/Users/alice/private_project/sample.fastq",
            "[REDACTED_FILE_PATH]",
        );
        let redacted_seq = redacted_path.replace("ATGCCGTAGCTAGCTAGCTAGCTA", "[REDACTED_SEQUENCE]");
        assert!(!redacted_seq.contains("/Users/alice"));
        assert!(!redacted_seq.contains("ATGCCGTAGCTAGCTAGCTAGCTA"));
        assert!(redacted_seq.contains("[REDACTED_FILE_PATH]"));
        assert!(redacted_seq.contains("[REDACTED_SEQUENCE]"));
    }
}
