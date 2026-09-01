use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgressPayload {
    pub job_id: String,
    pub status: JobStatus,
    pub bytes_processed: u64,
    pub total_bytes: u64,
    pub records_processed: u64,
    pub percentage: f64,
    pub elapsed_ms: u64,
    pub message: String,
}
