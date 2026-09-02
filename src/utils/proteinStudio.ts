import type { ProteinProperties } from '../types/bio.ts';

export type InputKind = 'pdb' | 'cif' | 'fastq' | 'protein_fasta' | 'sequence_text' | 'unknown';
export type StructureSourceType = 'EXPERIMENTAL' | 'ALPHAFOLD_PREDICTED' | 'LOCAL_UNKNOWN';
export type PlddtCategory = 'very_high' | 'confident' | 'low' | 'very_low' | 'missing';

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

  // 1. Direct UniProt Accession match (e.g. P01308, P04637, P0DTC2)
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
    const resName = line.substring(17, 20).trim().toUpperCase();
    const key = `${chainID}:${resSeq}:${resName}`;
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

function uniprotCommentText(comment: Record<string, unknown>): string | undefined {
  const text = comment.text;
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object' && 'value' in text) return String(text.value);
  if (Array.isArray(text)) {
    const values = text.map((item) => (item && typeof item === 'object' && 'value' in item ? String(item.value) : '')).filter(Boolean);
    if (values.length) return values.join(' ');
  }
  return undefined;
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
  const commentText = (type: string) => uniprotCommentText(comments.find((comment) => comment.commentType === type) || {});

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
    subcellularLocation: commentText('SUBCELLULAR LOCATION'),
    cofactors: commentText('COFACTOR'),
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
