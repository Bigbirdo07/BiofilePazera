use serde::{Deserialize, Serialize};
use std::io::BufRead;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastaRecord {
    pub header: String,
    pub sequence: String,
    pub record_number: u64,
}

pub struct FastaStreamReader<R: BufRead> {
    reader: R,
    current_line: String,
    record_counter: u64,
    finished: bool,
}

impl<R: BufRead> FastaStreamReader<R> {
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            current_line: String::new(),
            record_counter: 0,
            finished: false,
        }
    }

    /// Reads the next complete FASTA record from the input stream.
    pub fn next_record(&mut self) -> std::io::Result<Option<FastaRecord>> {
        if self.finished {
            return Ok(None);
        }

        // If current_line is empty, read until we find a line starting with '>'
        if self.current_line.is_empty() {
            loop {
                self.current_line.clear();
                let n = self.reader.read_line(&mut self.current_line)?;
                if n == 0 {
                    self.finished = true;
                    return Ok(None);
                }
                let trimmed = self.current_line.trim();
                if !trimmed.is_empty() && trimmed.starts_with('>') {
                    break;
                }
            }
        }

        let header = self.current_line.trim().to_string();
        self.current_line.clear();
        let mut sequence_buf = String::new();

        loop {
            let n = self.reader.read_line(&mut self.current_line)?;
            if n == 0 {
                self.finished = true;
                break;
            }
            let trimmed = self.current_line.trim();
            if trimmed.starts_with('>') {
                // Next header reached
                break;
            }
            if !trimmed.is_empty() {
                sequence_buf.push_str(trimmed);
            }
            self.current_line.clear();
        }

        self.record_counter += 1;
        Ok(Some(FastaRecord {
            header,
            sequence: sequence_buf,
            record_number: self.record_counter,
        }))
    }
}
