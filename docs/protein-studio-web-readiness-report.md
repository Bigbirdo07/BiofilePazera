# Protein Studio Web Readiness Report

## Browser Acceptance Tests

| Case | Result | Notes |
| --- | --- | --- |
| P01308 | NOT EXECUTED | Existing online workflow retained; full post-NGL browser pass still required |
| P04637 | NOT EXECUTED | Existing online workflow retained; full post-NGL browser pass still required |
| 1UBQ | PASS | Live webpage rendered 76 residues with NGL at 1440x900 and smaller desktop width |
| 1CRN | PASS | Live webpage rendered 46 residues with experimental semantics and no pLDDT |

## NGL Visual QA

PASS for live 1UBQ: recognizable cartoon geometry, smooth helices/sheets, centered camera, high-quality WebGL canvas, and responsive NGL canvas creation. NGL is dynamically loaded only when a coordinate-bearing structure is present.

## Mutation Selection

NOT EXECUTED in this pass. NGL picking is wired to the existing residue-selection callback and highlight representation, but direct mutation interaction requires a dedicated browser acceptance run.

## State Transitions

NOT EXECUTED in this pass. Existing Protein Studio state-reset logic was not changed. NGL component replacement and click-handler cleanup were added for structure changes.

## Responsive Layout

PASS for live 1280x800 smoke test. Full 1440x900, 1024x768, and 800px matrix: NOT EXECUTED.

## NGL Dynamic Loading

PASS. Production build emitted a separate `ngl.esm-BTn5Gtnz.js` chunk. The main JavaScript output was 366.88 kB (103.07 kB gzip); the NGL chunk was 1,312.85 kB (371.46 kB gzip). The initial bundle is substantially smaller than the prior 1,673.81 kB main bundle.

## Legacy Canvas Removal

FAIL. The visible Canvas renderer was replaced by NGL, but obsolete Canvas projection code remains inside `Pdb3DViewer.tsx` and should be removed in a follow-up cleanup.

## Resource Cleanup

PASS for the NGL lifecycle changes: old components are removed before replacement, resize observers disconnect, click handlers are removed, late loads are cancelled, and the Stage is disposed on unmount. A 20-switch performance check was NOT EXECUTED.

## Offline Test

NOT EXECUTED in this pass.

## Network Recovery

NOT EXECUTED in this pass.

## Privacy Check

PASS by code inspection. The online lookup flow sends accession/database requests after explicit user action; the local FASTA/PDB content is not sent by that lookup path.

## Web Deployment

DEPLOYMENT PREPARED — ACCOUNT AUTHORIZATION REQUIRED. See `docs/web-deployment.md`. No domain or hosting credentials were changed.

## Production Smoke Test

NOT EXECUTED against a deployed HTTPS site. Local production build: PASS.

## Regression Tests

- `npm run build`: PASS
- `npm run test:protein-studio`: PASS
- `cargo fmt --check`: PASS
- `cargo clippy --all-targets --all-features -- -D warnings`: PASS
- `cargo test`: PASS, 107 tests
- `git diff --check`: PASS

## Git Commit

NOT EXECUTED. Changes remain uncommitted. User-added FASTA files were left untouched.

## Known Limitations

Full four-protein post-NGL browser validation, offline/recovery testing, accessibility pass, 20-switch performance check, deployment smoke test, and obsolete Canvas code removal remain before final web-readiness sign-off.
