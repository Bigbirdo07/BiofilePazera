use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChecksumResult {
    pub file_name: String,
    pub file_size_bytes: u64,
    pub sha256_hash: String,
}

/// Calculates SHA-256 checksum over a file in a single streaming pass.
pub fn calculate_file_sha256<P: AsRef<Path>>(path: P) -> std::io::Result<ChecksumResult> {
    let file_name = path
        .as_ref()
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let file = File::open(&path)?;
    let file_size_bytes = file.metadata()?.len();
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536]; // 64 KB buffer

    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let hash_bytes = hasher.finalize();
    let sha256_hash = hex::encode(hash_bytes);

    Ok(ChecksumResult {
        file_name,
        file_size_bytes,
        sha256_hash,
    })
}

/// Verifies whether a given file matches an expected SHA-256 string.
pub fn verify_file_sha256<P: AsRef<Path>>(path: P, expected_hash: &str) -> std::io::Result<bool> {
    let result = calculate_file_sha256(path)?;
    Ok(result
        .sha256_hash
        .eq_ignore_ascii_case(expected_hash.trim()))
}
