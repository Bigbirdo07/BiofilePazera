use serde::{Deserialize, Serialize};
use std::io::BufRead;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastqRecord {
    pub header: String,
    pub sequence: String,
    pub separator: String,
    pub quality: String,
    pub record_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastqParseError {
    pub record_number: u64,
    pub message: String,
    pub line_number: u64,
}

pub struct FastqStreamReader<R: BufRead> {
    reader: R,
    record_counter: u64,
    line_counter: u64,
    finished: bool,
}

impl<R: BufRead> FastqStreamReader<R> {
    pub fn new(reader: R) -> Self {
        Self {
            reader,
            record_counter: 0,
            line_counter: 0,
            finished: false,
        }
    }

    /// Reads next FASTQ record, supporting wrapped multi-line sequence and quality lines.
    pub fn next_record(&mut self) -> Result<Option<FastqRecord>, FastqParseError> {
        if self.finished {
            return Ok(None);
        }

        let mut line_buf = String::new();

        // 1. Find header starting with '@'
        let header = loop {
            line_buf.clear();
            let n = self
                .reader
                .read_line(&mut line_buf)
                .map_err(|e| FastqParseError {
                    record_number: self.record_counter + 1,
                    message: format!("IO error reading header: {}", e),
                    line_number: self.line_counter,
                })?;

            if n == 0 {
                self.finished = true;
                return Ok(None);
            }
            self.line_counter += 1;

            let trimmed = line_buf.trim();
            if trimmed.is_empty() {
                continue;
            }

            if trimmed.starts_with('@') {
                break trimmed.to_string();
            } else {
                return Err(FastqParseError {
                    record_number: self.record_counter + 1,
                    message: format!(
                        "Expected FASTQ header starting with '@', found: {}",
                        trimmed
                    ),
                    line_number: self.line_counter,
                });
            }
        };

        self.record_counter += 1;

        // 2. Accumulate sequence lines until '+' separator line
        let mut sequence_buf = String::new();
        let separator: String;

        loop {
            line_buf.clear();
            let n = self
                .reader
                .read_line(&mut line_buf)
                .map_err(|e| FastqParseError {
                    record_number: self.record_counter,
                    message: format!("IO error reading sequence: {}", e),
                    line_number: self.line_counter,
                })?;

            if n == 0 {
                return Err(FastqParseError {
                    record_number: self.record_counter,
                    message: "Unexpected end of file while reading sequence lines".to_string(),
                    line_number: self.line_counter,
                });
            }
            self.line_counter += 1;

            let trimmed = line_buf.trim();
            if trimmed.starts_with('+') {
                separator = trimmed.to_string();
                break;
            } else {
                sequence_buf.push_str(trimmed);
            }
        }

        // 3. Accumulate quality lines until quality.len() == sequence.len()
        let mut quality_buf = String::new();
        let target_len = sequence_buf.len();

        while quality_buf.len() < target_len {
            line_buf.clear();
            let n = self
                .reader
                .read_line(&mut line_buf)
                .map_err(|e| FastqParseError {
                    record_number: self.record_counter,
                    message: format!("IO error reading quality lines: {}", e),
                    line_number: self.line_counter,
                })?;

            if n == 0 {
                return Err(FastqParseError {
                    record_number: self.record_counter,
                    message: format!(
                        "Incomplete quality string: expected {} characters, got {}",
                        target_len,
                        quality_buf.len()
                    ),
                    line_number: self.line_counter,
                });
            }
            self.line_counter += 1;

            let trimmed = line_buf.trim_end_matches(&['\r', '\n'][..]);
            quality_buf.push_str(trimmed);
        }

        // 4. Verify length match
        if quality_buf.len() != target_len {
            return Err(FastqParseError {
                record_number: self.record_counter,
                message: format!(
                    "Sequence and Quality length mismatch: sequence is {} bases, quality is {} characters",
                    target_len,
                    quality_buf.len()
                ),
                line_number: self.line_counter,
            });
        }

        Ok(Some(FastqRecord {
            header,
            sequence: sequence_buf,
            separator,
            quality: quality_buf,
            record_number: self.record_counter,
        }))
    }
}
