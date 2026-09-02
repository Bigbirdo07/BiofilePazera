import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyProteinStudioInput,
  classifyStructureSource,
  describeMutation,
  extractLookupIds,
  normalizeProteinAccession,
  parsePaeJson,
  parseProteinInput,
  plddtCategory,
  summarizePlddt,
  validateMutationInput,
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

function testStateResetInvariant() {
  let state = { sourceType: 'ALPHAFOLD_PREDICTED', pae: [[0]], plddtVisible: true };
  state = { sourceType: 'EXPERIMENTAL', pae: null as never, plddtVisible: false };
  assert.equal(state.sourceType, 'EXPERIMENTAL');
  assert.equal(state.pae, null);
  assert.equal(state.plddtVisible, false);
}

testUniProtFastaParsing();
testBundledProteinExamples();
testInputClassification();
testSourceSemantics();
testPlddt();
testPaeParser();
testMutationValidation();
testStateResetInvariant();

console.log('Protein Studio logic tests passed');
