import fs from 'node:fs';
import { parsePdbAtoms, buildStructureComparisonPairs } from '../src/utils/proteinStudio.ts';

const afText = fs.readFileSync('/tmp/af-p0dtc9-current.pdb', 'utf8');
const afAtoms = parsePdbAtoms(afText);
const makeDetail = (pdbId, accession, canonicalLength, entityPath, instancePath) => {
const entity = JSON.parse(fs.readFileSync(entityPath, 'utf8'));
const instance = JSON.parse(fs.readFileSync(instancePath, 'utf8'));
const alignment = entity.rcsb_polymer_entity_align[0].aligned_regions[0];
const instanceIds = instance.rcsb_polymer_entity_instance_container_identifiers;
const mappings = instanceIds.auth_to_entity_poly_seq_mapping.map((authorResidueNumber, index) => ({
  asymId: instanceIds.asym_id, authorChainId: instanceIds.auth_asym_id, authorResidueNumber: String(authorResidueNumber), entitySequenceIndex: index + 1,
  canonicalPosition: index + 1 >= alignment.entity_beg_seq_id && index + 1 < alignment.entity_beg_seq_id + alignment.length ? alignment.ref_beg_seq_id + index + 1 - alignment.entity_beg_seq_id : undefined,
}));
return { pdbId, uniprotAccession: accession, entityId: String(instanceIds.entity_id), entityIds: [String(instanceIds.entity_id)], asymIds: [String(instanceIds.asym_id)], chains: [String(instanceIds.auth_asym_id)], mappingSource: 'RCSB_UNIPROT', mappingConfidence: 'CURATED', mappingStatus: 'MAPPED_EXPLICITLY', canonicalLength, constructLength: entity.entity_poly.pdbx_seq_one_letter_code_can.replace(/[^A-Za-z]/g, '').length, canonicalSegments: [{ entityStart: alignment.entity_beg_seq_id, canonicalStart: alignment.ref_beg_seq_id, length: alignment.length }], residueMappings: mappings, otherMolecules: [], notes: [] };
};
const run = (detail, pdbPath, alphaAtoms = afAtoms) => {
  const result = buildStructureComparisonPairs(alphaAtoms, parsePdbAtoms(fs.readFileSync(pdbPath, 'utf8')), detail, detail.chains[0], alphaAtoms.map((atom) => atom.aa).join(''));
  if (detail.pdbId === '6M3M' && detail.chains[0] === 'A') fs.writeFileSync('/tmp/6m3m-matched-pairs.json', JSON.stringify(result.pairs.map((pair) => ({ reference: pair.alphaFold, mobile: pair.experimental, canonicalPosition: pair.canonicalPosition, authorResidueNumber: pair.authorResidueNumber })), null, 2));
  console.log(JSON.stringify({ pairs: result.pairs.length, excluded: result.excludedCanonicalPositions, rmsd: result.rmsd, max: result.maxDisplacement, top5: [...result.displacements].sort((a, b) => b.value - a.value).slice(0, 5) }, null, 2));
};
run(makeDetail('6M3M', 'P0DTC9', 419, '/tmp/6m3m-entity.json', '/tmp/6m3m-instance-a.json'), '/tmp/6m3m.pdb');
run(makeDetail('6M3M', 'P0DTC9', 419, '/tmp/6m3m-entity.json', '/tmp/6m3m-instance-b.json'), '/tmp/6m3m.pdb');
run(makeDetail('6WZO', 'P0DTC9', 419, '/tmp/6wzo-entity.json', '/tmp/6wzo-instance-a.json'), '/tmp/6wzo.pdb');
run(makeDetail('1TSR', 'P04637', 393, '/tmp/1tsr-entity-3.json', '/tmp/1tsr-instance-C.json'), '/tmp/1tsr.pdb', parsePdbAtoms(fs.readFileSync('/tmp/af-p04637.pdb', 'utf8')));
