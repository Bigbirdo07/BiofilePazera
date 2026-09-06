# PazAtlas Web Feature Matrix

This matrix describes the current public browser product. Hidden or archived features are intentionally not advertised.

| Capability | Classification | Notes |
|---|---|---|
| Home and local EGFR preview | FULLY_BROWSER_SUPPORTED | Loads `/demo-structures/P00533_EGFR_AlphaFold.pdb`; no scientific database request is required for the preview. |
| Sequence transforms | FULLY_BROWSER_SUPPORTED | Reverse, complement, reverse-complement, DNA/RNA conversion, translation, and six-frame translation run in the browser fallback. |
| Sequence statistics | FULLY_BROWSER_SUPPORTED | Local sequence statistics and composition calculations are available in the browser workflow. |
| Protein Studio identity and sequence relationship | BROWSER_SUPPORTED_WITH_ONLINE_SERVICE | Reference sequence and annotation lookup requires explicit UniProt requests. |
| Protein Studio AlphaFold model | BROWSER_SUPPORTED_WITH_ONLINE_SERVICE | Explicit AlphaFold DB metadata, coordinate, and confidence requests are browser-direct; production-origin CORS remains pending. |
| Protein Studio local structure viewing | FULLY_BROWSER_SUPPORTED | Local PDB/mmCIF content can be parsed and rendered with NGL. |
| Protein Studio experimental evidence | BROWSER_SUPPORTED_WITH_ONLINE_SERVICE | RCSB metadata, coordinates, and mapping-associated records are requested on demand. |
| Structural comparison | BROWSER_SUPPORTED_WITH_ONLINE_SERVICE | Uses loaded/mapped AlphaFold and experimental coordinates; external retrieval may be required. |
| Unified residue inspection | BROWSER_SUPPORTED_WITH_ONLINE_SERVICE | Available for loaded coordinate and mapping data; coverage depends on the source structure. |
| Mutation Inspector | FULLY_BROWSER_SUPPORTED | Descriptive residue/property context; it does not predict effects, stability, pathogenicity, or mutant structures. |
| Browser protein-property fallback | FULLY_BROWSER_SUPPORTED | Browser fallback is available; desktop Rust-backed calculations may differ in implementation and should be interpreted within the current beta. |
| How PazAtlas Works | FULLY_BROWSER_SUPPORTED | Static educational content; no external requests on page load. |
| About and contact links | FULLY_BROWSER_SUPPORTED | Static content and `mailto:` links. |
| FASTQ QC | NOT_PUBLICLY_EXPOSED | UI is archived; shared FASTQ engine/tests remain in production source where needed. |
| File Tools UI | NOT_PUBLICLY_EXPOSED | Source is preserved, but it is not imported into the public app. |
| Tauri filesystem operations | DESKTOP_ONLY | Native file dialogs and Rust filesystem commands require the desktop runtime. |

The matrix does not claim production-domain CORS compatibility until the deployed HTTPS origin is tested.
