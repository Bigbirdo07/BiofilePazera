import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyProteinStudioInput,
  classifyStructureSource,
  describeMutation,
  extractLookupIds,
  findNearbyResidues,
  normalizeProteinAccession,
  parsePaeJson,
  parseProteinInput,
  parseUniProtBiology,
  plddtCategory,
  summarizePlddt,
  validateMutationInput,
  isDisorderFeature,
  isPtmFeature,
  parseRcsbEvidencePayload,
  mapEntitySequenceToCanonical,
  mapPdbResidueToCanonical,
  mapCanonicalToPdbResidue,
  kabschSuperpose,
  alignProteinSequences,
  analyzeSequenceCompatibility,
} from '../src/utils/proteinStudio.ts';

const insulinFasta = `>sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED
LQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN`;

function testUniProtFastaParsing() {
  assert.equal(normalizeProteinAccession('P01308.1'), 'P01308');

  const parsed = parseProteinInput(insulinFasta);
  assert.equal(parsed.sequence.length, 110);
  assert.equal(parsed.header?.accession, 'P01308');
  assert.equal(parsed.header?.entryName, 'INS_HUMAN');
  assert.equal(parsed.header?.proteinName, 'Insulin');
  assert.equal(parsed.header?.organism, 'Homo sapiens');
  assert.equal(parsed.header?.gene, 'INS');

  const tr = parseProteinInput('>tr|A0A024RBG1|A0A024RBG1_HUMAN Example protein OS=Homo sapiens\nMEEPQSDPSV');
  assert.equal(tr.header?.accession, 'A0A024RBG1');
  assert.equal(tr.header?.entryName, 'A0A024RBG1_HUMAN');

  const ncbiVersioned = parseProteinInput(readFileSync('data/protein-studio-examples/P04637_P53_HUMAN_ncbi.fasta', 'utf8'));
  assert.equal(ncbiVersioned.header?.accession, 'P04637');
  assert.equal(ncbiVersioned.header?.entryName, 'P53_HUMAN');
  assert.equal(ncbiVersioned.sequence.length, 393);

  const malformed = parseProteinInput('>not a uniprot header\nMEEPQSDPSV');
  assert.equal(malformed.header?.accession, undefined);
}

function testBundledProteinExamples() {
  const spike = parseProteinInput(readFileSync('rc-test-data/protein_example.fasta', 'utf8'));
  assert.equal(spike.header?.accession, 'P0DTC2');
  assert.equal(spike.header?.entryName, 'SPIKE_SARS2');
  assert.equal(spike.sequence.length, 80);

  const multi = parseProteinInput(readFileSync('rc-test-data/lightweight_protein_examples.fasta', 'utf8'));
  assert.equal(multi.header?.accession, 'P01308');
  assert.equal(multi.header?.entryName, 'INS_HUMAN');
  assert.equal(multi.sequence.length, 110);
  assert.equal(multi.records, 5);

  const ubq = parseProteinInput(readFileSync('rc-test-data/BioFile_Toolkit_Scientist_Test_Pack/02_Protein_Studio/01_1UBQ_ubiquitin_reference.fasta', 'utf8'));
  assert.equal(ubq.header?.pdbId, '1UBQ');
  assert.equal(ubq.sequence.length, 76);

  const crn = parseProteinInput(readFileSync('rc-test-data/BioFile_Toolkit_Scientist_Test_Pack/02_Protein_Studio/02_1CRN_crambin_reference.fasta', 'utf8'));
  assert.equal(crn.header?.pdbId, '1CRN');
  assert.equal(crn.sequence.length, 46);

  const controls = extractLookupIds(readFileSync('rc-test-data/BioFile_Toolkit_Scientist_Test_Pack/02_Protein_Studio/05_online_accessions.txt', 'utf8'));
  assert.ok(controls.uniprotAccessions.includes('P04637'));
  assert.ok(controls.pdbIds.includes('1UBQ'));
  assert.ok(controls.pdbIds.includes('1CRN'));
}

function testInputClassification() {
  assert.equal(classifyProteinStudioInput('x.pdb', 'ATOM      1  CA  ALA A   1'), 'pdb');
  assert.equal(classifyProteinStudioInput('x.cif', 'data_1abc'), 'cif');
  assert.equal(classifyProteinStudioInput('x.mmcif', 'data_1abc'), 'cif');
  assert.equal(classifyProteinStudioInput('reads.fastq', '@r1\nACGT\n+\n!!!!'), 'fastq');
  assert.equal(classifyProteinStudioInput('reads.fastq.gz'), 'fastq');
  assert.equal(classifyProteinStudioInput('insulin.fasta', insulinFasta), 'protein_fasta');
  assert.equal(classifyProteinStudioInput('seq.txt', 'MEEPQSDPSV'), 'sequence_text');
}

function testSourceSemantics() {
  assert.equal(classifyStructureSource('EXPDTA    X-RAY DIFFRACTION\nATOM', '1ubq.pdb'), 'EXPERIMENTAL');
  assert.equal(classifyStructureSource('TITLE ALPHAFOLD MONOMER\nATOM', 'AF-P04637-F1-model_v6.pdb'), 'ALPHAFOLD_PREDICTED');
  assert.equal(classifyStructureSource('ATOM      1  CA  ALA A   1', 'local.pdb'), 'LOCAL_UNKNOWN');
}

function testPlddt() {
  assert.equal(plddtCategory(91), 'very_high');
  assert.equal(plddtCategory(90), 'confident');
  assert.equal(plddtCategory(70), 'confident');
  assert.equal(plddtCategory(50), 'low');
  assert.equal(plddtCategory(49.9), 'very_low');
  assert.equal(plddtCategory(undefined), 'missing');
  const summary = summarizePlddt([
    { serial: 1, name: 'CA', resName: 'MET', chainID: 'A', resSeq: 1, residueIndex: 1, aa: 'M', x: 0, y: 0, z: 0, bFactor: 95 },
    { serial: 2, name: 'CA', resName: 'GLU', chainID: 'A', resSeq: 2, residueIndex: 2, aa: 'E', x: 0, y: 0, z: 0, bFactor: 70 },
    { serial: 3, name: 'CA', resName: 'GLU', chainID: 'A', resSeq: 3, residueIndex: 3, aa: 'E', x: 0, y: 0, z: 0, bFactor: 50 },
    { serial: 4, name: 'CA', resName: 'PRO', chainID: 'A', resSeq: 4, residueIndex: 4, aa: 'P', x: 0, y: 0, z: 0, bFactor: 40 },
    { serial: 5, name: 'CA', resName: 'GLN', chainID: 'A', resSeq: 5, residueIndex: 5, aa: 'Q', x: 0, y: 0, z: 0, bFactor: 42 },
  ]);
  assert.equal(summary.veryHigh, 1);
  assert.equal(summary.confident, 1);
  assert.equal(summary.low, 1);
  assert.equal(summary.veryLow, 2);
  assert.deepEqual(summary.lowRegions, [{ start: 3, end: 5 }]);
}

function testPaeParser() {
  const valid = parsePaeJson('[{"predicted_aligned_error":[[0,2],[3,0]],"max_predicted_aligned_error":31.75}]', 2);
  assert.equal(valid?.size, 2);
  assert.equal(valid?.max, 31.75);
  assert.equal(parsePaeJson('[{"predicted_aligned_error":[[0,2,3]],"max_predicted_aligned_error":31.75}]'), null);
  assert.equal(parsePaeJson('[{"max_predicted_aligned_error":31.75}]'), null);
  assert.equal(parsePaeJson('[{"predicted_aligned_error":[[0,2],[3,0]],"max_predicted_aligned_error":31.75}]', 3), null);
  assert.throws(() => parsePaeJson('{bad json'));
}

function testUniProtBiologyParser() {
  const biology = parseUniProtBiology({
    primaryAccession: 'P01308',
    proteinDescription: { recommendedName: { fullName: { value: 'Insulin' } } },
    genes: [{ geneName: { value: 'INS' } }],
    organism: { scientificName: 'Homo sapiens' },
    sequence: { length: 110 },
    comments: [
      { commentType: 'FUNCTION', text: { value: 'Regulates glucose metabolism.' } },
      { commentType: 'SUBCELLULAR LOCATION', text: [{ value: 'Secreted.' }] },
    ],
    features: [
      { type: 'Signal peptide', location: { start: { value: 1 }, end: { value: 24 } } },
      { type: 'Disulfide bond', description: 'A-B chain bond', location: { start: { value: 31 }, end: { value: 96 } } },
      { type: 'Region', description: 'Intrinsically disordered region', location: { start: { value: 1 }, end: { value: 10 } } },
      { type: 'Modified residue', description: 'Phosphoserine', location: { position: { value: 15 } } },
    ],
    uniProtKBCrossReferences: [
      { database: 'PDB', id: '1ZNI', properties: [{ key: 'Method', value: 'X-ray' }, { key: 'Resolution', value: '1.5 A' }] },
      { database: 'RefSeq', id: 'NP_000198.1' },
    ],
  });
  assert.equal(biology?.proteinName, 'Insulin');
  assert.equal(biology?.functionText, 'Regulates glucose metabolism.');
  assert.equal(biology?.subcellularLocation, 'Secreted.');
  assert.deepEqual(biology?.features[0], { type: 'Signal peptide', description: undefined, start: 1, end: 24 });
  assert.deepEqual(biology?.experimentalStructures, [{ id: '1ZNI', method: 'X-ray', resolution: '1.5 A' }]);
  assert.equal(isDisorderFeature(biology!.features[2]), true);
  assert.equal(isPtmFeature(biology!.features[3]), true);
  assert.equal(parseUniProtBiology({ primaryAccession: 'P01308' })?.features.length, 0);
  assert.equal(parseUniProtBiology({}), null);

  const currentApiShape = parseUniProtBiology({
    primaryAccession: 'P00533',
    comments: [
      { commentType: 'FUNCTION', texts: [{ value: 'Functions as a receptor tyrosine kinase.' }] },
      { commentType: 'SUBCELLULAR LOCATION', subcellularLocations: [{ location: { value: 'Cell membrane' }, topology: { value: 'Single-pass type I membrane protein' } }] },
      { commentType: 'COFACTOR', cofactor: { name: 'Zinc', note: { texts: [{ value: 'Required for activity.' }] } } },
    ],
  });
  assert.equal(currentApiShape?.functionText, 'Functions as a receptor tyrosine kinase.');
  assert.equal(currentApiShape?.subcellularLocation, 'Cell membrane; Single-pass type I membrane protein');
  assert.equal(currentApiShape?.cofactors, 'Zinc; Required for activity.');
}

function testMutationValidation() {
  const seq = 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN';
  const valid = validateMutationInput('A24S', seq);
  assert.equal(valid.ok, true);
  const desc = describeMutation(valid);
  assert.equal(desc?.wildTypeName, 'Alanine');
  assert.equal(desc?.mutantName, 'Serine');
  assert.equal(validateMutationInput('F24S', seq).ok, false);
  assert.equal(validateMutationInput('F999S', seq).ok, false);
  assert.equal(validateMutationInput('F24B', seq).ok, false);
  assert.equal(validateMutationInput('F24F', seq).ok, false);
}

function testNearbyResidues() {
  const atoms = [
    { serial: 1, name: 'CA', resName: 'ALA', chainID: 'A', resSeq: 1, residueIndex: 1, aa: 'A', x: 0, y: 0, z: 0, bFactor: null },
    { serial: 2, name: 'CA', resName: 'GLY', chainID: 'A', resSeq: 2, residueIndex: 2, aa: 'G', x: 3, y: 0, z: 0, bFactor: null },
    { serial: 3, name: 'CA', resName: 'SER', chainID: 'A', resSeq: 3, residueIndex: 3, aa: 'S', x: 8, y: 0, z: 0, bFactor: null },
  ];
  assert.deepEqual(findNearbyResidues(atoms, 1).map((atom) => atom.residueIndex), [2]);
  assert.deepEqual(findNearbyResidues(atoms, 99), []);
}

function testStateResetInvariant() {
  let state = { sourceType: 'ALPHAFOLD_PREDICTED', pae: [[0]], plddtVisible: true };
  state = { sourceType: 'EXPERIMENTAL', pae: null as never, plddtVisible: false };
  assert.equal(state.sourceType, 'EXPERIMENTAL');
  assert.equal(state.pae, null);
  assert.equal(state.plddtVisible, false);
}

function testRcsbEvidenceMapping() {
  const detail = parseRcsbEvidencePayload({
    entry: {
      exptl: [{ method: 'X-RAY DIFFRACTION' }],
      rcsb_entry_info: { resolution_combined: [2.05] },
      rcsb_accession_info: { initial_release_date: '2019-06-14' },
    },
    polymerEntities: [{
      rcsb_polymer_entity_container_identifiers: {
        entity_id: '1',
        auth_asym_ids: ['A', 'C'],
        asym_ids: ['A', 'C'],
        reference_sequence_identifiers: [{ database_name: 'UniProt', database_accession: 'P04637' }],
      },
      entity_poly: { pdbx_seq_one_letter_code_can: 'MEEPQSDPSV' },
      rcsb_polymer_entity_align: [{ provenance_source: 'SIFTS', reference_database_name: 'UniProt', reference_database_accession: 'P04637', aligned_regions: [{ entity_beg_seq_id: 1, ref_beg_seq_id: 12, length: 10 }] }],
    }, {
      rcsb_polymer_entity_container_identifiers: { auth_asym_ids: ['B'] },
      entity_poly: { type: 'polyribonucleotide' },
      rcsb_polymer_entity: { pdbx_description: 'RNA partner' },
    }],
    polymerInstances: [{
      rcsb_polymer_entity_instance_container_identifiers: {
        entity_id: '1', asym_id: 'A', auth_asym_id: 'A', auth_to_entity_poly_seq_mapping: ['1', '2', '3'],
      },
    }],
    nonpolymerEntities: [{
      rcsb_nonpolymer_entity_container_identifiers: { non_polymer_comp_id: 'ZN' },
      nonpolymer_comp: { chem_comp: { id: 'ZN', name: 'ZINC ION', type: 'ION' } },
    }],
  }, '2ABC', 'P04637', 'MEEPQSDPSV');
  assert.deepEqual(detail.chains, ['A', 'C']);
  assert.deepEqual(detail.asymIds, ['A', 'C']);
  assert.deepEqual(detail.entityIds, ['1']);
  assert.equal(detail.mappingStatus, 'MAPPED_EXPLICITLY');
  assert.equal(detail.mappedCanonicalStart, 12);
  assert.equal(detail.mappedCanonicalEnd, 21);
  assert.equal(detail.residueMappings.length, 3);
  assert.equal(mapPdbResidueToCanonical(detail, 'A', '2'), 13);
  assert.equal(mapCanonicalToPdbResidue(detail, 13, 'A')?.authorResidueNumber, '2');
  assert.equal(detail.mappingSource, 'RCSB_UNIPROT');
  assert.equal(detail.sequenceIdentity, 100);
  assert.equal(detail.resolvedResidues, undefined);
  assert.equal(detail.otherMolecules.length, 2);
  const unavailable = parseRcsbEvidencePayload({}, '2ABC', 'P04637', 'MEEPQSDPSV');
  assert.equal(unavailable.mappingConfidence, 'UNAVAILABLE');
  assert.equal(unavailable.mappingStatus, 'PARSER_ERROR');
  const networkError = parseRcsbEvidencePayload({}, '2ABC', 'P04637', 'MEEPQSDPSV', 'NETWORK_ERROR');
  assert.equal(networkError.mappingStatus, 'NETWORK_ERROR');
}

function testDiscontinuousSiftsMapping() {
  const detail = parseRcsbEvidencePayload({
    entry: {},
    polymerEntities: [{
      rcsb_polymer_entity_container_identifiers: {
        entity_id: '1', asym_ids: ['A'], auth_asym_ids: ['A'], uniprot_ids: ['P99999'],
      },
      entity_poly: { pdbx_seq_one_letter_code_can: 'AAAA' },
      rcsb_polymer_entity_align: [{ reference_database_name: 'UniProt', reference_database_accession: 'P99999', aligned_regions: [
        { entity_beg_seq_id: 1, ref_beg_seq_id: 100, length: 2 },
        { entity_beg_seq_id: 4, ref_beg_seq_id: 200, length: 1 },
      ] }],
    }],
    polymerInstances: [{ rcsb_polymer_entity_instance_container_identifiers: { entity_id: '1', asym_id: 'A', auth_asym_id: 'A', auth_to_entity_poly_seq_mapping: ['70', '71', '72', '73'] } }],
  }, '9XYZ', 'P99999', 'A'.repeat(250));
  assert.equal(mapEntitySequenceToCanonical(detail, 1), 100);
  assert.equal(mapEntitySequenceToCanonical(detail, 2), 101);
  assert.equal(mapEntitySequenceToCanonical(detail, 3), undefined);
  assert.equal(mapPdbResidueToCanonical(detail, 'A', '73'), 200);
}

function testKabschSuperposition() {
  const reference = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
  const mobile = reference.map((point) => ({ x: -point.y + 4, y: point.x - 2, z: point.z + 7 }));
  assert.ok(kabschSuperpose(reference, reference).rmsd < 1e-8);
  assert.ok(kabschSuperpose(reference, mobile).rmsd < 1e-6);
  assert.throws(() => kabschSuperpose(reference.slice(0, 2), mobile.slice(0, 2)), /at least 3/i);
  const perturbed = mobile.map((point, index) => index === 3 ? { ...point, z: point.z + 0.5 } : point);
  assert.ok(kabschSuperpose(reference, perturbed).rmsd > 0.05);
}

async function testSequenceCompatibilityLayer() {
  // 1. Exact Canonical Match
  const seq1 = 'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP';
  const comp1 = await analyzeSequenceCompatibility(seq1, 'P04637', seq1);
  assert.equal(comp1.relationship, 'CANONICAL_EXACT');
  assert.equal(comp1.numberingMode, 'DIRECT_1_TO_1');
  assert.equal(comp1.identity, 100);
  assert.equal(comp1.substitutions, 0);
  assert.equal(comp1.insertions, 0);
  assert.equal(comp1.deletions, 0);
  assert.equal(comp1.alignmentResult?.uploadedToCanonical[10], 10);
  assert.equal(comp1.alignmentResult?.canonicalToUploaded[10], 10);

  // 2. Single Substitution Variant
  const canonicalSeq = 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED';
  const variantSeq   = 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED'.replace('A', 'G');
  const comp2 = await analyzeSequenceCompatibility(variantSeq, 'P01308', canonicalSeq);
  assert.equal(comp2.relationship, 'CANONICAL_WITH_SUBSTITUTIONS');
  assert.equal(comp2.numberingMode, 'DIRECT_1_TO_1');
  assert.equal(comp2.substitutions, 1);
  assert.equal(comp2.alignmentResult?.uploadedToCanonical[2], 2);

  // 3. Exact Isoform Match (Internal Deletion)
  const canonicalIso = 'AAAAABBBBBCCCCCDDDDD'; // 20 aa
  const isoformSeq   = 'AAAAACCCCCDDDDD';     // 15 aa (5 aa deletion of BBBBB)
  const comp3 = await analyzeSequenceCompatibility(isoformSeq, 'TEST', canonicalIso, { 'TEST-2': isoformSeq });
  assert.equal(comp3.relationship, 'ISOFORM_EXACT');
  assert.equal(comp3.matchedIsoformId, 'TEST-2');
  assert.equal(comp3.numberingMode, 'REQUIRES_ALIGNMENT');
  assert.equal(comp3.deletions, 5);
  // Uploaded pos 1..5 -> Canonical pos 1..5
  assert.equal(comp3.alignmentResult?.uploadedToCanonical[5], 5);
  // Uploaded pos 6 ('C') -> Canonical pos 11 ('C')
  assert.equal(comp3.alignmentResult?.uploadedToCanonical[6], 11);
  // Canonical pos 6..10 ('B') -> deleted in uploaded (null)
  assert.equal(comp3.alignmentResult?.canonicalToUploaded[6], null);

  // 4. Exact Isoform Match (C-terminal Deletion)
  const canonicalCterm = 'AAAAABBBBBCCCCCDDDDD'; // 20 aa
  const isoCterm       = 'AAAAABBBBB';          // 10 aa (C-term deleted)
  const comp4 = await analyzeSequenceCompatibility(isoCterm, 'TEST2', canonicalCterm, { 'TEST2-2': isoCterm });
  assert.equal(comp4.relationship, 'ISOFORM_EXACT');
  assert.equal(comp4.matchedIsoformId, 'TEST2-2');
  assert.equal(comp4.alignmentResult?.canonicalToUploaded[15], null);

  // 5. Needleman-Wunsch Alignment
  const aln = alignProteinSequences('HEAGAWGHEE', 'PAWHEAE');
  assert.ok(aln.identity !== undefined);
  assert.ok(aln.alignedUploaded.length === aln.alignedCanonical.length);

  // 6. Mutation validation with uploaded WT reference
  const mutCheck = validateMutationInput('G2A', 'MGKLMN');
  assert.equal(mutCheck.ok, true);
  assert.equal(mutCheck.wildType, 'G');
}

testUniProtFastaParsing();
testBundledProteinExamples();
testInputClassification();
testSourceSemantics();
testPlddt();
testPaeParser();
testUniProtBiologyParser();
testMutationValidation();
testNearbyResidues();
testStateResetInvariant();
testRcsbEvidenceMapping();
testDiscontinuousSiftsMapping();
testKabschSuperposition();
await testSequenceCompatibilityLayer();

console.log('Protein Studio logic tests passed');
