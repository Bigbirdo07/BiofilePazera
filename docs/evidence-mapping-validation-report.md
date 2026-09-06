# Evidence Mapping Validation Report

## Current Mapping Pipeline

`Active UniProt accession -> UniProt curated PDB cross-reference -> RCSB entry -> all polymer entities -> explicit UniProt mapping -> SIFTS canonical ranges -> evidence card.`

## RCSB Endpoints Used

- `core/entry/{pdbId}` for experiment, resolution, release date, and entity lists.
- `core/polymer_entity/{pdbId}/{entityId}` for explicit UniProt references, entity sequences, asym IDs, author chains, and `rcsb_polymer_entity_align`.
- `core/nonpolymer_entity/{pdbId}/{entityId}` for molecule contents.

## P0DTC9 Live Results

UniProt reports canonical length **419 aa**. Live RCSB polymer-entity metadata was retrieved for all six requested entries. Every entry had an explicit SIFTS UniProt mapping to P0DTC9 in entity 1. Each had four author chains except 6WJI, which had six.

| PDB | UniProt mapping present upstream? | Entity | Author chains | Deposited length | Canonical range | BioFile status | Correct? |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| 6M3M | Yes, SIFTS P0DTC9 | 1 | A, B, C, D | 136 | 41–174 | MAPPED_EXPLICITLY after fix | Yes |
| 6VYO | Yes, SIFTS P0DTC9 | 1 | A, B, C, D | 128 | 47–173 | MAPPED_EXPLICITLY after fix | Yes |
| 6WJI | Yes, SIFTS P0DTC9 | 1 | A, B, C, D, E, F | 121 | 257–364 | MAPPED_EXPLICITLY after fix | Yes |
| 6WKP | Yes, SIFTS P0DTC9 | 1 | A, B, C, D | 128 | 47–173 | MAPPED_EXPLICITLY after fix | Yes |
| 6WZO | Yes, SIFTS P0DTC9 | 1 | A, B, C, D | 121 | 247–364 | MAPPED_EXPLICITLY after fix | Yes |
| 6WZQ | Yes, SIFTS P0DTC9 | 1 | A, B, C, D | 137 | 247–364 | MAPPED_EXPLICITLY after fix | Yes |

### 6M3M Result

**BIOFILE_MAPPING_BUG** was the pre-fix classification. RCSB identifies entity 1, chains A–D, a 136-residue deposited construct, and SIFTS aligned residues 41–174 of P0DTC9. The previous BioFile result was false because it read `database` instead of RCSB's `database_name`.

### 6VYO Result

**BIOFILE_MAPPING_BUG** was the pre-fix classification. RCSB identifies entity 1, chains A–D, a 128-residue deposited construct, and SIFTS aligned residues 47–173 of P0DTC9.

### 6WJI, 6WKP, 6WZO, 6WZQ

All four also expose explicit SIFTS mappings in entity 1. Their mapped ranges are listed above. Their deposited fragments cover different regions of the 419-aa canonical protein; they are not full-length structures.

## Positive Mapping Controls

The automated fixture covers explicit UniProt mapping, multiple author chains for one entity, an additional polymer, a non-polymer ion, and an authoritative SIFTS range. The live P0DTC9 set provides six additional explicit controls.

## Negative Mapping Control

The parser fixture with no usable RCSB payload returns `PARSER_ERROR`; a retrieved payload with no active-accession mapping returns `NO_UNIPROT_MAPPING_IN_RCSB`. Network failure is separately represented as `NETWORK_ERROR`.

## Bugs Found

The parser checked `reference_sequence_identifiers.database`, while RCSB returns `database_name`. It also selected only the first matching entity and ignored SIFTS canonical alignment ranges.

## Fixes Applied

- Read RCSB `database_name` and `uniprot_ids` explicitly.
- Match all valid entities for the active accession.
- Preserve entity IDs, asym IDs, and author chains separately.
- Use RCSB SIFTS aligned regions for canonical ranges.
- Distinguish mapping unavailable, canonical-range unavailable, parser, and network failures.
- Keep structure opening available even when mapping metadata is unavailable.

## UI Wording Changes

Cards now use calm `Canonical mapping` status text and explain that UniProt-linked evidence does not automatically establish canonical residue numbering. Repeated generic warnings are no longer used as the primary card presentation.

## Automated Tests

`npm run test:protein-studio`: PASS. The fixture covers explicit mapping, multiple chains, canonical SIFTS range, no mapping, and network-error status.

`npm run build`: PASS.

`cargo fmt --check`: PASS.

`cargo clippy --all-targets --all-features -- -D warnings`: PASS.

`cargo test`: PASS, 107 tests.

## Manual RCSB Validation

Live RCSB API validation was executed for all six P0DTC9 entries, including 6M3M and 6VYO. Official RCSB structure pages were also used to cross-check the 6VYO method and the 6M3M validation record. Full in-app visual verification is **NOT EXECUTED** in this pass because the existing local Vite/Tauri port was occupied but unreachable from the command shell.

## Remaining Limitations

Exact resolved-versus-unresolved residue parsing, insertion-code handling, and residue-level sequence differences are not implemented in this pass. The current canonical coverage is based on RCSB SIFTS aligned ranges. Full structural alignment and RMSD remain deferred.

## Final Classification

**BIOFILE RCSB MAPPING IMPLEMENTATION GAP**

The original P0DTC9 screenshot showed a conservative failure caused by BioFile reading the wrong RCSB field, not by missing upstream mapping.
