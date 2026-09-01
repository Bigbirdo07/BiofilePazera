use flate2::read::GzDecoder;
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

#[derive(Debug, PartialEq, Eq, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum FileCompression {
    Plain,
    Gzip,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum SequenceFormat {
    Fasta,
    Fastq,
    Unknown,
}

/// Detects if a file is Gzip-compressed by reading its magic bytes (0x1F 0x8B).
pub fn detect_compression<P: AsRef<Path>>(path: P) -> std::io::Result<FileCompression> {
    let mut file = File::open(path)?;
    let mut magic = [0u8; 2];
    let n = file.read(&mut magic)?;
    if n == 2 && magic[0] == 0x1F && magic[1] == 0x8B {
        Ok(FileCompression::Gzip)
    } else {
        Ok(FileCompression::Plain)
    }
}

/// Creates a transparent buffered reader over plain text or gzip-compressed files.
pub fn create_buffered_reader<P: AsRef<Path>>(
    path: P,
) -> std::io::Result<(Box<dyn BufRead>, FileCompression)> {
    let compression = detect_compression(&path)?;
    let file = File::open(&path)?;

    let reader: Box<dyn BufRead> = match compression {
        FileCompression::Gzip => {
            let decoder = GzDecoder::new(file);
            Box::new(BufReader::new(decoder))
        }
        FileCompression::Plain => Box::new(BufReader::new(file)),
    };

    Ok((reader, compression))
}

/// Detects format (FASTA vs FASTQ) by inspecting the first non-empty header character.
pub fn detect_format_from_reader(reader: &mut Box<dyn BufRead>) -> std::io::Result<SequenceFormat> {
    let mut line = String::new();
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line)?;
        if bytes_read == 0 {
            return Ok(SequenceFormat::Unknown);
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with('>') {
            return Ok(SequenceFormat::Fasta);
        } else if trimmed.starts_with('@') {
            return Ok(SequenceFormat::Fastq);
        } else {
            return Ok(SequenceFormat::Unknown);
        }
    }
}
