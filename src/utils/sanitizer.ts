/**
 * Utility to sanitize user feedback strings, removing sensitive biological sequences and full file paths.
 */
export function sanitizeFeedbackText(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // 1. Redact long DNA/RNA/Protein sequences (strings of A,C,G,T,U,N >= 15 chars)
  sanitized = sanitized.replace(/\b[ACGTUNacgtun]{15,}\b/g, '[REDACTED_NUCLEOTIDE_SEQUENCE]');

  // 2. Redact long protein amino acid sequences (uppercase letters >= 20 chars)
  sanitized = sanitized.replace(/\b[A-Z]{20,}\b/g, '[REDACTED_PROTEIN_SEQUENCE]');

  // 3. Redact absolute file paths (Unix and Windows style paths)
  sanitized = sanitized.replace(/\/(?:[^\/\s]+\/)+[^\/\s]+/g, '[REDACTED_FILE_PATH]');
  sanitized = sanitized.replace(/[A-Za-z]:\\(?:[^\s\\]+\\)+[^\s\\]+/g, '[REDACTED_FILE_PATH]');

  return sanitized;
}
