use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
pub struct JobManager {
    cancellation_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl JobManager {
    pub fn new() -> Self {
        Self {
            cancellation_tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Registers a new job and returns a cancellation token.
    pub fn create_job(&self, job_id: &str) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        let mut map = self.cancellation_tokens.lock().unwrap();
        map.insert(job_id.to_string(), token.clone());
        token
    }

    /// Signals a job to cancel.
    pub fn cancel_job(&self, job_id: &str) -> bool {
        let map = self.cancellation_tokens.lock().unwrap();
        if let Some(token) = map.get(job_id) {
            token.store(true, Ordering::SeqCst);
            true
        } else {
            false
        }
    }

    /// Removes a finished job token.
    pub fn remove_job(&self, job_id: &str) {
        let mut map = self.cancellation_tokens.lock().unwrap();
        map.remove(job_id);
    }
}
