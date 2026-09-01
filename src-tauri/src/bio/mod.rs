pub mod checksum;
pub mod extract;
pub mod fasta;
pub mod fastq;
pub mod io;
pub mod iupac;
pub mod merge;
pub mod motif;
pub mod protein;
pub mod quality;
pub mod sequence;
pub mod split;
pub mod statistics;
#[cfg(test)]
pub mod test_suite;
pub mod translation;
pub mod validate;

#[cfg(test)]
mod tests {
    use super::fasta::*;
    use super::fastq::*;
    use super::iupac::*;
    use super::sequence::*;
    use super::statistics::*;

    #[test]
    fn test_iupac_dna_complement() {
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

        // Case preservation
        assert_eq!(complement_dna_char('a'), 't');
        assert_eq!(complement_dna_char('r'), 'y');
    }

    #[test]
    fn test_wrapped_fastq_parsing() {
        // Multi-line wrapped sequence and multi-line wrapped quality FASTQ string
        let raw_fastq =
            "@read1_wrapped\nATGC\nCGTA\n+\nIIII\nJJJJ\n@read2_standard\nATGC\n+\nIIII\n";
        let mut reader = FastqStreamReader::new(raw_fastq.as_bytes());

        let r1 = reader.next_record().unwrap().unwrap();
        assert_eq!(r1.header, "@read1_wrapped");
        assert_eq!(r1.sequence, "ATGCCGTA");
        assert_eq!(r1.quality, "IIIIJJJJ");
        assert_eq!(r1.sequence.len(), r1.quality.len());

        let r2 = reader.next_record().unwrap().unwrap();
        assert_eq!(r2.header, "@read2_standard");
        assert_eq!(r2.sequence, "ATGC");
        assert_eq!(r2.quality, "IIII");
    }

    #[test]
    fn test_streaming_fasta_parsing() {
        let raw_fasta = ">seq1\nATGC\nCGTA\n>seq2\nAAATTT\n";
        let mut reader = FastaStreamReader::new(raw_fasta.as_bytes());

        let r1 = reader.next_record().unwrap().unwrap();
        assert_eq!(r1.header, ">seq1");
        assert_eq!(r1.sequence, "ATGCCGTA");

        let r2 = reader.next_record().unwrap().unwrap();
        assert_eq!(r2.header, ">seq2");
        assert_eq!(r2.sequence, "AAATTT");
    }

    #[test]
    fn test_reverse_complement() {
        let seq = "ATGCCGTA";
        let rev_comp = reverse_complement_seq(seq, false, CasingOption::Uppercase);
        assert_eq!(rev_comp, "TACGGCAT");
    }

    #[test]
    fn test_gc_content_calculation() {
        let dna = "ATGCATGC";
        let stats = calculate_single_sequence_stats(dna, "seq1".to_string());
        assert_eq!(stats.length, 8);
        assert_eq!(stats.gc_count, 4);
        assert!((stats.gc_percent - 50.0).abs() < 1e-5);
    }
}
