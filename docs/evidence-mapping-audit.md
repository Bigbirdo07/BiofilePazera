# Experimental Evidence Mapping Audit

## Current Endpoints

Protein Studio starts from the active UniProt accession and the curated PDB cross-references returned by UniProt. For each PDB ID it calls:

1. `https://data.rcsb.org/rest/v1/core/entry/{pdbId}`
2. `https://data.rcsb.org/rest/v1/core/polymer_entity/{pdbId}/{entityId}` for every entry polymer entity
3. `https://data.rcsb.org/rest/v1/core/nonpolymer_entity/{pdbId}/{entityId}` for non-polymer contents

The entry response supplies experiment, resolution, release date, and entity ID lists. Polymer-entity responses supply deposited sequence, entity/asym/author-chain identifiers, UniProt references, and SIFTS alignment ranges.

## Current Mapping Fields

Mapping is accepted only when a polymer entity explicitly reports the active accession through `rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers` or `uniprot_ids`. The RCSB field is `database_name` (with `database` retained as a fixture/backward-compatible alias), not only `database`.

Canonical ranges use `rcsb_polymer_entity_align` entries whose reference database is UniProt and whose accession matches the active accession. Entity IDs, internal asym IDs, and author chain IDs are kept separately.

## Failure Conditions

- `MAPPED_EXPLICITLY`: one explicit mapped entity with author-chain instances.
- `MULTIPLE_AMBIGUOUS_ENTITIES`: more than one entity explicitly maps to the accession.
- `CHAIN_INSTANCE_AMBIGUOUS`: an explicit entity mapping has no author-chain instances.
- `CANONICAL_RANGE_UNAVAILABLE`: the entity maps explicitly, but no canonical range is supplied.
- `NO_UNIPROT_MAPPING_IN_RCSB`: the RCSB payload was retrieved but contains no explicit match.
- `NETWORK_ERROR`: entry/entity metadata could not be retrieved.
- `PARSER_ERROR`: no usable RCSB payload was available without a network-error override.

## Potential Missing RCSB Fields / Endpoints

The current pass does not yet retrieve polymer-entity-instance residue tables or parse deposited missing-residue categories, insertion codes, author numbering, and residue-level identity differences. Exact resolved-versus-unresolved coordinate reporting remains a separate limitation. The parser does use the authoritative SIFTS canonical alignment ranges when available rather than guessing from length or raw PDB numbering.

## Known Safe Fallbacks

No sequence-similarity, name, length, first-chain, or alphabetical-chain fallback is used. A linked PDB can still be opened in NGL when mapping details are unavailable. Molecule metadata is independent of protein-chain mapping.
