# Archived FASTQ QC UI

FASTQ QC was removed from the primary BioFile interface during product simplification. The implementation is preserved for possible future restoration.

## Files Archived

- `Inspect.tsx` preserves the former FASTQ QC and motif-search interface.

## Route Previously Used

The page was previously rendered through the internal `inspect` view state. It is no longer exposed by the application navigation or active routes.

## Navigation Entry Removed

The FASTQ QC entry was removed from the main navigation and Home tool cards. The How BioFile Works guide no longer advertises it as an active workflow.

## Shared Engine Dependencies

FASTQ parsing, quality calculations, gzip handling, record validation, and related Rust commands remain in their normal production locations under `src/services`, `src-tauri/src/bio`, and `src-tauri/src/commands`. These shared modules were not moved or rewritten.

## Tests Preserved

Existing shared logic tests remain in the project. No scientific FASTQ engine tests were removed for this UI archival.

## How To Restore

1. Import `Inspect` from this directory in `App.tsx`.
2. Restore an internal view state and route rendering.
3. Restore a navigation entry and any desired Home/guide references.
4. Run `npm test`, `npm run build`, and the relevant browser checks.
