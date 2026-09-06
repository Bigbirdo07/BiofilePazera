# Browser API Dependencies

PazAtlas currently makes browser-direct requests only after an explicit Protein Studio action. No production-domain CORS claim is made here until the deployed site is tested from its final origin.

| Service | Purpose | Request type | Current endpoint family | Browser CORS required | Local result | Production verification |
|---|---|---|---|---|---|---|
| UniProt | Protein metadata, canonical sequence, and annotations | HTTPS `fetch` | `rest.uniprot.org/uniprotkb/*` | Yes | Requests are implemented and handled in Protein Studio | Required |
| AlphaFold DB | Model metadata, coordinates, and confidence data | HTTPS `fetch` | `alphafold.ebi.ac.uk/api/prediction/*` and returned coordinate/PAE URLs | Yes | Explicit retrieval path is implemented | Required |
| RCSB PDB | Entry, entity, chain metadata, and coordinates | HTTPS `fetch` | `data.rcsb.org/rest/v1/core/*` and `files.rcsb.org/download/*` | Yes | Evidence and structure requests are implemented | Required |
| SIFTS-associated mapping | Canonical residue mapping through RCSB polymer metadata | HTTPS `fetch` through RCSB metadata | RCSB polymer entity and instance records | Yes | Mapping parser and evidence UI are implemented | Required |

## Failure Handling

Protein Studio distinguishes retrieval failures from unsupported or unavailable mappings in its user-facing error and evidence states. Production testing should confirm that blocked CORS, rate limits, offline requests, HTTP errors, malformed responses, and empty results remain clearly separated.

## Data Boundary

The browser sends requested accession identifiers to these public services. The current lookup path does not upload local FASTA or PDB contents to UniProt, AlphaFold DB, or RCSB. Local file processing remains dependent on the runtime: browser-side operations run in the browser, while Tauri-only filesystem commands require the desktop application.
