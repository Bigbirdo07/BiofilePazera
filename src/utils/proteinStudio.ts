import type { ProteinProperties } from '../types/bio.ts';

export type InputKind = 'pdb' | 'cif' | 'fastq' | 'protein_fasta' | 'sequence_text' | 'unknown';
export type StructureSourceType = 'EXPERIMENTAL' | 'ALPHAFOLD_PREDICTED' | 'LOCAL_UNKNOWN';
export type PlddtCategory = 'very_high' | 'confident' | 'low' | 'very_low' | 'missing';

export type SequenceRelationship =
  | 'CANONICAL_EXACT'
  | 'ISOFORM_EXACT'
  | 'CANONICAL_WITH_SUBSTITUTIONS'
  | 'ISOFORM_WITH_DIFFERENCES'
  | 'PARTIAL'
  | 'UNRELATED_OR_UNRESOLVED';

export type SequenceNumberingMode =
  | 'DIRECT_1_TO_1'
  | 'REQUIRES_ALIGNMENT'
  | 'UNAVAILABLE';

export interface SequenceAlignmentResult {
  alignedUploaded: string;
  alignedCanonical: string;
  identity: number;
  substitutions: number;
  insertions: number;
  deletions: number;
  uploadedToCanonical: Record<number, number | null>;
  canonicalToUploaded: Record<number, number | null>;
}

export interface SequenceCompatibility {
  uploadedSequence: string;
  uploadedLength: number;
  uniprotAccession?: string;
  canonicalSequence?: string;
  canonicalLength?: number;
  relationship: SequenceRelationship;
  identity: number;
  substitutions: number;
  insertions: number;
  deletions: number;
  matchedIsoformId?: string;
  numberingMode: SequenceNumberingMode;
  alignmentResult?: SequenceAlignmentResult;
}

export interface ParsedHeaderInfo {
  headerRaw: string;
  accession?: string;
  entryName?: string;
  proteinName?: string;
  organism?: string;
  gene?: string;
  pdbId?: string;
}

export interface ParsedProteinInput {
  header?: ParsedHeaderInfo;
  sequence: string;
  records: number;
  nucleotideWarning: boolean;
}

export interface ProteinAtom {
  serial: number;
  name: string;
  resName: string;
  chainID: string;
  resSeq: number;
  residueIndex: number;
  authorResidueNumber?: string;
  structureSource?: 'ALPHAFOLD' | 'EXPERIMENTAL' | 'LOCAL';
  aa: string;
  x: number;
  y: number;
  z: number;
  bFactor: number | null;
}

export interface PlddtSummary {
  count: number;
  mean: number | null;
  veryHigh: number;
  confident: number;
  low: number;
  veryLow: number;
  lowRegions: Array<{ start: number; end: number }>;
}

export interface PaeMatrix {
  matrix: number[][];
  max: number;
  size: number;
}

export interface UniProtFeature {
  type: string;
  description?: string;
  start: number;
  end: number;
}

export interface ExperimentalStructureReference {
  id: string;
  method?: string;
  resolution?: string;
  title?: string;
  coverage?: string;
  chains?: string;
  ligandInfo?: string;
}

export interface ExperimentalEvidenceDetail {
  pdbId: string;
  uniprotAccession?: string;
  entityId?: string;
  entityIds: string[];
  asymIds: string[];
  chains: string[];
  mappingSource: 'RCSB_UNIPROT' | 'NOT_AVAILABLE';
  mappingConfidence: 'CURATED' | 'UNAVAILABLE';
  mappingStatus: 'MAPPED_EXPLICITLY' | 'NO_UNIPROT_MAPPING_IN_RCSB' | 'MULTIPLE_AMBIGUOUS_ENTITIES' | 'CHAIN_INSTANCE_AMBIGUOUS' | 'CANONICAL_RANGE_UNAVAILABLE' | 'NETWORK_ERROR' | 'PARSER_ERROR';
  method?: string;
  resolution?: number;
  releaseDate?: string;
  canonicalLength?: number;
  constructLength?: number;
  mappedCanonicalStart?: number;
  mappedCanonicalEnd?: number;
  mappedResidues?: number;
  resolvedResidues?: number;
  unresolvedResidues?: number;
  sequenceIdentity?: number;
  sequenceMatches?: number;
  sequenceDifferences?: Array<{ canonical: string; deposited: string; position: number }>;
  canonicalSegments: Array<{ entityStart: number; canonicalStart: number; length: number }>;
  residueMappings: Array<{ asymId: string; authorChainId: string; authorResidueNumber: string; entitySequenceIndex: number; canonicalPosition?: number }>;
  otherMolecules: Array<{ id: string; name?: string; category: string }>;
  notes: string[];
}

export interface CanonicalResidueSelection {
  uniprotAccession?: string;
  canonicalPosition?: number;
  aminoAcid?: string;
  structureSource: 'ALPHAFOLD' | 'EXPERIMENTAL' | 'LOCAL';
  pdbId?: string;
  entityId?: string;
  asymId?: string;
  authorChainId?: string;
  authorResidueNumber?: string;
  mappedBy?: 'DIRECT' | 'SIFTS' | 'NONE';
  plddt?: number;
  comparisonDisplacement?: number;
  comparisonPdbId?: string;
  comparisonAuthorChainId?: string;
  comparisonAuthorResidueNumber?: string;
}

export interface BiologyAnnotation {
  accession: string;
  proteinName?: string;
  gene?: string;
  organism?: string;
  length?: number;
  functionText?: string;
  subcellularLocation?: string;
  cofactors?: string;
  features: UniProtFeature[];
  experimentalStructures: ExperimentalStructureReference[];
}

export const isDisorderFeature = (feature: UniProtFeature) => /disorder|compositionally biased|flexible region/i.test(`${feature.type} ${feature.description || ''}`);
export const isPtmFeature = (feature: UniProtFeature) => /modified residue|phospho|glycosyl|acetyl|ubiquitin|methyl|lipid/i.test(`${feature.type} ${feature.description || ''}`);

const cleanDepositedSequence = (value: unknown) => typeof value === 'string' ? value.replace(/[^A-Za-z]/g, '').toUpperCase() : '';

export function parseRcsbEvidencePayload(raw: unknown, pdbId: string, accession: string, canonicalSequence?: string, statusOverride?: ExperimentalEvidenceDetail['mappingStatus']): ExperimentalEvidenceDetail {
  const payload = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const entry = payload.entry && typeof payload.entry === 'object' ? payload.entry as Record<string, unknown> : payload;
  const polymers = Array.isArray(payload.polymerEntities) ? payload.polymerEntities : [];
  const polymerInstances = Array.isArray(payload.polymerInstances) ? payload.polymerInstances : [];
  const nonpolymers = Array.isArray(payload.nonpolymerEntities) ? payload.nonpolymerEntities : [];
  const entryInfo = entry.rcsb_entry_info as Record<string, unknown> | undefined;
  const exptl = Array.isArray(entry.exptl) ? entry.exptl : [];
  const method = exptl.map((item) => item && typeof item === 'object' ? (item as Record<string, unknown>).method : undefined).filter((value): value is string => typeof value === 'string').join(', ') || undefined;
  const resolutionValue = Array.isArray(entryInfo?.resolution_combined) ? entryInfo?.resolution_combined[0] : undefined;
  const matching = polymers.map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null).filter((entity): entity is Record<string, unknown> => entity !== null).filter((entity) => {
    const container = entity!.rcsb_polymer_entity_container_identifiers as Record<string, unknown> | undefined;
    const refs = Array.isArray(container?.reference_sequence_identifiers) ? container?.reference_sequence_identifiers : [];
    const uniprotIds = Array.isArray(container?.uniprot_ids) ? container.uniprot_ids : [];
    return refs.some((ref) => {
      if (!ref || typeof ref !== 'object') return false;
      const record = ref as Record<string, unknown>;
      const database = record.database_name ?? record.database;
      return /uniprot/i.test(String(database)) && String(record.database_accession).toUpperCase().replace(/-\d+$/, '') === accession.toUpperCase().replace(/-\d+$/, '');
    }) || uniprotIds.some((id) => String(id).toUpperCase().replace(/-\d+$/, '') === accession.toUpperCase().replace(/-\d+$/, ''));
  });
  const mappedEntityIds = matching.map((entity) => String((entity!.rcsb_polymer_entity_container_identifiers as Record<string, unknown> | undefined)?.entity_id || '')).filter(Boolean);
  const mappedAsymIds = matching.flatMap((entity) => ((entity!.rcsb_polymer_entity_container_identifiers as Record<string, unknown> | undefined)?.asym_ids as unknown[] || []).map(String));
  const mappedAuthorChains = matching.flatMap((entity) => ((entity!.rcsb_polymer_entity_container_identifiers as Record<string, unknown> | undefined)?.auth_asym_ids as unknown[] || []).map(String));
  const hasPayload = Object.keys(entry).length > 0 || polymers.length > 0 || nonpolymers.length > 0;
  const mappingStatus = statusOverride || (matching.length === 0 ? (hasPayload ? 'NO_UNIPROT_MAPPING_IN_RCSB' : 'PARSER_ERROR') : mappedAuthorChains.length === 0 ? 'CHAIN_INSTANCE_AMBIGUOUS' : 'MAPPED_EXPLICITLY');
  const details: ExperimentalEvidenceDetail = {
    pdbId: pdbId.toUpperCase(),
    uniprotAccession: matching.length ? accession : undefined,
    entityId: mappedEntityIds[0],
    entityIds: mappedEntityIds,
    asymIds: mappedAsymIds,
    chains: mappedAuthorChains,
    mappingSource: matching.length ? 'RCSB_UNIPROT' : 'NOT_AVAILABLE',
    mappingConfidence: matching.length ? 'CURATED' : 'UNAVAILABLE',
    mappingStatus,
    method,
    resolution: typeof resolutionValue === 'number' ? resolutionValue : undefined,
    releaseDate: typeof (entry.rcsb_accession_info as Record<string, unknown> | undefined)?.initial_release_date === 'string' ? String((entry.rcsb_accession_info as Record<string, unknown>).initial_release_date) : undefined,
    canonicalLength: canonicalSequence?.length,
    canonicalSegments: [],
    residueMappings: [],
    otherMolecules: [],
    notes: [],
  };
  if (!matching.length) {
    details.notes.push(statusOverride === 'NETWORK_ERROR' ? 'Unable to retrieve mapping metadata from RCSB.' : 'UniProt links this PDB entry to the current protein, but exact chain-to-canonical mapping was not established from the available RCSB metadata.');
    return details;
  }
  const polymer = matching[0]!.entity_poly as Record<string, unknown> | undefined;
  const depositedSequence = cleanDepositedSequence(polymer?.pdbx_seq_one_letter_code_can || polymer?.pdbx_seq_one_letter_code);
  details.constructLength = depositedSequence.length || undefined;
  const alignments = matching.flatMap((entity) => Array.isArray(entity.rcsb_polymer_entity_align) ? entity.rcsb_polymer_entity_align : []).filter((alignment) => {
    if (!alignment || typeof alignment !== 'object') return false;
    const record = alignment as Record<string, unknown>;
    return /uniprot/i.test(String(record.reference_database_name)) && String(record.reference_database_accession).toUpperCase().replace(/-\d+$/, '') === accession.toUpperCase().replace(/-\d+$/, '');
  });
  const regions = alignments.flatMap((alignment) => Array.isArray((alignment as Record<string, unknown>).aligned_regions) ? (alignment as Record<string, unknown>).aligned_regions : []).filter((region) => region && typeof region === 'object') as Array<Record<string, unknown>>;
  if (canonicalSequence && regions.length) {
    const canonicalStarts = regions.map((region) => Number(region.ref_beg_seq_id)).filter(Number.isFinite);
    const canonicalEnds = regions.map((region) => Number(region.ref_beg_seq_id) + Number(region.length) - 1).filter(Number.isFinite);
    const mappedResidues = regions.reduce((total, region) => total + (Number(region.length) || 0), 0);
    if (canonicalStarts.length && canonicalEnds.length && mappedResidues > 0) {
      details.canonicalSegments = regions.map((region) => ({
        entityStart: Number(region.entity_beg_seq_id),
        canonicalStart: Number(region.ref_beg_seq_id),
        length: Number(region.length),
      })).filter((segment) => Number.isFinite(segment.entityStart) && Number.isFinite(segment.canonicalStart) && segment.length > 0);
      details.mappedCanonicalStart = Math.min(...canonicalStarts);
      details.mappedCanonicalEnd = Math.max(...canonicalEnds);
      details.mappedResidues = mappedResidues;
      details.sequenceMatches = mappedResidues;
      details.sequenceIdentity = 100;
    }
  } else if (canonicalSequence && depositedSequence) {
    const start = canonicalSequence.toUpperCase().indexOf(depositedSequence);
    if (start >= 0) {
      details.mappedCanonicalStart = start + 1;
      details.mappedCanonicalEnd = start + depositedSequence.length;
      details.canonicalSegments = [{ entityStart: 1, canonicalStart: start + 1, length: depositedSequence.length }];
      details.mappedResidues = depositedSequence.length;
      details.resolvedResidues = depositedSequence.length;
      details.sequenceMatches = depositedSequence.length;
      details.sequenceIdentity = 100;
    }
  }
  if (!details.mappedCanonicalStart) {
    details.mappingStatus = 'CANONICAL_RANGE_UNAVAILABLE';
    details.notes.push('RCSB identifies the UniProt-linked entity, but canonical residue range data is unavailable.');
  }
  for (const instance of polymerInstances) {
    if (!instance || typeof instance !== 'object') continue;
    const record = instance as Record<string, unknown>;
    const container = record.rcsb_polymer_entity_instance_container_identifiers as Record<string, unknown> | undefined;
    if (!mappedEntityIds.includes(String(container?.entity_id || ''))) continue;
    const asymId = String(container?.asym_id || '');
    const authorChainId = String(container?.auth_asym_id || asymId);
    const authorToEntity = Array.isArray(container?.auth_to_entity_poly_seq_mapping) ? container.auth_to_entity_poly_seq_mapping : [];
    authorToEntity.forEach((authorResidueNumber, index) => {
      const authorResidue = String(authorResidueNumber);
      if (!authorResidue || authorResidue === '?' || authorResidue === '.') return;
      details.residueMappings.push({
        asymId,
        authorChainId,
        authorResidueNumber: authorResidue,
        entitySequenceIndex: index + 1,
        canonicalPosition: mapEntitySequenceToCanonical(details, index + 1),
      });
    });
  }
  for (const entity of polymers) {
    if (!entity || typeof entity !== 'object' || matching.includes(entity as Record<string, unknown>)) continue;
    const entityRecord = entity as Record<string, unknown>;
    const container = entityRecord.rcsb_polymer_entity_container_identifiers as Record<string, unknown> | undefined;
    const chains = ((container?.auth_asym_ids as unknown[]) || []).map(String).join(', ');
    const type = String((entityRecord.entity_poly as Record<string, unknown> | undefined)?.type || 'polymer');
    details.otherMolecules.push({ id: chains || 'Additional polymer', name: String((entityRecord.rcsb_polymer_entity as Record<string, unknown> | undefined)?.pdbx_description || '') || undefined, category: type });
  }
  for (const item of nonpolymers) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const container = record.rcsb_nonpolymer_entity_container_identifiers as Record<string, unknown> | undefined;
    const chem = record.nonpolymer_comp as Record<string, unknown> | undefined;
    const chemComp = chem?.chem_comp as Record<string, unknown> | undefined;
    details.otherMolecules.push({ id: String(container?.non_polymer_comp_id || chemComp?.id || 'Unknown'), name: typeof chemComp?.name === 'string' ? chemComp.name : undefined, category: String(chemComp?.type || 'non-polymer') });
  }
  return details;
}

export function mapEntitySequenceToCanonical(detail: ExperimentalEvidenceDetail, entitySequenceIndex: number): number | undefined {
  const segment = detail.canonicalSegments.find((candidate) => entitySequenceIndex >= candidate.entityStart && entitySequenceIndex < candidate.entityStart + candidate.length);
  return segment ? segment.canonicalStart + entitySequenceIndex - segment.entityStart : undefined;
}

export function mapPdbResidueToCanonical(detail: ExperimentalEvidenceDetail, authorChainId: string, authorResidueNumber: string | number): number | undefined {
  const mapping = detail.residueMappings.find((candidate) => candidate.authorChainId === authorChainId && candidate.authorResidueNumber === String(authorResidueNumber));
  return mapping?.canonicalPosition;
}

export function mapCanonicalToPdbResidue(detail: ExperimentalEvidenceDetail, canonicalPosition: number, authorChainId?: string) {
  return detail.residueMappings.find((candidate) => (!authorChainId || candidate.authorChainId === authorChainId) && candidate.canonicalPosition === canonicalPosition);
}

export interface ComparisonCoordinate { x: number; y: number; z: number }
export interface MatchedCAlphaPair {
  canonicalPosition: number;
  aminoAcid: string;
  alphaFold: ComparisonCoordinate;
  experimental: ComparisonCoordinate;
  pdbId: string;
  entityId?: string;
  asymId?: string;
  authorChainId: string;
  authorResidueNumber: string;
}
export interface StructureComparisonResult {
  pairs: MatchedCAlphaPair[];
  excludedCanonicalPositions: number[];
  rmsd: number;
  meanDisplacement: number;
  medianDisplacement: number;
  maxDisplacement: { canonicalPosition: number; value: number };
  displacements: Array<{ canonicalPosition: number; value: number }>;
  transformedExperimental: ComparisonCoordinate[];
  rotation: number[];
  translation: ComparisonCoordinate;
}

const distance = (a: ComparisonCoordinate, b: ComparisonCoordinate) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

function centroid(points: ComparisonCoordinate[]): ComparisonCoordinate {
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y, z: sum.z + point.z }), { x: 0, y: 0, z: 0 });
  return { x: total.x / points.length, y: total.y / points.length, z: total.z / points.length };
}

function multiplyMatrixVector(matrix: number[][], vector: number[]) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return vector.map((value) => value / (norm || 1));
}

function quaternionToRotation([w, x, y, z]: number[]): number[] {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

function applyRotation(rotation: number[], point: ComparisonCoordinate): ComparisonCoordinate {
  return {
    x: rotation[0] * point.x + rotation[1] * point.y + rotation[2] * point.z,
    y: rotation[3] * point.x + rotation[4] * point.y + rotation[5] * point.z,
    z: rotation[6] * point.x + rotation[7] * point.y + rotation[8] * point.z,
  };
}

export function kabschSuperpose(reference: ComparisonCoordinate[], mobile: ComparisonCoordinate[]) {
  if (reference.length !== mobile.length || reference.length < 3) throw new Error('At least 3 matched coordinates are required for superposition.');
  const referenceCenter = centroid(reference);
  const mobileCenter = centroid(mobile);
  const centeredReference = reference.map((point) => ({ x: point.x - referenceCenter.x, y: point.y - referenceCenter.y, z: point.z - referenceCenter.z }));
  const centeredMobile = mobile.map((point) => ({ x: point.x - mobileCenter.x, y: point.y - mobileCenter.y, z: point.z - mobileCenter.z }));
  let sxx = 0, sxy = 0, sxz = 0, syx = 0, syy = 0, syz = 0, szx = 0, szy = 0, szz = 0;
  centeredMobile.forEach((point, index) => {
    const target = centeredReference[index];
    sxx += point.x * target.x; sxy += point.x * target.y; sxz += point.x * target.z;
    syx += point.y * target.x; syy += point.y * target.y; syz += point.y * target.z;
    szx += point.z * target.x; szy += point.z * target.y; szz += point.z * target.z;
  });
  const n = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  let quaternion = [1, 0, 0, 0];
  for (let iteration = 0; iteration < 60; iteration += 1) quaternion = normalizeVector(multiplyMatrixVector(n, quaternion));
  const rotation = quaternionToRotation(quaternion);
  const rotatedMobileCenter = applyRotation(rotation, mobileCenter);
  const translation = { x: referenceCenter.x - rotatedMobileCenter.x, y: referenceCenter.y - rotatedMobileCenter.y, z: referenceCenter.z - rotatedMobileCenter.z };
  const transformedMobile = mobile.map((point) => {
    const rotated = applyRotation(rotation, point);
    return { x: rotated.x + translation.x, y: rotated.y + translation.y, z: rotated.z + translation.z };
  });
  const squared = transformedMobile.reduce((sum, point, index) => sum + distance(point, reference[index]) ** 2, 0);
  return { rotation, translation, transformedMobile, rmsd: Math.sqrt(squared / reference.length) };
}

export function buildStructureComparisonPairs(alphaAtoms: ProteinAtom[], experimentalAtoms: ProteinAtom[], detail: ExperimentalEvidenceDetail, authorChainId: string, canonicalSequence?: string) {
  const mappings = detail.residueMappings.filter((mapping) => mapping.authorChainId === authorChainId && mapping.canonicalPosition !== undefined);
  const pairs: MatchedCAlphaPair[] = [];
  const excludedCanonicalPositions: number[] = [];
  for (const mapping of mappings) {
    const canonicalPosition = mapping.canonicalPosition!;
    const alpha = alphaAtoms.find((atom) => atom.residueIndex === canonicalPosition);
    const experimental = experimentalAtoms.find((atom) => atom.chainID === authorChainId && (atom.authorResidueNumber || String(atom.resSeq)) === mapping.authorResidueNumber);
    if (!alpha || !experimental || !Number.isFinite(alpha.x) || !Number.isFinite(experimental.x)) {
      excludedCanonicalPositions.push(canonicalPosition);
      continue;
    }
    pairs.push({ canonicalPosition, aminoAcid: canonicalSequence?.[canonicalPosition - 1] || alpha.aa, alphaFold: { x: alpha.x, y: alpha.y, z: alpha.z }, experimental: { x: experimental.x, y: experimental.y, z: experimental.z }, pdbId: detail.pdbId, entityId: detail.entityId, asymId: mapping.asymId, authorChainId, authorResidueNumber: mapping.authorResidueNumber });
  }
  if (pairs.length < 3) throw new Error(`Only ${pairs.length} shared coordinate residues were found; comparison requires at least 3.`);
  const fit = kabschSuperpose(pairs.map((pair) => pair.alphaFold), pairs.map((pair) => pair.experimental));
  const displacements = fit.transformedMobile.map((point, index) => ({ canonicalPosition: pairs[index].canonicalPosition, value: distance(point, pairs[index].alphaFold) }));
  const ordered = displacements.map((item) => item.value).sort((a, b) => a - b);
  return { pairs, excludedCanonicalPositions, rmsd: fit.rmsd, meanDisplacement: ordered.reduce((sum, value) => sum + value, 0) / ordered.length, medianDisplacement: ordered.length % 2 ? ordered[Math.floor(ordered.length / 2)] : (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2, maxDisplacement: displacements.reduce((max, item) => item.value > max.value ? item : max, displacements[0]), displacements, transformedExperimental: fit.transformedMobile, rotation: fit.rotation, translation: fit.translation } satisfies StructureComparisonResult;
}

export function transformPdbCoordinates(pdbText: string, rotation: number[], translation: ComparisonCoordinate, includedResidues?: Set<string>, authorChainId?: string): string {
  return pdbText.split(/\r?\n/).map((line) => {
    if ((!line.startsWith('ATOM') && !line.startsWith('HETATM')) || line.length < 54) return line;
    if (includedResidues) {
      const chain = line.substring(21, 22).trim() || 'A';
      const residue = `${Number.parseInt(line.substring(22, 26).trim(), 10)}${line.substring(26, 27).trim()}`;
      if (!includedResidues.has(`${chain}:${residue}`)) return '';
    }
    if (authorChainId && (line.substring(21, 22).trim() || 'A') !== authorChainId) return '';
    const point = { x: Number.parseFloat(line.substring(30, 38)), y: Number.parseFloat(line.substring(38, 46)), z: Number.parseFloat(line.substring(46, 54)) };
    if (![point.x, point.y, point.z].every(Number.isFinite)) return line;
    const rotated = applyRotation(rotation, point);
    const transformed = { x: rotated.x + translation.x, y: rotated.y + translation.y, z: rotated.z + translation.z };
    return `${line.substring(0, 30)}${transformed.x.toFixed(3).padStart(8)}${transformed.y.toFixed(3).padStart(8)}${transformed.z.toFixed(3).padStart(8)}${line.substring(54)}`;
  }).join('\n');
}

export interface MutationValidation {
  ok: boolean;
  notation?: string;
  position?: number;
  wildType?: string;
  mutant?: string;
  error?: string;
}

export interface MutationDescription {
  notation: string;
  wildTypeName: string;
  mutantName: string;
  wildTypeClass: string;
  mutantClass: string;
  hydropathyDelta: number;
  massDelta: number;
  chargeChange: string;
  polarityChange: string;
}

const uniprotAccessionPattern = /\b([OPQ][0-9][A-Z0-9]{3}[0-9](?:-\d+)?|[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9](?:-\d+)?)\b/i;
const pdbIdPattern = /\b([0-9][A-Z0-9]{3})\b/i;
const standardAminoAcids = 'ACDEFGHIKLMNPQRSTVWY';
export const normalizeProteinAccession = (accession: string) => accession.trim().replace(/\.\d+$/, '').toUpperCase();

const aa3ToAa1: Record<string, string> = {
  ALA: 'A',
  CYS: 'C',
  ASP: 'D',
  GLU: 'E',
  PHE: 'F',
  GLY: 'G',
  HIS: 'H',
  ILE: 'I',
  LYS: 'K',
  LEU: 'L',
  MET: 'M',
  ASN: 'N',
  PRO: 'P',
  GLN: 'Q',
  ARG: 'R',
  SER: 'S',
  THR: 'T',
  VAL: 'V',
  TRP: 'W',
  TYR: 'Y',
};

const aaInfo: Record<string, { name: string; className: string; hydropathy: number; mass: number; charge: string; polarity: string }> = {
  A: { name: 'Alanine', className: 'Small hydrophobic', hydropathy: 1.8, mass: 71.0788, charge: 'neutral', polarity: 'nonpolar' },
  C: { name: 'Cysteine', className: 'Polar sulfur-containing', hydropathy: 2.5, mass: 103.1388, charge: 'neutral', polarity: 'polar' },
  D: { name: 'Aspartate', className: 'Acidic charged', hydropathy: -3.5, mass: 115.0886, charge: 'negative', polarity: 'polar' },
  E: { name: 'Glutamate', className: 'Acidic charged', hydropathy: -3.5, mass: 129.1155, charge: 'negative', polarity: 'polar' },
  F: { name: 'Phenylalanine', className: 'Aromatic hydrophobic', hydropathy: 2.8, mass: 147.1766, charge: 'neutral', polarity: 'nonpolar' },
  G: { name: 'Glycine', className: 'Small flexible backbone', hydropathy: -0.4, mass: 57.0519, charge: 'neutral', polarity: 'nonpolar' },
  H: { name: 'Histidine', className: 'Basic aromatic', hydropathy: -3.2, mass: 137.1411, charge: 'positive', polarity: 'polar' },
  I: { name: 'Isoleucine', className: 'Branched hydrophobic', hydropathy: 4.5, mass: 113.1594, charge: 'neutral', polarity: 'nonpolar' },
  K: { name: 'Lysine', className: 'Basic charged', hydropathy: -3.9, mass: 128.1741, charge: 'positive', polarity: 'polar' },
  L: { name: 'Leucine', className: 'Branched hydrophobic', hydropathy: 3.8, mass: 113.1594, charge: 'neutral', polarity: 'nonpolar' },
  M: { name: 'Methionine', className: 'Sulfur hydrophobic', hydropathy: 1.9, mass: 131.1926, charge: 'neutral', polarity: 'nonpolar' },
  N: { name: 'Asparagine', className: 'Polar amide', hydropathy: -3.5, mass: 114.1038, charge: 'neutral', polarity: 'polar' },
  P: { name: 'Proline', className: 'Cyclic imino acid', hydropathy: -1.6, mass: 97.1167, charge: 'neutral', polarity: 'nonpolar' },
  Q: { name: 'Glutamine', className: 'Polar amide', hydropathy: -3.5, mass: 128.1307, charge: 'neutral', polarity: 'polar' },
  R: { name: 'Arginine', className: 'Basic charged', hydropathy: -4.5, mass: 156.1875, charge: 'positive', polarity: 'polar' },
  S: { name: 'Serine', className: 'Small polar', hydropathy: -0.8, mass: 87.0782, charge: 'neutral', polarity: 'polar' },
  T: { name: 'Threonine', className: 'Polar hydroxyl', hydropathy: -0.7, mass: 101.1051, charge: 'neutral', polarity: 'polar' },
  V: { name: 'Valine', className: 'Branched hydrophobic', hydropathy: 4.2, mass: 99.1326, charge: 'neutral', polarity: 'nonpolar' },
  W: { name: 'Tryptophan', className: 'Aromatic hydrophobic', hydropathy: -0.9, mass: 186.2132, charge: 'neutral', polarity: 'nonpolar' },
  Y: { name: 'Tyrosine', className: 'Aromatic polar', hydropathy: -1.3, mass: 163.176, charge: 'neutral', polarity: 'polar' },
};

export function parseFastaHeader(headerLine: string): ParsedHeaderInfo {
  const result: ParsedHeaderInfo = { headerRaw: headerLine };
  if (!headerLine.trim()) return result;

  const header = headerLine.trim().replace(/^>/, '').trim();
  const dbMatch = header.match(/^(?:sp|tr)\|([A-Z0-9]{6,10}(?:-\d+)?(?:\.\d+)?)\|(\S+)\s+(.*)$/i);
  if (dbMatch) {
    result.accession = normalizeProteinAccession(dbMatch[1]);
    result.entryName = dbMatch[2];
    const rest = dbMatch[3];
    result.organism = rest.match(/OS=([^=]+?)(?=\s+[A-Z]{2}=|$)/)?.[1]?.trim();
    result.gene = rest.match(/GN=([^=]+?)(?=\s+[A-Z]{2}=|$)/)?.[1]?.trim();
    const description = rest.split(/\s+[A-Z]{2}=/i)[0]?.trim() || '';
    const recName = description.match(/(?:^|;\s*)RecName:\s*Full=([^;]+)/i)?.[1]?.trim();
    result.proteinName = recName || description;
    return result;
  }

  const pdbPipeMatch = header.match(/^pdb\|([0-9][A-Z0-9]{3})\|(\S+)\s+(.*)$/i);
  if (pdbPipeMatch) {
    result.pdbId = pdbPipeMatch[1].toUpperCase();
    result.entryName = pdbPipeMatch[2];
    result.proteinName = pdbPipeMatch[3].trim();
    return result;
  }

  const leadingPdbMatch = header.match(/^([0-9][A-Z0-9]{3})(?:[_\s-](.*))?$/i);
  if (leadingPdbMatch) {
    result.pdbId = leadingPdbMatch[1].toUpperCase();
    result.proteinName = leadingPdbMatch[2]?.replace(/_/g, ' ').trim();
    return result;
  }

  const accMatch = header.match(uniprotAccessionPattern);
  if (accMatch) {

    result.accession = normalizeProteinAccession(accMatch[1]);
    const withoutAccession = header.replace(accMatch[1], '').trim();
    if (withoutAccession) result.proteinName = withoutAccession;
  }

  // RefSeq / NCBI Accession matching e.g. NP_000198.1, YP_009724390.1, NM_000207.3
  const refSeqMatch = header.match(/\b([A-Z]{2}_\d+(?:\.\d+)?)\b/i);
  if (refSeqMatch && !result.accession) {
    result.accession = refSeqMatch[1].toUpperCase();
  }

  return result;
}

export interface MappedAccessionResult {
  accession: string;
  proteinName?: string;
  organism?: string;
  mappedFrom?: string;
}

export async function resolveUniProtAccession(
  rawIdentifier: string,
  headerLine?: string,
  _sequence?: string
): Promise<MappedAccessionResult | null> {
  const cleanId = rawIdentifier.trim();

  // 1. Direct UniProt accession match
  if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$/i.test(cleanId) || /^[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9]$/i.test(cleanId)) {
    return { accession: cleanId.toUpperCase() };
  }

  // 2. Query UniProt REST API for RefSeq / GenBank / mRNA accessions (e.g. NP_000198.1, NP_000537.3, NM_000207.3, YP_009724390.1)
  if (cleanId.length >= 4) {
    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(cleanId)}&format=json&fields=accession,id,protein_name,organism_name`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const top = data.results[0];
          const acc = top.primaryAccession;
          const name = top.proteinDescription?.recommendedName?.fullName?.value || top.proteinDescription?.submissionNames?.[0]?.fullName?.value;
          const org = top.organism?.scientificName;
          if (acc) {
            return {
              accession: acc,
              proteinName: name,
              organism: org,
              mappedFrom: cleanId,
            };
          }
        }
      }
    } catch (_e) {
      // Ignore network errors and continue cascade
    }
  }

  // 3. Query UniProt REST API using header keywords if header is present
  if (headerLine && headerLine.trim()) {
    const cleanHeader = headerLine.replace(/^>/, '').trim();
    const words = cleanHeader.split(/\s+/).filter(w => w.length > 3 && !w.includes('|')).slice(0, 3).join(' ');
    if (words) {
      try {
        const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(words)}&format=json&fields=accession,id,protein_name,organism_name`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const top = data.results[0];
            const acc = top.primaryAccession;
            const name = top.proteinDescription?.recommendedName?.fullName?.value;
            const org = top.organism?.scientificName;
            if (acc) {
              return {
                accession: acc,
                proteinName: name,
                organism: org,
                mappedFrom: words,
              };
            }
          }
        }
      } catch (_e) {}
    }
  }

  return null;
}

const codonTable: Record<string, string> = {
  ATT: 'I', ATC: 'I', ATA: 'I', CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L', TTA: 'L', TTG: 'L',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V', TTT: 'F', TTC: 'F', ATG: 'M', TGT: 'C', TGC: 'C',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A', GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G', CCT: 'P',
  CCC: 'P', CCA: 'P', CCG: 'P', ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T', TCT: 'S', TCC: 'S',
  TCA: 'S', TCG: 'S', AGT: 'S', AGC: 'S', TAT: 'Y', TAC: 'Y', TGG: 'W', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', CAT: 'H', CAC: 'H', GAA: 'E', GAG: 'E', GAT: 'D', GAC: 'D', AAA: 'K',
  AAG: 'K', CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R', AGA: 'R', AGG: 'R', TAA: '*', TAG: '*', TGA: '*'
};

export function translateNucleotideToProtein(dnaSeq: string): string {
  const cleanDna = dnaSeq.toUpperCase().replace(/U/g, 'T').replace(/[^ATCG]/g, '');
  let bestProtein = '';

  for (let frame = 0; frame < 3; frame++) {
    let currentSeq = '';
    for (let i = frame; i + 2 < cleanDna.length; i += 3) {
      const codon = cleanDna.substring(i, i + 3);
      const aa = codonTable[codon] || 'X';
      if (aa === '*') {
        if (currentSeq.length > bestProtein.length) bestProtein = currentSeq;
        currentSeq = '';
      } else {
        currentSeq += aa;
      }
    }
    if (currentSeq.length > bestProtein.length) bestProtein = currentSeq;
  }
  return bestProtein || cleanDna;
}


export function extractLookupIds(text: string): { uniprotAccessions: string[]; pdbIds: string[] } {
  const uniprotAccessions = Array.from(new Set(
    Array.from(text.matchAll(new RegExp(uniprotAccessionPattern.source, 'gi'))).map((match) => normalizeProteinAccession(match[1])),
  ));
  const pdbIds = Array.from(new Set(
    Array.from(text.matchAll(new RegExp(pdbIdPattern.source, 'gi')))
      .map((match) => match[1].toUpperCase())
      .filter((id) => !uniprotAccessions.includes(id)),
  ));
  return { uniprotAccessions, pdbIds };
}

export function parseProteinInput(raw: string): ParsedProteinInput {
  const lines = raw.split(/\r?\n/);
  const records = lines.filter((line) => line.trim().startsWith('>')).length;
  const firstHeaderIndex = lines.findIndex((line) => line.trim().startsWith('>'));
  const firstHeader = firstHeaderIndex >= 0 ? lines[firstHeaderIndex] : undefined;
  const nextHeaderIndex = lines.findIndex((line, index) => index > firstHeaderIndex && line.trim().startsWith('>'));
  const sequenceLines = firstHeaderIndex >= 0
    ? lines.slice(firstHeaderIndex + 1, nextHeaderIndex === -1 ? undefined : nextHeaderIndex)
    : lines;
  const sequence = sequenceLines
    .join('')
    .replace(/[^A-Za-z*]/g, '')
    .toUpperCase()
    .replace(/\*/g, '');
  const nucleotideLetters = (sequence.match(/[ACGTUN]/g) || []).length;
  const nonDnaProteinLetters = (sequence.match(/[EFHIKLMNPQRSVWY]/g) || []).length;
  return {
    header: firstHeader ? parseFastaHeader(firstHeader) : undefined,
    sequence,
    records,
    nucleotideWarning: sequence.length >= 16 && nucleotideLetters / sequence.length > 0.9 && nonDnaProteinLetters === 0,
  };
}

export function classifyProteinStudioInput(filename: string, content = ''): InputKind {
  const name = filename.toLowerCase();
  const trimmed = content.trimStart();
  if (name.endsWith('.fastq') || name.endsWith('.fq') || name.endsWith('.fastq.gz') || name.endsWith('.fq.gz')) return 'fastq';
  if (/^@[^\n\r]+[\r\n]+[A-Za-z.~-]+[\r\n]+\+/.test(trimmed)) return 'fastq';
  if (name.endsWith('.pdb') || name.endsWith('.ent')) return 'pdb';
  if (name.endsWith('.cif') || name.endsWith('.mmcif')) return 'cif';
  if (name.endsWith('.fasta') || name.endsWith('.fa') || name.endsWith('.faa')) return 'protein_fasta';
  if (name.endsWith('.txt') && trimmed.startsWith('>')) return 'protein_fasta';
  if (name.endsWith('.txt') && trimmed) return 'sequence_text';
  return trimmed.startsWith('>') ? 'protein_fasta' : 'unknown';
}

export function classifyStructureSource(content: string, filename = ''): StructureSourceType {
  const text = `${filename}\n${content}`.toUpperCase();
  if (text.includes('ALPHAFOLD') || text.includes('AF-') || text.includes('PREDICTED MODEL')) return 'ALPHAFOLD_PREDICTED';
  if (/(X-RAY|X-RAY DIFFRACTION|ELECTRON MICROSCOPY|CRYO-EM|SOLUTION NMR| NMR|EXPDTA)/.test(text)) return 'EXPERIMENTAL';
  return 'LOCAL_UNKNOWN';
}

export function plddtCategory(value: number | null | undefined): PlddtCategory {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'missing';
  if (value > 90) return 'very_high';
  if (value >= 70) return 'confident';
  if (value >= 50) return 'low';
  return 'very_low';
}

export function parsePdbAtoms(pdbText: string): ProteinAtom[] {
  const atoms: ProteinAtom[] = [];
  const seenResidues = new Map<string, number>();
  let residueIndex = 0;

  for (const line of pdbText.split(/\r?\n/)) {
    if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) continue;
    if (line.length < 54) continue;
    const name = line.substring(12, 16).trim();
    if (name !== 'CA') continue;

    const chainID = line.substring(21, 22).trim() || 'A';
    const resSeq = Number.parseInt(line.substring(22, 26).trim(), 10);
    const insertionCode = line.substring(26, 27).trim();
    const authorResidueNumber = `${Number.isFinite(resSeq) ? resSeq : line.substring(22, 26).trim()}${insertionCode}`;
    const resName = line.substring(17, 20).trim().toUpperCase();
    const key = `${chainID}:${authorResidueNumber}:${resName}`;
    if (!seenResidues.has(key)) {
      residueIndex += 1;
      seenResidues.set(key, residueIndex);
    }

    atoms.push({
      serial: Number.parseInt(line.substring(6, 11).trim(), 10) || 0,
      name,
      resName,
      chainID,
      resSeq: Number.isFinite(resSeq) ? resSeq : 0,
      authorResidueNumber,
      residueIndex: seenResidues.get(key) || residueIndex,
      aa: aa3ToAa1[resName] || 'X',
      x: Number.parseFloat(line.substring(30, 38).trim()) || 0,
      y: Number.parseFloat(line.substring(38, 46).trim()) || 0,
      z: Number.parseFloat(line.substring(46, 54).trim()) || 0,
      bFactor: Number.isFinite(Number.parseFloat(line.substring(60, 66).trim()))
        ? Number.parseFloat(line.substring(60, 66).trim())
        : null,
    });
  }

  return atoms;
}

export function extractChainsFromAtoms(atoms: ProteinAtom[]): string[] {
  return Array.from(new Set(atoms.map((atom) => atom.chainID).filter(Boolean))).sort();
}

export function findNearbyResidues(atoms: ProteinAtom[], residueIndex: number, distanceAngstroms = 4): ProteinAtom[] {
  const target = atoms.find((atom) => atom.residueIndex === residueIndex);
  if (!target) return [];
  const maxDistanceSquared = distanceAngstroms ** 2;
  const seen = new Set<number>();
  return atoms.filter((atom) => {
    if (atom.residueIndex === residueIndex || seen.has(atom.residueIndex)) return false;
    const dx = atom.x - target.x;
    const dy = atom.y - target.y;
    const dz = atom.z - target.z;
    if (dx * dx + dy * dy + dz * dz > maxDistanceSquared) return false;
    seen.add(atom.residueIndex);
    return true;
  });
}

export function summarizePlddt(atoms: ProteinAtom[]): PlddtSummary {
  const values = atoms.map((atom) => atom.bFactor).filter((value): value is number => typeof value === 'number');
  const summary: PlddtSummary = {
    count: values.length,
    mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    veryHigh: 0,
    confident: 0,
    low: 0,
    veryLow: 0,
    lowRegions: [],
  };

  let regionStart: number | null = null;
  atoms.forEach((atom, idx) => {
    const category = plddtCategory(atom.bFactor);
    if (category === 'very_high') summary.veryHigh += 1;
    if (category === 'confident') summary.confident += 1;
    if (category === 'low') summary.low += 1;
    if (category === 'very_low') summary.veryLow += 1;

    const isLowConfidence = category === 'low' || category === 'very_low';
    if (isLowConfidence && regionStart === null) regionStart = idx + 1;
    if ((!isLowConfidence || idx === atoms.length - 1) && regionStart !== null) {
      const end = isLowConfidence && idx === atoms.length - 1 ? idx + 1 : idx;
      if (end - regionStart + 1 >= 3) summary.lowRegions.push({ start: regionStart, end });
      regionStart = null;
    }
  });

  return summary;
}

export function parsePaeJson(raw: unknown, expectedLength?: number): PaeMatrix | null {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const record = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!record || typeof record !== 'object') return null;

  const matrix = (record as { predicted_aligned_error?: unknown }).predicted_aligned_error;
  const maxValue = (record as { max_predicted_aligned_error?: unknown }).max_predicted_aligned_error;
  if (!Array.isArray(matrix) || matrix.length === 0) return null;
  if (expectedLength && matrix.length !== expectedLength) return null;
  if (typeof maxValue !== 'number' || !Number.isFinite(maxValue) || maxValue <= 0) return null;

  const numericMatrix: number[][] = [];
  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== matrix.length) return null;
    const numericRow = row.map((value) => {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : Number.NaN;
    });
    if (numericRow.some((value) => Number.isNaN(value) || value < 0)) return null;
    numericMatrix.push(numericRow);
  }

  return { matrix: numericMatrix, max: maxValue, size: numericMatrix.length };
}

function uniprotLocationValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object' && 'value' in value) return uniprotLocationValue(value.value);
  return null;
}

function uniprotTextValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(uniprotTextValues);
  if (value && typeof value === 'object') {
    const item = value as { value?: unknown; texts?: unknown };
    if ('value' in item) return uniprotTextValues(item.value);
    if ('texts' in item) return uniprotTextValues(item.texts);
  }
  return [];
}

function uniprotCommentText(comment: Record<string, unknown>): string | undefined {
  const values = [...uniprotTextValues(comment.text), ...uniprotTextValues(comment.texts)];
  return values.length ? values.join(' ') : undefined;
}

function uniprotSubcellularLocationText(comments: Record<string, unknown>[]): string | undefined {
  const values = comments
    .filter((comment) => comment.commentType === 'SUBCELLULAR LOCATION')
    .flatMap((comment) => Array.isArray(comment.subcellularLocations) ? comment.subcellularLocations : [])
    .flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      return [
        ...uniprotTextValues(item.location),
        ...uniprotTextValues(item.topology),
        ...uniprotTextValues(item.orientation),
      ];
    });
  return values.length ? Array.from(new Set(values)).join('; ') : undefined;
}

function uniprotCofactorText(comments: Record<string, unknown>[]): string | undefined {
  const values = comments
    .filter((comment) => comment.commentType === 'COFACTOR')
    .flatMap((comment) => {
      const cofactor = comment.cofactor;
      if (!cofactor || typeof cofactor !== 'object') return uniprotTextValues(cofactor);
      const item = cofactor as Record<string, unknown>;
      return [
        ...uniprotTextValues(item.name),
        ...uniprotTextValues(item.note),
      ];
    });
  return values.length ? Array.from(new Set(values)).join('; ') : undefined;
}

export function parseUniProtBiology(raw: unknown): BiologyAnnotation | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const accession = typeof record.primaryAccession === 'string' ? record.primaryAccession : undefined;
  if (!accession) return null;

  const organismRecord = record.organism as Record<string, unknown> | undefined;
  const genes = Array.isArray(record.genes) ? record.genes : [];
  const geneRecord = genes[0] as Record<string, unknown> | undefined;
  const geneName = geneRecord?.geneName as Record<string, unknown> | undefined;
  const sequenceRecord = record.sequence as Record<string, unknown> | undefined;
  const proteinDescription = record.proteinDescription as Record<string, unknown> | undefined;
  const recommendedName = proteinDescription?.recommendedName as Record<string, unknown> | undefined;
  const fullName = recommendedName?.fullName as Record<string, unknown> | undefined;

  const comments = (Array.isArray(record.comments) ? record.comments : []) as Record<string, unknown>[];
  const commentText = (type: string) => {
    const values = comments
      .filter((comment) => comment.commentType === type)
      .flatMap(uniprotCommentText)
      .filter((value): value is string => Boolean(value));
    return values.length ? values.join(' ') : undefined;
  };

  const features = (Array.isArray(record.features) ? record.features : [])
    .map((feature): UniProtFeature | null => {
      if (!feature || typeof feature !== 'object') return null;
      const item = feature as Record<string, unknown>;
      const location = item.location as Record<string, unknown> | undefined;
      const position = uniprotLocationValue(location?.position);
      const start = uniprotLocationValue(location?.start) ?? position;
      const end = uniprotLocationValue(location?.end) ?? start;
      if (!start || !end) return null;
      return {
        type: typeof item.type === 'string' ? item.type : 'Feature',
        description: typeof item.description === 'string' ? item.description : undefined,
        start,
        end,
      };
    })
    .filter((feature): feature is UniProtFeature => feature !== null);

  const experimentalStructures = (Array.isArray(record.uniProtKBCrossReferences) ? record.uniProtKBCrossReferences : [])
    .filter((reference): reference is Record<string, unknown> => Boolean(reference && typeof reference === 'object' && reference.database === 'PDB' && typeof reference.id === 'string'))
    .map((reference) => {
      const properties = Array.isArray(reference.properties) ? reference.properties as Record<string, unknown>[] : [];
      const value = (key: string) => properties.find((property) => property.key === key)?.value;
      return {
        id: reference.id as string,
        method: typeof value('Method') === 'string' ? value('Method') as string : undefined,
        resolution: typeof value('Resolution') === 'string' ? value('Resolution') as string : undefined,
      } satisfies ExperimentalStructureReference;
    });

  return {
    accession,
    proteinName: typeof fullName?.value === 'string' ? fullName.value : undefined,
    gene: typeof geneName?.value === 'string' ? geneName.value : undefined,
    organism: typeof organismRecord?.scientificName === 'string' ? organismRecord.scientificName : undefined,
    length: typeof sequenceRecord?.length === 'number' ? sequenceRecord.length : undefined,
    functionText: commentText('FUNCTION'),
    subcellularLocation: uniprotSubcellularLocationText(comments) || commentText('SUBCELLULAR LOCATION'),
    cofactors: uniprotCofactorText(comments) || commentText('COFACTOR'),
    features,
    experimentalStructures,
  };
}

export function validateMutationInput(notation: string, sequence: string): MutationValidation {
  const trimmed = notation.trim().toUpperCase();
  const match = trimmed.match(/^([A-Z])(\d+)([A-Z])$/);
  if (!match) return { ok: false, error: 'Use substitution notation such as F24S.' };
  const [, wildType, positionText, mutant] = match;
  const position = Number.parseInt(positionText, 10);
  if (!Number.isInteger(position) || position < 1 || position > sequence.length) {
    return { ok: false, position, wildType, mutant, error: 'Position is outside the loaded sequence.' };
  }
  if (!standardAminoAcids.includes(wildType) || !standardAminoAcids.includes(mutant)) {
    return { ok: false, position, wildType, mutant, error: 'Wild type and mutant must be standard amino acids.' };
  }
  if (wildType === mutant) {
    return { ok: false, position, wildType, mutant, error: 'Wild type and mutant must differ.' };
  }
  const observed = sequence[position - 1]?.toUpperCase();
  if (observed !== wildType) {
    return { ok: false, position, wildType, mutant, error: `Loaded sequence has ${observed || '-'} at position ${position}, not ${wildType}.` };
  }
  return { ok: true, notation: `${wildType}${position}${mutant}`, position, wildType, mutant };
}

export function describeMutation(validation: MutationValidation): MutationDescription | null {
  if (!validation.ok || !validation.wildType || !validation.mutant || !validation.position) return null;
  const wt = aaInfo[validation.wildType];
  const mut = aaInfo[validation.mutant];
  if (!wt || !mut) return null;
  return {
    notation: validation.notation || `${validation.wildType}${validation.position}${validation.mutant}`,
    wildTypeName: wt.name,
    mutantName: mut.name,
    wildTypeClass: wt.className,
    mutantClass: mut.className,
    hydropathyDelta: mut.hydropathy - wt.hydropathy,
    massDelta: mut.mass - wt.mass,
    chargeChange: wt.charge === mut.charge ? `No charge class change (${wt.charge})` : `${wt.charge} to ${mut.charge}`,
    polarityChange: wt.polarity === mut.polarity ? `No polarity class change (${wt.polarity})` : `${wt.polarity} to ${mut.polarity}`,
  };
}

export function formatPercent(count: number, total: number): string {
  if (!total) return '-';
  return `${((count / total) * 100).toFixed(1)}%`;
}

export function getStructureMetricLabel(sourceType: StructureSourceType, chains: string[]): { label: string; value: string } {
  if (sourceType === 'ALPHAFOLD_PREDICTED') return { label: 'STRUCTURE', value: 'AlphaFold DB' };
  if (chains.length) return { label: 'CHAINS', value: String(chains.length) };
  return { label: 'STRUCTURE', value: '-' };
}

export function hasProteinProperties(properties: ProteinProperties | null): properties is ProteinProperties {
  return Boolean(properties && properties.length > 0);
}

export function alignProteinSequences(uploaded: string, canonical: string): SequenceAlignmentResult {
  const m = uploaded.length;
  const n = canonical.length;

  if (uploaded === canonical) {
    const uploadedToCanonical: Record<number, number | null> = {};
    const canonicalToUploaded: Record<number, number | null> = {};
    for (let i = 1; i <= m; i++) {
      uploadedToCanonical[i] = i;
      canonicalToUploaded[i] = i;
    }
    return {
      alignedUploaded: uploaded,
      alignedCanonical: canonical,
      identity: 100.0,
      substitutions: 0,
      insertions: 0,
      deletions: 0,
      uploadedToCanonical,
      canonicalToUploaded,
    };
  }

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -2;

  const score: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) score[i][0] = i * GAP;
  for (let j = 0; j <= n; j++) score[0][j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const matchScore = uploaded[i - 1] === canonical[j - 1] ? MATCH : MISMATCH;
      const diag = score[i - 1][j - 1] + matchScore;
      const up = score[i - 1][j] + GAP;
      const left = score[i][j - 1] + GAP;
      score[i][j] = Math.max(diag, up, left);
    }
  }

  let i = m;
  let j = n;
  let alignU = '';
  let alignC = '';

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const matchScore = uploaded[i - 1] === canonical[j - 1] ? MATCH : MISMATCH;
      if (score[i][j] === score[i - 1][j - 1] + matchScore) {
        alignU = uploaded[i - 1] + alignU;
        alignC = canonical[j - 1] + alignC;
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && score[i][j] === score[i - 1][j] + GAP) {
      alignU = uploaded[i - 1] + alignU;
      alignC = '-' + alignC;
      i--;
      continue;
    }
    alignU = '-' + alignU;
    alignC = canonical[j - 1] + alignC;
    j--;
  }

  let substitutions = 0;
  let insertions = 0;
  let deletions = 0;
  let matches = 0;

  let uPos = 0;
  let cPos = 0;
  const uploadedToCanonical: Record<number, number | null> = {};
  const canonicalToUploaded: Record<number, number | null> = {};

  for (let k = 0; k < alignU.length; k++) {
    const charU = alignU[k];
    const charC = alignC[k];

    if (charU !== '-') uPos++;
    if (charC !== '-') cPos++;

    if (charU !== '-' && charC !== '-') {
      uploadedToCanonical[uPos] = cPos;
      canonicalToUploaded[cPos] = uPos;
      if (charU === charC) {
        matches++;
      } else {
        substitutions++;
      }
    } else if (charU !== '-' && charC === '-') {
      uploadedToCanonical[uPos] = null;
      insertions++;
    } else if (charU === '-' && charC !== '-') {
      canonicalToUploaded[cPos] = null;
      deletions++;
    }
  }

  const identity = (matches / Math.max(m, n)) * 100;

  return {
    alignedUploaded: alignU,
    alignedCanonical: alignC,
    identity: Number(identity.toFixed(2)),
    substitutions,
    insertions,
    deletions,
    uploadedToCanonical,
    canonicalToUploaded,
  };
}

export async function fetchUniProtCanonicalSequence(
  accession: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.fasta`, { signal });
    if (res.ok) {
      const text = await res.text();
      return text.split(/\r?\n/).filter(l => !l.startsWith('>')).join('').replace(/\s+/g, '').toUpperCase();
    }
  } catch (_) {}
  return null;
}

export async function fetchUniProtIsoformSequences(
  accession: string,
  signal?: AbortSignal
): Promise<Record<string, string>> {
  const isoforms: Record<string, string> = {};
  try {
    const res = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.json`, { signal });
    if (!res.ok) return isoforms;
    const data = await res.json();
    const comments = Array.isArray(data?.comments) ? data.comments : [];
    const altComment = comments.find((c: any) => c.commentType === 'ALTERNATIVE PRODUCTS');
    if (!altComment || !Array.isArray(altComment.isoforms)) return isoforms;

    const isoformIds: string[] = [];
    for (const iso of altComment.isoforms) {
      if (Array.isArray(iso.isoformIds)) {
        for (const iid of iso.isoformIds) {
          if (typeof iid === 'string') isoformIds.push(iid);
        }
      }
    }

    await Promise.all(
      isoformIds.map(async (iid) => {
        try {
          const isoRes = await fetch(`https://rest.uniprot.org/uniprotkb/${iid}.fasta`, { signal });
          if (isoRes.ok) {
            const text = await isoRes.text();
            const seq = text.split(/\r?\n/).filter(l => !l.startsWith('>')).join('').replace(/\s+/g, '').toUpperCase();
            if (seq) isoforms[iid] = seq;
          }
        } catch (_) {}
      })
    );
  } catch (_) {}
  return isoforms;
}

export async function analyzeSequenceCompatibility(
  uploadedSequence: string,
  uniprotAccession?: string,
  canonicalSequence?: string,
  knownIsoforms?: Record<string, string>,
  signal?: AbortSignal
): Promise<SequenceCompatibility> {
  const uploadedLength = uploadedSequence.length;

  if (!uniprotAccession || !canonicalSequence) {
    return {
      uploadedSequence,
      uploadedLength,
      relationship: 'UNRELATED_OR_UNRESOLVED',
      identity: 0,
      substitutions: 0,
      insertions: 0,
      deletions: 0,
      numberingMode: 'UNAVAILABLE',
    };
  }

  const canonicalLength = canonicalSequence.length;

  // 1. Check EXACT CANONICAL
  if (uploadedSequence === canonicalSequence) {
    const alignmentResult = alignProteinSequences(uploadedSequence, canonicalSequence);
    return {
      uploadedSequence,
      uploadedLength,
      uniprotAccession,
      canonicalSequence,
      canonicalLength,
      relationship: 'CANONICAL_EXACT',
      identity: 100.0,
      substitutions: 0,
      insertions: 0,
      deletions: 0,
      numberingMode: 'DIRECT_1_TO_1',
      alignmentResult,
    };
  }

  // 2. Isoform matching
  const isoforms = knownIsoforms || (await fetchUniProtIsoformSequences(uniprotAccession, signal));
  let matchedIsoformId: string | undefined = undefined;
  let isExactIsoform = false;

  for (const [isoId, isoSeq] of Object.entries(isoforms)) {
    if (isoSeq === uploadedSequence) {
      matchedIsoformId = isoId;
      isExactIsoform = true;
      break;
    }
  }

  const alignmentResult = alignProteinSequences(uploadedSequence, canonicalSequence);
  const { identity, substitutions, insertions, deletions } = alignmentResult;

  let relationship: SequenceRelationship = 'UNRELATED_OR_UNRESOLVED';

  if (isExactIsoform) {
    relationship = 'ISOFORM_EXACT';
  } else if (uploadedLength === canonicalLength && substitutions > 0 && insertions === 0 && deletions === 0) {
    relationship = 'CANONICAL_WITH_SUBSTITUTIONS';
  } else if (matchedIsoformId && (substitutions > 0 || insertions > 0 || deletions > 0)) {
    relationship = 'ISOFORM_WITH_DIFFERENCES';
  } else if (identity >= 80.0 && (insertions > 0 || deletions > 0)) {
    relationship = 'PARTIAL';
  } else if (identity >= 50.0) {
    relationship = 'CANONICAL_WITH_SUBSTITUTIONS';
  }

  const numberingMode: SequenceNumberingMode =
    uploadedLength === canonicalLength && insertions === 0 && deletions === 0
      ? 'DIRECT_1_TO_1'
      : 'REQUIRES_ALIGNMENT';

  return {
    uploadedSequence,
    uploadedLength,
    uniprotAccession,
    canonicalSequence,
    canonicalLength,
    relationship,
    identity,
    substitutions,
    insertions,
    deletions,
    matchedIsoformId,
    numberingMode,
    alignmentResult,
  };
}
