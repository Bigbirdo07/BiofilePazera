import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  Dna,
  FileCode,
  FileText,
  Globe,
  Info,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PageView, ProteinProperties } from '../types/bio';
import { calculateProteinProperties, extractFastaFromPdb } from '../services/biofileApi';
import { FileUploader } from '../components/common/FileUploader';
import { Pdb3DViewer } from '../components/common/Pdb3DViewer';
import exampleProteinFasta from '../../data/protein-studio-examples/P00533_EGFR_HUMAN_ncbi.fasta?raw';
import {
  MutationDescription,
  BiologyAnnotation,
  PaeMatrix,
  ProteinAtom,
  StructureSourceType,
  classifyProteinStudioInput,
  classifyStructureSource,
  describeMutation,
  extractChainsFromAtoms,
  findNearbyResidues,
  formatPercent,
  getStructureMetricLabel,
  hasProteinProperties,
  extractLookupIds,
  normalizeProteinAccession,
  parseFastaHeader,
  parsePaeJson,
  parsePdbAtoms,
  parseProteinInput,
  parseUniProtBiology,
  summarizePlddt,
  validateMutationInput,
  resolveUniProtAccession,
  translateNucleotideToProtein,
  isDisorderFeature,
  isPtmFeature,
  ExperimentalEvidenceDetail,
  parseRcsbEvidencePayload,
  CanonicalResidueSelection,
  mapCanonicalToPdbResidue,
  mapPdbResidueToCanonical,
  buildStructureComparisonPairs,
  transformPdbCoordinates,
  StructureComparisonResult,
  SequenceCompatibility,
  analyzeSequenceCompatibility,
  fetchUniProtCanonicalSequence,
} from '../utils/proteinStudio';

export { parseFastaHeader };

interface ProteinStudioProps {
  onNavigate?: (view: PageView) => void;
}

type InputMode = 'structure' | 'uniprot' | 'sequence';
type WorkspaceTab = 'structure' | 'confidence' | 'biology' | 'evidence' | 'sequence' | 'mutation';
type LoadStep = 'metadata' | 'model' | 'confidence';

const exampleStructurePath = '/demo-structures/P00533_EGFR_AlphaFold.pdb';

interface SelectedFile {
  name: string;
  size: number;
  content: string;
  format: string;
}

interface ActiveProtein {
  title: string;
  pdbId?: string;
  accession?: string;
  mappedFrom?: string;
  entryName?: string;
  proteinName?: string;
  organism?: string;
  gene?: string;
  sourceType: StructureSourceType | 'SEQUENCE_ONLY';
  sourceLabel: string;
  locationLabel: 'LOCAL' | 'ONLINE';
  structureType: string;
  pdbText: string;
  sequence: string;
  canonicalSequence?: string;
  rawFastaText?: string;
  sequenceLabel: string;
  chains: string[];
  atoms: ProteinAtom[];
  compatibility?: SequenceCompatibility;
}


interface AlphaFoldMetadata {
  pdbUrl?: string;
  cifUrl?: string;
  entryId?: string;
  paeDocUrl?: string;
  plddtDocUrl?: string;
  accession?: string;
  entryName?: string;
  proteinName?: string;
  organism?: string;
  gene?: string;
  sequence?: string;
}

type AlphaFoldFailureType = 'MODEL_NOT_FOUND' | 'METADATA_ENDPOINT_FAILURE' | 'COORDINATE_URL_NOT_FOUND' | 'NETWORK_ERROR' | 'PARSE_ERROR';

class AlphaFoldRetrievalError extends Error {
  constructor(public readonly code: AlphaFoldFailureType, message: string) {
    super(message);
    this.name = 'AlphaFoldRetrievalError';
  }
}

interface ComparisonSession {
  reference: BiologyAnnotation['experimentalStructures'][number];
  detail: ExperimentalEvidenceDetail;
  experimentalPdbText: string;
  experimentalAtoms: ProteinAtom[];
  chainId: string;
  result: StructureComparisonResult;
}

export const ProteinStudio: React.FC<ProteinStudioProps> = ({ onNavigate }) => {
  const [inputMode, setInputMode] = useState<InputMode>('structure');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('structure');
  const [structureFile, setStructureFile] = useState<SelectedFile | null>(null);
  const [sequenceFile, setSequenceFile] = useState<SelectedFile | null>(null);
  const [pastedSequence, setPastedSequence] = useState('');
  const [uniprotAccession, setUniprotAccession] = useState('');
  const [activeProtein, setActiveProtein] = useState<ActiveProtein | null>(null);
  const [rawAlphaFoldStructure, setRawAlphaFoldStructure] = useState<{ text: string; filename: string } | null>(null);
  const [properties, setProperties] = useState<ProteinProperties | null>(null);
  const [pae, setPae] = useState<PaeMatrix | null>(null);
  const [biology, setBiology] = useState<BiologyAnnotation | null>(null);
  const [evidenceDetails, setEvidenceDetails] = useState<Record<string, ExperimentalEvidenceDetail>>({});
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState('ALL');
  const [renderMode, setRenderMode] = useState<'ribbon' | 'trace' | 'spheres'>('ribbon');
  const [colorMode, setColorMode] = useState<'plddt' | 'chain' | 'spectrum' | 'bfactor'>('chain');
  const [highlightedResidue, setHighlightedResidue] = useState<number | null>(null);
  const [selectedResidue, setSelectedResidue] = useState<ProteinAtom | null>(null);
  const [canonicalSelection, setCanonicalSelection] = useState<CanonicalResidueSelection | null>(null);
  const [comparison, setComparison] = useState<ComparisonSession | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonShowAlphaFold, setComparisonShowAlphaFold] = useState(true);
  const [comparisonShowExperimental, setComparisonShowExperimental] = useState(true);
  const [comparisonMatchedOnly, setComparisonMatchedOnly] = useState(false);
  const [mutationNotation, setMutationNotation] = useState('');
  const [mutationResult, setMutationResult] = useState<MutationDescription | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loadSteps, setLoadSteps] = useState<Record<LoadStep, 'idle' | 'loading' | 'done' | 'error'>>({
    metadata: 'idle',
    model: 'idle',
    confidence: 'idle',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeDetails, setNoticeDetails] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState<InputMode | null>(null);
  const [isFastqDetected, setIsFastqDetected] = useState(false);
  const [copiedSeq, setCopiedSeq] = useState(false);
  const [copiedFasta, setCopiedFasta] = useState(false);
  const [showAlignmentModal, setShowAlignmentModal] = useState(false);
  const requestRef = useRef<{ id: number; controller?: AbortController }>({ id: 0 });

  const isAlphaFold = activeProtein?.sourceType === 'ALPHAFOLD_PREDICTED';
  const plddtSummary = useMemo(
    () => (activeProtein && isAlphaFold ? summarizePlddt(activeProtein.atoms) : null),
    [activeProtein, isAlphaFold],
  );
  const structureMetric = getStructureMetricLabel(
    activeProtein?.sourceType === 'SEQUENCE_ONLY' || !activeProtein ? 'LOCAL_UNKNOWN' : activeProtein.sourceType,
    activeProtein?.chains || [],
  );
  const comparisonOverlayPdb = useMemo(
    () => comparison ? transformPdbCoordinates(comparison.experimentalPdbText, comparison.result.rotation, comparison.result.translation, comparisonMatchedOnly ? new Set(comparison.result.pairs.map((pair) => `${pair.authorChainId}:${pair.authorResidueNumber}`)) : undefined, comparison.chainId) : undefined,
    [comparison, comparisonMatchedOnly],
  );

  const startRequest = () => {
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const id = requestRef.current.id + 1;
    requestRef.current = { id, controller };
    return { id, controller };
  };

  const isLatestRequest = (id: number) => id === requestRef.current.id;

  const activeEvidenceDetail = activeProtein?.pdbId ? evidenceDetails[activeProtein.pdbId] : undefined;
  const comparisonDetail = comparison?.detail;
  const structureHighlightResidue = useMemo(() => {
    if (!canonicalSelection?.canonicalPosition) return null;
    if (isAlphaFold) return canonicalSelection.canonicalPosition;
    if (activeEvidenceDetail) return mapCanonicalToPdbResidue(activeEvidenceDetail, canonicalSelection.canonicalPosition, canonicalSelection.authorChainId)?.authorResidueNumber || null;
    return canonicalSelection.authorResidueNumber || null;
  }, [activeEvidenceDetail, canonicalSelection, isAlphaFold]);
  const comparisonHighlightResidue = useMemo(() => {
    if (!comparison || !canonicalSelection?.canonicalPosition) return null;
    return mapCanonicalToPdbResidue(comparison.detail, canonicalSelection.canonicalPosition, comparison.chainId)?.authorResidueNumber || null;
  }, [comparison, canonicalSelection]);

  const selectCanonicalResidue = (position: number, atom?: ProteinAtom | null, sourceOverride?: CanonicalResidueSelection['structureSource']) => {
    if (!activeProtein) return;
    const canonicalSequence = activeProtein.canonicalSequence || activeProtein.sequence;
    if (position < 1 || position > canonicalSequence.length) return;
    const selectionSource = sourceOverride || (isAlphaFold ? 'ALPHAFOLD' : activeProtein.sourceType === 'EXPERIMENTAL' ? 'EXPERIMENTAL' : 'LOCAL');
    const isExperimentalSelection = selectionSource === 'EXPERIMENTAL';
    const mappingDetail = isExperimentalSelection ? (activeEvidenceDetail || comparisonDetail) : undefined;
    const mappedPdb = mappingDetail ? mapCanonicalToPdbResidue(mappingDetail, position, comparison?.chainId) : undefined;
    const canonicalAtom = atom || (mappedPdb ? (isExperimentalSelection ? (comparison?.experimentalAtoms || activeProtein.atoms).find((candidate) => candidate.chainID === mappedPdb.authorChainId && (candidate.authorResidueNumber || String(candidate.resSeq)) === mappedPdb.authorResidueNumber) : activeProtein.atoms.find((candidate) => candidate.chainID === mappedPdb.authorChainId && (candidate.authorResidueNumber || String(candidate.resSeq)) === mappedPdb.authorResidueNumber)) : null) || (!isExperimentalSelection ? activeProtein.atoms.find((candidate) => candidate.residueIndex === position) : null) || null;
    const displacement = comparison?.result.displacements.find((item) => item.canonicalPosition === position)?.value;
    const comparisonMappedPdb = comparison ? mapCanonicalToPdbResidue(comparison.detail, position, comparison.chainId) : undefined;
    setHighlightedResidue(position);
    setSelectedResidue(canonicalAtom);
    setCanonicalSelection({
      uniprotAccession: activeProtein.accession,
      canonicalPosition: position,
      aminoAcid: canonicalSequence[position - 1],
      structureSource: selectionSource,
      pdbId: isExperimentalSelection ? (activeProtein.pdbId || comparison?.reference.id) : activeProtein.pdbId,
      entityId: mappingDetail?.entityId,
      asymId: canonicalAtom?.chainID,
      authorChainId: canonicalAtom?.chainID,
      authorResidueNumber: canonicalAtom?.authorResidueNumber || (canonicalAtom ? String(canonicalAtom.resSeq) : undefined),
      mappedBy: isExperimentalSelection && mappingDetail && canonicalAtom && mapPdbResidueToCanonical(mappingDetail, canonicalAtom.chainID, canonicalAtom.authorResidueNumber || canonicalAtom.resSeq) ? 'SIFTS' : selectionSource === 'ALPHAFOLD' ? 'DIRECT' : 'NONE',
      plddt: selectionSource === 'ALPHAFOLD' ? canonicalAtom?.bFactor ?? undefined : undefined,
      comparisonDisplacement: displacement,
      comparisonPdbId: comparison ? comparison.reference.id : undefined,
      comparisonAuthorChainId: comparisonMappedPdb?.authorChainId,
      comparisonAuthorResidueNumber: comparisonMappedPdb?.authorResidueNumber,
    });
  };

  useEffect(() => {
    if (activeTab !== 'evidence' || !biology?.experimentalStructures.length || !activeProtein?.accession) return;
    const accession = activeProtein.accession;
    const pending = biology.experimentalStructures.filter((reference) => !evidenceDetails[reference.id]);
    if (!pending.length) return;
    let cancelled = false;
    setEvidenceLoading(true);
    const load = async () => {
      const results = await Promise.all(pending.map(async (reference) => {
        try {
          const base = `https://data.rcsb.org/rest/v1/core`;
          const entryResponse = await fetch(`${base}/entry/${reference.id.toUpperCase()}`);
          if (!entryResponse.ok) return [reference.id, parseRcsbEvidencePayload({}, reference.id, accession, activeProtein.sequence, 'NETWORK_ERROR')] as const;
          const entry = await entryResponse.json();
          const ids = entry?.rcsb_entry_container_identifiers || {};
          const polymerIds = Array.isArray(ids.polymer_entity_ids) ? ids.polymer_entity_ids : [];
          const nonpolymerIds = Array.isArray(ids.nonpolymer_entity_ids) ? ids.nonpolymer_entity_ids : [];
          const [polymerEntities, nonpolymerEntities] = await Promise.all([
            Promise.all(polymerIds.map((entityId: string) => fetch(`${base}/polymer_entity/${reference.id.toUpperCase()}/${entityId}`).then((response) => response.ok ? response.json() : null))),
            Promise.all(nonpolymerIds.map((entityId: string) => fetch(`${base}/nonpolymer_entity/${reference.id.toUpperCase()}/${entityId}`).then((response) => response.ok ? response.json() : null))),
          ]);
          const mappedChains = polymerEntities.flatMap((entity: any) => entity?.rcsb_polymer_entity_container_identifiers?.asym_ids || []);
          const polymerInstances = await Promise.all(mappedChains.map((asymId: string) => fetch(`${base}/polymer_entity_instance/${reference.id.toUpperCase()}/${asymId}`).then((response) => response.ok ? response.json() : null)));
          return [reference.id, parseRcsbEvidencePayload({ entry, polymerEntities, nonpolymerEntities, polymerInstances }, reference.id, accession, activeProtein.sequence)] as const;
        } catch {
          return [reference.id, parseRcsbEvidencePayload({}, reference.id, accession, activeProtein.sequence, 'NETWORK_ERROR')] as const;
        }
      }));
      if (!cancelled) {
        setEvidenceDetails((previous) => Object.fromEntries([...Object.entries(previous), ...results]));
        setEvidenceLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeTab, biology, activeProtein?.accession, activeProtein?.sequence, evidenceDetails]);

  useEffect(() => {
    setEvidenceDetails({});
  }, [activeProtein?.accession]);

  useEffect(() => {
    setComparison(null);
    setComparisonError(null);
  }, [activeProtein?.accession]);

  const resetAlphaFoldState = () => {
    setPae(null);
    setBiology(null);
    setColorMode('chain');
    setRawAlphaFoldStructure(null);
  };

  const clearErrors = () => {
    setErrorMessage(null);
    setErrorDetails(null);
    setNoticeMessage(null);
    setNoticeDetails(null);
    setMutationError(null);
    setIsFastqDetected(false);
  };

  const handleResetAnalysis = () => {
    requestRef.current.controller?.abort();
    requestRef.current = { id: requestRef.current.id + 1 };
    setActiveProtein(null);
    setProperties(null);
    setPae(null);
    setSelectedChain('ALL');
    setHighlightedResidue(null);
    setSelectedResidue(null);
    setCanonicalSelection(null);
    setMutationResult(null);
    setMutationError(null);
    setComparison(null);
    setComparisonError(null);
    setStructureFile(null);
    setSequenceFile(null);
    setPastedSequence('');
    setExecutionState('idle');
    setLoadSteps({ metadata: 'idle', model: 'idle', confidence: 'idle' });
    clearErrors();
    setActiveTab('structure');
  };

  const rejectFastq = () => {
    setIsFastqDetected(true);
    setErrorMessage(null);
    setErrorDetails(null);
    setExecutionState('idle');
    setActiveProtein(null);
    setProperties(null);
    resetAlphaFoldState();
    setBiology(null);
    setCanonicalSelection(null);
  };

  const handleStructureFiles = (files: { name: string; content?: string; file?: File }[]) => {
    const file = files[0];
    if (!file) return;
    const kind = classifyProteinStudioInput(file.name, file.content || '');
    if (kind === 'fastq') {
      setStructureFile(null);
      rejectFastq();
      return;
    }
    if (kind !== 'pdb' && kind !== 'cif') {
      setErrorMessage('Select a PDB or mmCIF structure file.');
      setErrorDetails('Protein Studio structure mode accepts .pdb, .cif, and .mmcif files.');
      return;
    }
    setStructureFile({
      name: file.name,
      size: file.file?.size || file.content?.length || 0,
      content: file.content || '',
      format: kind === 'pdb' ? 'PDB' : 'mmCIF',
    });
    clearErrors();
  };

  const handleSequenceFiles = (files: { name: string; content?: string; file?: File }[]) => {
    const file = files[0];
    if (!file) return;
    const kind = classifyProteinStudioInput(file.name, file.content || '');
    if (kind === 'fastq') {
      setSequenceFile(null);
      rejectFastq();
      return;
    }
    if (kind !== 'protein_fasta' && kind !== 'sequence_text') {
      setErrorMessage('Select a protein FASTA or plain amino-acid text file.');
      return;
    }
    setSequenceFile({
      name: file.name,
      size: file.file?.size || file.content?.length || 0,
      content: file.content || '',
      format: kind === 'protein_fasta' ? 'FASTA' : 'Text',
    });
    setPastedSequence('');
    setActiveProtein(null);
    setProperties(null);
    resetAlphaFoldState();
    setBiology(null);
    setMutationResult(null);
    setCanonicalSelection(null);
    clearErrors();
  };

  const handleLoadStructure = async (fileOverride?: SelectedFile) => {
    const fileToLoad = fileOverride || structureFile;
    if (!fileToLoad) {
      setErrorMessage('Please select or drop a PDB/mmCIF structure file.');
      return;
    }
    if (!fileToLoad.content) {
      setErrorMessage('Structure file content is not available.');
      setErrorDetails('Drop the file into the panel, or use browser file selection. Native path-only selection is not readable in this build.');
      return;
    }

    clearErrors();
    resetAlphaFoldState();
    setBiology(null);
    setExecutionState('loading');
    const { id } = startRequest();
    try {
      const sourceType = classifyStructureSource(fileToLoad.content, fileToLoad.name);
      const atoms = parsePdbAtoms(fileToLoad.content);
      if (!atoms.length) throw new Error('No C-alpha ATOM records were found. True mmCIF coordinate parsing is not available in this RC.');
      const sequence = atoms.map((atom) => atom.aa).join('');
      if (!isLatestRequest(id)) return;
      const chains = extractChainsFromAtoms(atoms);
      const protein: ActiveProtein = {
        title: fileToLoad.name,
        sourceType,
        sourceLabel: sourceType === 'EXPERIMENTAL' ? 'Experimental Structure' : 'Local Structure',
        locationLabel: 'LOCAL',
        structureType: sourceType === 'EXPERIMENTAL' ? 'Experimental / deposited coordinates' : 'Local coordinate file',
        pdbText: fileToLoad.content,
        sequence,
        canonicalSequence: sourceType === 'ALPHAFOLD_PREDICTED' ? sequence : undefined,
        sequenceLabel: 'Observed structure-derived sequence',
        chains,
        atoms,
      };
      setActiveProtein(protein);
      setCanonicalSelection(null);
      setSelectedChain('ALL');
      setActiveTab('structure');
      setColorMode(sourceType === 'ALPHAFOLD_PREDICTED' ? 'plddt' : 'chain');
      setProperties(await calculateProteinProperties(sequence));
      if (!isLatestRequest(id)) return;
      setExecutionState('idle');
    } catch (err) {
      if (!isLatestRequest(id)) return;
      setExecutionState('error');
      setErrorMessage('Structure could not be parsed.');
      setErrorDetails(err instanceof Error ? err.message : 'Unknown structure parsing error.');
    }
  };

  const handleTryStructureExample = async () => {
    setInputMode('structure');
    setExampleLoading('structure');
    clearErrors();
    try {
      const response = await fetch(exampleStructurePath);
      if (!response.ok) throw new Error(`Example structure returned HTTP ${response.status}`);
      const content = await response.text();
      const exampleFile: SelectedFile = {
        name: 'P00533_EGFR_AlphaFold.pdb',
        size: content.length,
        content,
        format: 'PDB',
      };
      setStructureFile(exampleFile);
      await handleLoadStructure(exampleFile);
    } catch (error) {
      setErrorMessage('The EGFR structure example could not be loaded.');
      setErrorDetails(error instanceof Error ? error.message : 'Local demo asset unavailable.');
    } finally {
      setExampleLoading(null);
    }
  };

  const handleTryUniProtExample = () => {
    setInputMode('uniprot');
    setUniprotAccession('P00533');
    setExampleLoading('uniprot');
    void handleFetchUniProt('P00533').finally(() => setExampleLoading(null));
  };

  const normalizeAlphaFoldMetadata = (data: unknown, accession: string): AlphaFoldMetadata | null => {
    if (!Array.isArray(data) || !data.length) return null;
    const exact = data.find((item) => typeof item?.uniprotAccession === 'string' && normalizeProteinAccession(item.uniprotAccession) === accession);
    const item = exact || data[0];
    if (!item || typeof item !== 'object') return null;
    return {
      pdbUrl: item.pdbUrl,
      cifUrl: item.cifUrl,
      entryId: item.entryId,
      paeDocUrl: item.paeDocUrl,
      plddtDocUrl: item.plddtDocUrl,
      accession: item.uniprotAccession || accession,
      entryName: item.uniprotId,
      proteinName: item.uniprotDescription,
      organism: item.organismScientificName,
      gene: item.gene,
      sequence: item.sequence || item.uniprotSequence,
    };
  };

  const fetchAlphaFoldMetadata = async (accession: string, signal: AbortSignal): Promise<AlphaFoldMetadata> => {
    let receivedValidEndpoint = false;
    for (const endpoint of [`https://alphafold.com/api/prediction/${encodeURIComponent(accession)}`, `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(accession)}`]) {
      try {
        const response = await fetch(endpoint, { signal, headers: { Accept: 'application/json' } });
        if (response.status === 404) continue;
        if (!response.ok) throw new AlphaFoldRetrievalError('METADATA_ENDPOINT_FAILURE', `AlphaFold DB metadata request failed with HTTP ${response.status}.`);
        receivedValidEndpoint = true;
        const metadata = normalizeAlphaFoldMetadata(await response.json(), accession);
        if (metadata) return metadata;
        throw new AlphaFoldRetrievalError('MODEL_NOT_FOUND', `No AlphaFold DB model was returned for accession "${accession}".`);
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
        if (error instanceof AlphaFoldRetrievalError && error.code === 'MODEL_NOT_FOUND') throw error;
        if (endpoint.startsWith('https://alphafold.ebi.ac.uk') && receivedValidEndpoint) throw error;
        if (endpoint.startsWith('https://alphafold.ebi.ac.uk')) throw new AlphaFoldRetrievalError('NETWORK_ERROR', 'Unable to contact the official AlphaFold DB metadata services.');
      }
    }
    throw new AlphaFoldRetrievalError('MODEL_NOT_FOUND', `No AlphaFold DB model was found for accession "${accession}".`);
  };

  const fetchUniProtBiology = async (accession: string, signal: AbortSignal): Promise<BiologyAnnotation | null> => {
    try {
      const response = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.json`, { signal });
      if (!response.ok) return null;
      return parseUniProtBiology(await response.json());
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      return null;
    }
  };

  const handleFetchUniProt = async (overrideAccession?: string) => {
    const accession = normalizeProteinAccession(overrideAccession || activeProtein?.accession || uniprotAccession);
    if (!/^[A-Z0-9]{6,10}(?:-\d+)?$/.test(accession)) {
      setExecutionState('error');
      setErrorMessage(`"${accession}" is not recognized as a valid UniProt accession format.`);
      setErrorDetails('Enter a valid UniProt accession such as a six-character reviewed accession.');
      return;
    }

    clearErrors();
    setExecutionState('loading');
    setLoadSteps({ metadata: 'loading', model: 'idle', confidence: 'idle' });
    resetAlphaFoldState();
    setUniprotAccession(accession);
    setCanonicalSelection(null);
    const { id, controller } = startRequest();

    try {
      const metadata = await fetchAlphaFoldMetadata(accession, controller.signal);
      const coordinateUrl = metadata.pdbUrl || metadata.cifUrl;
      if (!coordinateUrl) throw new AlphaFoldRetrievalError('COORDINATE_URL_NOT_FOUND', `AlphaFold DB metadata did not provide an official coordinate URL for accession "${accession}".`);
      if (!isLatestRequest(id)) return;
      setLoadSteps({ metadata: 'done', model: 'loading', confidence: 'idle' });

      const biologyData = await fetchUniProtBiology(accession, controller.signal);

      const pdbRes = await fetch(coordinateUrl, { signal: controller.signal });
      if (!pdbRes.ok) throw new AlphaFoldRetrievalError('COORDINATE_URL_NOT_FOUND', `The official AlphaFold coordinate file could not be retrieved (HTTP ${pdbRes.status}).`);
      const pdbText = await pdbRes.text();
      const coordinateFilename = /.mm?cif(?:\?|$)/i.test(coordinateUrl) ? `AF-${accession}-F1-model.cif` : `AF-${accession}-F1-model.pdb`;
      setRawAlphaFoldStructure({ text: pdbText, filename: coordinateFilename });
      const atoms = parsePdbAtoms(pdbText);
      const sequence = metadata.sequence || (await extractFastaFromPdb(pdbText)).toString().replace(/>.*/g, '').replace(/\s+/g, '');
      if (!atoms.length) throw new AlphaFoldRetrievalError('PARSE_ERROR', 'The official AlphaFold coordinate file did not contain readable C-alpha coordinates.');
      if (!isLatestRequest(id)) return;
      setLoadSteps({ metadata: 'done', model: 'done', confidence: 'loading' });

      let parsedPae: PaeMatrix | null = null;
      if (metadata.paeDocUrl) {
        try {
          const paeRes = await fetch(metadata.paeDocUrl, { signal: controller.signal });
          if (paeRes.ok) parsedPae = parsePaeJson(await paeRes.text(), sequence.length);
        } catch {
          parsedPae = null;
        }
      }

      if (!isLatestRequest(id)) return;
      const chains = extractChainsFromAtoms(atoms);
      const uploadedSeq = activeProtein?.sequence || (sequenceFile?.content ? parseProteinInput(sequenceFile.content).sequence : pastedSequence ? parseProteinInput(pastedSequence).sequence : undefined);

      let compatibility: SequenceCompatibility | undefined = undefined;
      if (uploadedSeq) {
        compatibility = await analyzeSequenceCompatibility(
          uploadedSeq,
          metadata.accession || accession,
          sequence,
          undefined,
          controller.signal
        );
      } else {
        compatibility = await analyzeSequenceCompatibility(
          sequence,
          metadata.accession || accession,
          sequence,
          undefined,
          controller.signal
        );
      }

      setActiveProtein({
        title: metadata.accession || accession,
        accession: metadata.accession || accession,
        entryName: metadata.entryName,
        proteinName: metadata.proteinName,
        organism: metadata.organism,
        gene: metadata.gene,
        sourceType: 'ALPHAFOLD_PREDICTED',
        sourceLabel: 'AlphaFold DB',
        locationLabel: 'ONLINE',
        structureType: 'Predicted Structure',
        pdbText,
        sequence: uploadedSeq || sequence,
        canonicalSequence: sequence,
        sequenceLabel: uploadedSeq && uploadedSeq !== sequence ? 'Uploaded FASTA sequence (canonical AlphaFold model rendered)' : 'UniProt sequence associated with AlphaFold DB model',
        chains,
        atoms,
        compatibility,
      });
      setPae(parsedPae);
      setBiology(biologyData);
      setProperties(await calculateProteinProperties(uploadedSeq || sequence));
      setColorMode('plddt');
      setSelectedChain('ALL');
      setActiveTab('structure');
      setLoadSteps({ metadata: 'done', model: 'done', confidence: parsedPae ? 'done' : 'error' });
      setExecutionState('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError' || !isLatestRequest(id)) return;
      setExecutionState('error');
      setLoadSteps((prev) => ({ ...prev, metadata: prev.metadata === 'loading' ? 'error' : prev.metadata, model: prev.model === 'loading' ? 'error' : prev.model }));
      const failure = err instanceof AlphaFoldRetrievalError ? err : new AlphaFoldRetrievalError('NETWORK_ERROR', err instanceof Error ? err.message : 'Network request failed.');
      setErrorMessage(failure.code === 'MODEL_NOT_FOUND' ? 'No AlphaFold DB model was found for this accession.' : failure.code === 'PARSE_ERROR' ? 'The AlphaFold DB model could not be parsed.' : 'AlphaFold DB retrieval failed.');
      setErrorDetails(`[${failure.code}] ${failure.message}`);
    }
  };

  const handleAnalyzeSequence = async (rawOverride?: string) => {
    const raw = rawOverride || sequenceFile?.content || pastedSequence;
    if (!raw.trim()) {
      setErrorMessage('Please upload a FASTA file or paste an amino-acid sequence.');
      return;
    }
    if (classifyProteinStudioInput(sequenceFile?.name || 'sequence.txt', raw) === 'fastq') {
      rejectFastq();
      return;
    }

    clearErrors();
    resetAlphaFoldState();
    setBiology(null);
    setExecutionState('loading');
    const { id, controller } = startRequest();
    try {
      const lookupIds = extractLookupIds(`${sequenceFile?.name || ''}\n${raw}`);
      let parsed = parseProteinInput(raw);

      // 1. Nucleotide mRNA Automatic Translation
      let isTranslated = false;
      let targetSequence = parsed.sequence;
      if (parsed.nucleotideWarning || (parsed.sequence.length > 20 && (parsed.sequence.match(/[ACGTU]/g) || []).length / parsed.sequence.length > 0.85)) {
        targetSequence = translateNucleotideToProtein(parsed.sequence);
        isTranslated = true;
        setNoticeMessage(`Nucleotide mRNA detected — Translated to protein sequence (${targetSequence.length} aa).`);
      }

      if (!targetSequence) throw new Error('No valid sequence could be extracted or translated.');

      // 2. Resolve Identifier Mapping (UniProt, RefSeq, GenBank)
      const header = parsed.header;
      const rawAcc = header?.accession || lookupIds.uniprotAccessions[0] || sequenceFile?.name.split('.')[0];
      const resolvedMapping = await resolveUniProtAccession(rawAcc || '', header?.headerRaw, targetSequence);

      const finalAccession = resolvedMapping?.accession || header?.accession || (lookupIds.uniprotAccessions.length > 0 ? lookupIds.uniprotAccessions[0] : undefined);
      const mappedFrom = resolvedMapping?.mappedFrom || (finalAccession !== rawAcc ? rawAcc : undefined);
      const finalProteinName = resolvedMapping?.proteinName || header?.proteinName || 'Protein sequence';
      const finalOrganism = resolvedMapping?.organism || header?.organism;

      let canonicalSeq: string | undefined = undefined;
      if (finalAccession) {
        canonicalSeq = (await fetchUniProtCanonicalSequence(finalAccession, controller.signal)) || undefined;
      }

      const compatibility = await analyzeSequenceCompatibility(
        targetSequence,
        finalAccession,
        canonicalSeq,
        undefined,
        controller.signal
      );

      setActiveProtein({
        title: finalAccession ? `${finalAccession} · ${header?.entryName || finalProteinName}` : sequenceFile?.name || 'Analyzed Protein Sequence',
        accession: finalAccession,
        mappedFrom,
        entryName: header?.entryName,
        proteinName: finalProteinName,
        organism: finalOrganism,
        gene: header?.gene,
        sourceType: 'SEQUENCE_ONLY',
        sourceLabel: isTranslated ? 'Translated mRNA Sequence' : header?.pdbId ? `Protein Sequence · PDB ${header.pdbId}` : 'Protein Sequence',
        locationLabel: 'LOCAL',
        structureType: 'No coordinates',
        pdbText: '',
        sequence: targetSequence,
        canonicalSequence: canonicalSeq || (finalAccession ? targetSequence : undefined),
        rawFastaText: raw,
        sequenceLabel: isTranslated ? 'Translated protein amino-acid sequence' : 'Sequence-only amino-acid input',
        chains: [],
        atoms: [],
        compatibility,
      });
      setProperties(await calculateProteinProperties(targetSequence));
      if (!isLatestRequest(id)) return;
      setActiveTab('structure');
      setExecutionState('idle');
    } catch (err) {

      if (!isLatestRequest(id)) return;
      setExecutionState('error');
      setErrorMessage('Invalid FASTA or amino-acid sequence input.');
      setErrorDetails(err instanceof Error ? err.message : 'Unable to parse sequence input.');
    }
  };

  const handleTrySequenceExample = () => {
    setInputMode('sequence');
    setSequenceFile(null);
    setPastedSequence(exampleProteinFasta);
    clearErrors();
    setExampleLoading('sequence');
    void handleAnalyzeSequence(exampleProteinFasta).finally(() => setExampleLoading(null));
  };

  const handleMutationInspect = () => {
    if (!activeProtein) return;
    const validation = validateMutationInput(mutationNotation, activeProtein.canonicalSequence || activeProtein.sequence);
    if (!validation.ok) {
      setMutationResult(null);
      setMutationError(validation.error || 'Invalid mutation.');
      return;
    }
    const description = describeMutation(validation);
    setMutationError(null);
    setMutationResult(description);
    if (validation.position) selectCanonicalResidue(validation.position);
  };

  const handleOpenExperimentalStructure = async (reference: BiologyAnnotation['experimentalStructures'][number]) => {
    clearErrors();
    setComparison(null);
    setComparisonError(null);
    setExecutionState('loading');
    const { id, controller } = startRequest();
    try {
      const response = await fetch(`https://files.rcsb.org/download/${reference.id.toUpperCase()}.pdb`, { signal: controller.signal });
      if (!response.ok) throw new Error(`RCSB PDB request failed with HTTP ${response.status}.`);
      const pdbText = await response.text();
      const atoms = parsePdbAtoms(pdbText);
      if (!atoms.length) throw new Error('No readable C-alpha coordinates were found.');
      if (!isLatestRequest(id)) return;
      setActiveProtein((previous) => ({
        title: reference.id.toUpperCase(),
        pdbId: reference.id.toUpperCase(),
        accession: previous?.accession,
        proteinName: previous?.proteinName,
        organism: previous?.organism,
        gene: previous?.gene,
        sourceType: 'EXPERIMENTAL',
        sourceLabel: 'Experimental Structure',
        locationLabel: 'ONLINE',
        structureType: reference.method || 'Experimental / deposited coordinates',
        pdbText,
        sequence: atoms.map((atom) => atom.aa).join(''),
        canonicalSequence: previous?.canonicalSequence || previous?.sequence,
        sequenceLabel: 'Observed structure-derived sequence',
        chains: extractChainsFromAtoms(atoms),
        atoms,
      }));
      setPae(null);
      setSelectedResidue(null);
      setMutationResult(null);
      setActiveTab('structure');
      setColorMode('chain');
      setSelectedChain('ALL');
      setProperties(await calculateProteinProperties(atoms.map((atom) => atom.aa).join('')));
      setExecutionState('idle');
    } catch (error) {
      if ((error as Error).name === 'AbortError' || !isLatestRequest(id)) return;
      setExecutionState('error');
      setErrorMessage('Experimental structure could not be loaded.');
      setErrorDetails(error instanceof Error ? error.message : 'RCSB PDB request failed.');
    }
  };

  const handleCompareExperimentalStructure = async (reference: BiologyAnnotation['experimentalStructures'][number], detail: ExperimentalEvidenceDetail) => {
    if (!activeProtein || !isAlphaFold || detail.mappingStatus !== 'MAPPED_EXPLICITLY' || !detail.chains.length) return;
    clearErrors();
    setComparisonError(null);
    setComparisonLoading(true);
    const { id, controller } = startRequest();
    try {
      const response = await fetch(`https://files.rcsb.org/download/${reference.id.toUpperCase()}.pdb`, { signal: controller.signal });
      if (!response.ok) throw new Error(`RCSB PDB request failed with HTTP ${response.status}.`);
      const experimentalPdbText = await response.text();
      const experimentalAtoms = parsePdbAtoms(experimentalPdbText);
      const chainId = detail.chains[0];
      const result = buildStructureComparisonPairs(activeProtein.atoms, experimentalAtoms, detail, chainId, activeProtein.canonicalSequence || activeProtein.sequence);
      if (!isLatestRequest(id)) return;
      setComparison({ reference, detail, experimentalPdbText, experimentalAtoms, chainId, result });
      setComparisonShowAlphaFold(true);
      setComparisonShowExperimental(true);
      setComparisonMatchedOnly(false);
      setActiveTab('structure');
    } catch (error) {
      if ((error as Error).name === 'AbortError' || !isLatestRequest(id)) return;
      setComparisonError(error instanceof Error ? error.message : 'Comparison could not be calculated.');
    } finally {
      if (isLatestRequest(id)) setComparisonLoading(false);
    }
  };

  const handleComparisonChainChange = (chainId: string) => {
    if (!comparison || !activeProtein) return;
    try {
      const result = buildStructureComparisonPairs(activeProtein.atoms, comparison.experimentalAtoms, comparison.detail, chainId, activeProtein.canonicalSequence || activeProtein.sequence);
      setComparison({ ...comparison, chainId, result });
      if (canonicalSelection?.canonicalPosition) {
        const mapped = mapCanonicalToPdbResidue(comparison.detail, canonicalSelection.canonicalPosition, chainId);
        setCanonicalSelection({
          ...canonicalSelection,
          comparisonPdbId: mapped ? comparison.reference.id : undefined,
          comparisonAuthorChainId: mapped?.authorChainId,
          comparisonAuthorResidueNumber: mapped?.authorResidueNumber,
          comparisonDisplacement: result.displacements.find((item) => item.canonicalPosition === canonicalSelection.canonicalPosition)?.value,
        });
      }
      setComparisonError(null);
    } catch (error) {
      setComparisonError(error instanceof Error ? error.message : 'Comparison could not be calculated for this chain.');
    }
  };

  const copySequence = (asFasta: boolean) => {
    if (!activeProtein) return;
    navigator.clipboard.writeText(asFasta ? `>${activeProtein.title}\n${activeProtein.sequence}` : activeProtein.sequence);
    if (asFasta) {
      setCopiedFasta(true);
      setTimeout(() => setCopiedFasta(false), 1600);
    } else {
      setCopiedSeq(true);
      setTimeout(() => setCopiedSeq(false), 1600);
    }
  };

  return (
    <div className="w-full px-4 sm:px-5 lg:px-6 xl:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Protein Studio</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Structure visualization, sequence-derived properties, and AlphaFold DB uncertainty interpretation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeProtein && (
            <button onClick={handleResetAnalysis} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Scientific Workstation</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <aside className="min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-600" />
              <span>Input</span>
            </h3>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              {[
                ['structure', 'Structure File'],
                ['uniprot', 'UniProt'],
                ['sequence', 'Protein Sequence'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setInputMode(mode as InputMode);
                    clearErrors();
                  }}
                  className={`py-1.5 rounded-md text-[11px] transition-all ${inputMode === mode ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Try an example</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Explore the three Protein Studio input workflows without preparing your own file.</p>
            <div className="mt-3 grid gap-2">
              <button onClick={() => void handleTryStructureExample()} disabled={exampleLoading !== null} className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-900">
                <span>Structure file · EGFR PDB</span>
                {exampleLoading === 'structure' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5 text-sky-600" />}
              </button>
              <button onClick={handleTryUniProtExample} disabled={exampleLoading !== null} className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-900">
                <span>UniProt · P00533 EGFR</span>
                {exampleLoading === 'uniprot' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 text-sky-600" />}
              </button>
              <button onClick={handleTrySequenceExample} disabled={exampleLoading !== null} className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-900">
                <span>Protein sequence · EGFR</span>
                {exampleLoading === 'sequence' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Dna className="h-3.5 w-3.5 text-sky-600" />}
              </button>
            </div>
          </div>

          {isFastqDetected && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>FASTQ sequencing data detected</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Protein Studio analyzes protein sequences and structures. Open this file in Sequencing QC instead.
              </p>
              <button onClick={() => onNavigate?.('home')} className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">
                Return to Home
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs space-y-1">
              <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Input Notice</span>
              </div>
              <p className="text-rose-800 dark:text-rose-300 leading-snug">{errorMessage}</p>
              {errorDetails && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">{errorDetails}</p>}
            </div>
          )}

          {noticeMessage && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-lg text-xs space-y-1">
              <div className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>Input Notice</span>
              </div>
              <p className="text-sky-800 dark:text-sky-300 leading-snug">{noticeMessage}</p>
              {noticeDetails && <p className="text-[11px] text-sky-700 dark:text-sky-300 font-mono">{noticeDetails}</p>}
            </div>
          )}

          {inputMode === 'structure' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase">Load Structure</h4>
                <p className="text-[11px] text-slate-500 mt-1">Visualize an existing PDB coordinate file. mmCIF parsing is limited in this RC.</p>
              </div>
              <FileUploader accept=".pdb,.cif,.mmcif,.ent" label="Drop PDB or mmCIF" description="Supported: .pdb, .cif, .mmcif" onFileSelected={handleStructureFiles} />
              {structureFile && <FileCard file={structureFile} onClear={() => setStructureFile(null)} />}
              <button disabled={!structureFile || executionState === 'loading'} onClick={() => void handleLoadStructure()} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                <span>Load Structure</span>
              </button>
            </div>
          )}

          {inputMode === 'uniprot' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase">UniProt / AlphaFold DB</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Retrieve protein metadata and an available AlphaFold DB predicted structure.</p>
                </div>
                <OnlineBadge />
              </div>
              <input value={uniprotAccession} onChange={(e) => setUniprotAccession(e.target.value)} placeholder="UniProt accession" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <div className="flex flex-wrap gap-1.5 text-[11px]">
              </div>
              <button disabled={!uniprotAccession.trim() || executionState === 'loading'} onClick={() => handleFetchUniProt()} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{executionState === 'loading' ? `Fetching ${uniprotAccession.toUpperCase()}` : 'Fetch Structure'}</span>
              </button>
              {executionState === 'loading' && <LoadingSteps steps={loadSteps} />}
            </div>
          )}

          {inputMode === 'sequence' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase">Protein Sequence</h4>
                <p className="text-[11px] text-slate-500 mt-1">Analyze amino-acid properties without fabricating coordinates.</p>
              </div>
              <FileUploader accept=".fasta,.fa,.faa,.txt" label="Drop protein FASTA" description="Supported: .fasta, .fa, .faa, .txt" onFileSelected={handleSequenceFiles} />
              {sequenceFile && <FileCard file={sequenceFile} onClear={() => setSequenceFile(null)} />}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="protein-sequence-text" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {sequenceFile ? 'Uploaded FASTA' : 'Paste FASTA or sequence'}
                  </label>
                  {sequenceFile && <span className="text-[10px] font-mono text-slate-400">Loaded from file</span>}
                </div>
              <textarea
                id="protein-sequence-text"
                value={sequenceFile?.content || pastedSequence}
                onChange={(e) => {
                  setPastedSequence(e.target.value);
                  if (e.target.value.trim()) setSequenceFile(null);
                }}
                placeholder="Paste a FASTA header and amino-acid sequence here..."
                className="w-full h-40 p-3 font-mono text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
              />
              </div>
              <button disabled={(!sequenceFile && !pastedSequence.trim()) || executionState === 'loading'} onClick={() => void handleAnalyzeSequence()} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Analyze Sequence</span>
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Network only on explicit online fetch</span>
            <span>RC</span>
          </div>
        </aside>

        <main className="min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          {!activeProtein ? (
            <EmptyWorkspace />
          ) : (
            <>
              <ActiveHeader protein={activeProtein} onOpenAlignment={() => setShowAlignmentModal(true)} />
              <MetricCards protein={activeProtein} properties={properties} structureMetric={structureMetric} />
              <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
              {canonicalSelection && <ResidueInspector selection={canonicalSelection} atom={selectedResidue} protein={activeProtein} />}
              {comparisonError && <p className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">Comparison unavailable: {comparisonError}</p>}

              {activeTab === 'structure' && (
                <div className="space-y-4">
                  <Pdb3DViewer
                    pdbText={activeProtein.pdbText}
                    filename={activeProtein.title}
                    isAlphaFoldModel={isAlphaFold}
                    selectedChain={selectedChain}
                    colorModeOverride={colorMode}
                    renderModeOverride={renderMode}
                    detectedAccession={activeProtein.accession}
                    mappedFrom={activeProtein.mappedFrom}
                    detectedProteinName={activeProtein.proteinName}
                    detectedOrganism={activeProtein.organism}

                    onFetchAlphaFoldRequested={(acc) => handleFetchUniProt(acc)}
                    highlightedResidue={structureHighlightResidue}
                    overlayHighlightedResidue={comparisonHighlightResidue}
                    overlayPdbText={comparisonOverlayPdb}
                    overlayVisible={Boolean(comparison && comparisonShowExperimental)}
                    primaryVisible={!comparison || comparisonShowAlphaFold}
                    onResidueSelected={(atom) => {
                      const clickedExperimental = atom.structureSource === 'EXPERIMENTAL';
                      const mappingDetail = clickedExperimental ? (comparison?.detail || activeEvidenceDetail) : activeEvidenceDetail;
                      const canonicalPosition = clickedExperimental
                        ? mappingDetail ? mapPdbResidueToCanonical(mappingDetail, atom.chainID, atom.authorResidueNumber || atom.resSeq) : undefined
                        : isAlphaFold ? atom.residueIndex : undefined;
                      if (canonicalPosition) selectCanonicalResidue(canonicalPosition, atom, clickedExperimental ? 'EXPERIMENTAL' : 'ALPHAFOLD');
                      else {
                        setSelectedResidue(atom);
                        setCanonicalSelection({ structureSource: clickedExperimental ? 'EXPERIMENTAL' : isAlphaFold ? 'ALPHAFOLD' : 'LOCAL', pdbId: clickedExperimental ? comparison?.reference.id : activeProtein.pdbId, authorChainId: atom.chainID, authorResidueNumber: atom.authorResidueNumber || String(atom.resSeq), aminoAcid: atom.aa, mappedBy: 'NONE', plddt: !clickedExperimental && isAlphaFold ? atom.bFactor ?? undefined : undefined });
                      }
                    }}
                  />
                  {import.meta.env.DEV && isAlphaFold && rawAlphaFoldStructure && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(new Blob([rawAlphaFoldStructure.text], { type: 'text/plain' }));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = activeProtein.accession === 'P00533'
                          ? `P00533_EGFR_AlphaFold${rawAlphaFoldStructure.filename.endsWith('.cif') ? '.cif' : '.pdb'}`
                          : rawAlphaFoldStructure.filename;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-sky-500"
                    >
                      Save Current Structure
                    </button>
                  )}
                  {activeProtein.pdbText && (
                    <ViewerControls
                      chains={activeProtein.chains}
                      selectedChain={selectedChain}
                      setSelectedChain={setSelectedChain}
                      renderMode={renderMode}
                      setRenderMode={setRenderMode}
                      colorMode={colorMode}
                      setColorMode={setColorMode}
                      isAlphaFold={isAlphaFold}
                    />
                  )}
                  {comparison && <ComparisonPanel comparison={comparison} showAlphaFold={comparisonShowAlphaFold} showExperimental={comparisonShowExperimental} matchedOnly={comparisonMatchedOnly} setShowAlphaFold={setComparisonShowAlphaFold} setShowExperimental={setComparisonShowExperimental} setMatchedOnly={setComparisonMatchedOnly} onExit={() => setComparison(null)} onChainChange={handleComparisonChainChange} onSelectResidue={(position) => selectCanonicalResidue(position)} />}
                  {comparisonLoading && <p className="text-xs text-sky-600">Calculating canonical Cα correspondence and rigid-body superposition...</p>}
                </div>
              )}

              {activeTab === 'confidence' && (
                <ConfidenceTab protein={activeProtein} plddtSummary={plddtSummary} pae={pae} biology={biology} selection={canonicalSelection} />
              )}

              {activeTab === 'sequence' && (
                <SequenceTab protein={activeProtein} properties={properties} copiedSeq={copiedSeq} copiedFasta={copiedFasta} onCopy={copySequence} onSelectResidue={(position) => selectCanonicalResidue(position)} />
              )}

              {activeTab === 'biology' && (
                <BiologyTab biology={biology} selection={canonicalSelection} onSelectFeature={(position) => { selectCanonicalResidue(position); setActiveTab('structure'); }} protein={activeProtein} />
              )}

              {activeTab === 'evidence' && (
                <EvidenceTab biology={biology} protein={activeProtein} details={evidenceDetails} loading={evidenceLoading} selection={canonicalSelection} canCompare={isAlphaFold} onCompare={handleCompareExperimentalStructure} onOpenStructure={handleOpenExperimentalStructure} />
              )}

              {activeTab === 'mutation' && (
                <MutationTab
                  notation={mutationNotation}
                  setNotation={setMutationNotation}
                  onInspect={handleMutationInspect}
                  selection={canonicalSelection}
                  result={mutationResult}
                  error={mutationError}
                  highlightedResidue={highlightedResidue}
                  selectedAtom={selectedResidue}
                  nearbyResidues={activeProtein.atoms.length && (selectedResidue?.residueIndex || highlightedResidue) ? findNearbyResidues(activeProtein.atoms, selectedResidue?.residueIndex || highlightedResidue || 0) : []}
                  isAlphaFold={isAlphaFold}
                  biology={biology}
                  protein={activeProtein}
                />
              )}

              {activeProtein?.compatibility && (
                <SequenceAlignmentModal
                  compatibility={activeProtein.compatibility}
                  isOpen={showAlignmentModal}
                  onClose={() => setShowAlignmentModal(false)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const OnlineBadge = () => (
  <span title="This request sends the accession identifier to external scientific databases. Local sequence and structure files are not uploaded." className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
    <Globe className="w-3 h-3" />
    <span>ONLINE</span>
  </span>
);

const FileCard = ({ file, onClear }: { file: SelectedFile; onClear: () => void }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-bold font-mono truncate">{file.name}</div>
        <div className="text-[10px] text-slate-500 font-mono">{file.format} · {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'content pending'}</div>
      </div>
      <button onClick={onClear} className="text-rose-600 hover:underline text-[11px] font-semibold">Remove</button>
    </div>
  </div>
);


const LoadingSteps = ({ steps }: { steps: Record<LoadStep, 'idle' | 'loading' | 'done' | 'error'> }) => {
  const label = (state: string) => (state === 'done' ? '✓' : state === 'loading' ? '○' : state === 'error' ? '!' : '○');
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1 font-mono">
      <div>{label(steps.metadata)} UniProt metadata</div>
      <div>{label(steps.model)} AlphaFold DB model</div>
      <div>{label(steps.confidence)} Confidence data</div>
    </div>
  );
};

const EmptyWorkspace = () => (
  <div className="space-y-5">
    <div>
      <h3 className="font-bold text-lg">Active Protein</h3>
      <p className="text-xs text-slate-500 mt-1">Choose one input workflow: structure file, UniProt accession, or protein sequence.</p>
    </div>
    <Pdb3DViewer pdbText="" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <InfoCard icon={<Layers className="w-4 h-4 text-sky-600" />} title="Structure File" text="Visualize existing PDB coordinates locally." />
      <InfoCard icon={<Globe className="w-4 h-4 text-sky-600" />} title="UniProt" text="Retrieve AlphaFold DB predicted models online." />
      <InfoCard icon={<Dna className="w-4 h-4 text-sky-600" />} title="Protein Sequence" text="Analyze amino-acid properties without coordinates." />
    </div>
  </div>
);

const InfoCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1">
    <div className="font-bold text-xs flex items-center gap-1.5">{icon}<span>{title}</span></div>
    <p className="text-[11px] text-slate-500">{text}</p>
  </div>
);

 const SequenceRelationshipBadge = ({ compatibility }: { compatibility?: SequenceCompatibility }) => {
  if (!compatibility) return null;
  const rel = compatibility.relationship;

  let label = 'EXACT CANONICAL MATCH';
  let style = 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  if (rel === 'ISOFORM_EXACT') {
    label = `EXACT ISOFORM MATCH ${compatibility.matchedIsoformId ? `(${compatibility.matchedIsoformId})` : ''}`;
    style = 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
  } else if (rel === 'CANONICAL_WITH_SUBSTITUTIONS') {
    label = `SEQUENCE VARIANT (${compatibility.substitutions} substitution${compatibility.substitutions > 1 ? 's' : ''})`;
    style = 'bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
  } else if (rel === 'ISOFORM_WITH_DIFFERENCES') {
    label = `ISOFORM WITH DIFFERENCES ${compatibility.matchedIsoformId ? `(${compatibility.matchedIsoformId})` : ''}`;
    style = 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
  } else if (rel === 'PARTIAL') {
    label = `PARTIAL / DIFFERING SEQUENCE (${compatibility.identity}%)`;
    style = 'bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
  } else if (rel === 'UNRELATED_OR_UNRESOLVED') {
    label = 'UNRESOLVED / LOCAL SEQUENCE';
    style = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] font-mono ${style}`}>
      {label}
    </span>
  );
};

const CanonicalReferenceWarningBanner = ({ compatibility, onOpenAlignment }: { compatibility: SequenceCompatibility; onOpenAlignment: () => void }) => {
  if (compatibility.relationship === 'CANONICAL_EXACT' || compatibility.relationship === 'UNRELATED_OR_UNRESOLVED') return null;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl space-y-2 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Canonical reference model</span>
        </div>
        <span className="px-2.5 py-1 rounded text-[10px] font-bold font-mono bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
          {compatibility.relationship.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
        This AlphaFold DB model represents the UniProt canonical sequence ({compatibility.canonicalLength} aa), not the exact uploaded FASTA sequence ({compatibility.uploadedLength} aa).
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] bg-amber-100/60 dark:bg-amber-900/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
        <div>Identity: <span className="font-bold">{compatibility.identity}%</span></div>
        <div>Substitutions: <span className="font-bold">{compatibility.substitutions}</span></div>
        <div>Insertions: <span className="font-bold">{compatibility.insertions}</span></div>
        <div>Deletions: <span className="font-bold">{compatibility.deletions}</span></div>
      </div>
      <div className="pt-1 flex items-center justify-between">
        <span className="text-[11px] text-amber-700 dark:text-amber-400 italic">Do not imply AlphaFold predicted the exact uploaded isoform or variant.</span>
        <button onClick={onOpenAlignment} className="text-sky-700 dark:text-sky-300 hover:underline font-bold text-[11px]">
          [ View sequence alignment ]
        </button>
      </div>
    </div>
  );
};

const SequenceAlignmentModal = ({ compatibility, isOpen, onClose }: {
  compatibility: SequenceCompatibility;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !compatibility.alignmentResult) return null;
  const { alignedUploaded, alignedCanonical, identity, substitutions, insertions, deletions } = compatibility.alignmentResult;

  const blocks: Array<{ uStart: number; uEnd: number; cStart: number; cEnd: number; uSeq: string; matchLine: string; cSeq: string }> = [];
  let uPos = 0;
  let cPos = 0;

  for (let i = 0; i < alignedUploaded.length; i += 60) {
    const chunkU = alignedUploaded.substring(i, i + 60);
    const chunkC = alignedCanonical.substring(i, i + 60);

    const uStart = uPos + 1;
    const cStart = cPos + 1;

    let matchLine = '';
    for (let k = 0; k < chunkU.length; k++) {
      const uChar = chunkU[k];
      const cChar = chunkC[k];
      if (uChar !== '-') uPos++;
      if (cChar !== '-') cPos++;

      if (uChar === cChar && uChar !== '-') matchLine += '|';
      else if (uChar !== '-' && cChar !== '-') matchLine += '*';
      else matchLine += ' ';
    }

    blocks.push({
      uStart,
      uEnd: uPos,
      cStart,
      cEnd: cPos,
      uSeq: chunkU,
      matchLine,
      cSeq: chunkC,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Dna className="w-5 h-5 text-sky-600" />
              <span>Sequence Alignment — Uploaded FASTA vs UniProt Canonical</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic global Needleman-Wunsch alignment for coordinate correspondence.
            </p>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold">
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs">
          <Metric label="IDENTITY" value={`${identity}%`} />
          <Metric label="SUBSTITUTIONS" value={String(substitutions)} />
          <Metric label="INSERTIONS" value={String(insertions)} />
          <Metric label="DELETIONS" value={String(deletions)} />
        </div>

        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-6 bg-slate-950 text-slate-100 p-4 rounded-xl">
          {blocks.map((block, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Uploaded [{block.uStart}..{block.uEnd}]</span>
                <span>Canonical [{block.cStart}..{block.cEnd}]</span>
              </div>
              <div className="tracking-widest overflow-x-auto">
                <div className="text-emerald-400">U: {block.uSeq}</div>
                <div className="text-slate-500 leading-none">   {block.matchLine}</div>
                <div className="text-sky-400 font-bold">C: {block.cSeq}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActiveHeader = ({ protein, onOpenAlignment }: { protein: ActiveProtein; onOpenAlignment: () => void }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
      <div>
        <h3 className="font-bold text-lg">{protein.title}</h3>
        <p className="text-xs text-slate-500 mt-1">
          {[protein.proteinName, protein.organism, protein.gene ? `Gene ${protein.gene}` : ''].filter(Boolean).join(' · ') || protein.sequenceLabel}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <SequenceRelationshipBadge compatibility={protein.compatibility} />
        <span className="px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{protein.sourceLabel}</span>
        <span className="px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{protein.structureType}</span>
        <span className={`px-2.5 py-1 rounded-lg border ${protein.locationLabel === 'ONLINE' ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>{protein.locationLabel}</span>
      </div>
    </div>

    {protein.compatibility && protein.sourceType === 'ALPHAFOLD_PREDICTED' && (
      <CanonicalReferenceWarningBanner compatibility={protein.compatibility} onOpenAlignment={onOpenAlignment} />
    )}
  </div>
);

const MetricCards = ({ protein, properties, structureMetric }: { protein: ActiveProtein; properties: ProteinProperties | null; structureMetric: { label: string; value: string } }) => (
  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
    <Metric label="LENGTH" value={hasProteinProperties(properties) ? `${properties.length} aa` : protein.sequence ? `${protein.sequence.length} aa` : '-'} />
    <Metric label="MOLECULAR MASS" value={hasProteinProperties(properties) ? `${properties.molecular_weight_kda.toFixed(2)} kDa` : '-'} />
    <Metric label="ESTIMATED pI" value={hasProteinProperties(properties) ? properties.isoelectric_point_pi.toFixed(2) : '-'} />
    <Metric label={structureMetric.label} value={structureMetric.value} />
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800">
    <div className="text-slate-500 font-semibold text-[11px]">{label}</div>
    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
  </div>
);

const TabBar = ({ activeTab, setActiveTab }: { activeTab: WorkspaceTab; setActiveTab: (tab: WorkspaceTab) => void }) => (
  <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
    {(['structure', 'confidence', 'biology', 'evidence', 'sequence', 'mutation'] as WorkspaceTab[]).map((tab) => (
      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 rounded-md capitalize ${activeTab === tab ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>
        {tab}
      </button>
    ))}
  </div>
);

const ViewerControls = (props: {
  chains: string[];
  selectedChain: string;
  setSelectedChain: (value: string) => void;
  renderMode: 'ribbon' | 'trace' | 'spheres';
  setRenderMode: (value: 'ribbon' | 'trace' | 'spheres') => void;
  colorMode: 'plddt' | 'chain' | 'spectrum' | 'bfactor';
  setColorMode: (value: 'plddt' | 'chain' | 'spectrum' | 'bfactor') => void;
  isAlphaFold: boolean;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg text-xs">
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500 font-semibold">Style:</span>
      {[
        ['ribbon', 'Ribbon'],
        ['trace', 'Backbone'],
        ['spheres', 'Cα'],
      ].map(([value, label]) => (
        <button key={value} onClick={() => props.setRenderMode(value as 'ribbon' | 'trace' | 'spheres')} className={`px-2 py-1 rounded font-semibold ${props.renderMode === value ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{label}</button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-slate-500 font-semibold">Chain:</span>
      <select value={props.selectedChain} onChange={(e) => props.setSelectedChain(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold">
        <option value="ALL">All Chains ({props.chains.length || '-'})</option>
        {props.chains.map((chain) => <option key={chain} value={chain}>Chain {chain}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500 font-semibold">Color:</span>
      {(props.isAlphaFold ? ['plddt', 'chain', 'spectrum'] : ['bfactor', 'chain', 'spectrum']).map((mode) => (
        <button key={mode} onClick={() => props.setColorMode(mode as 'plddt' | 'chain' | 'spectrum' | 'bfactor')} className={`px-2 py-1 rounded font-semibold ${props.colorMode === mode ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{mode === 'plddt' ? 'pLDDT' : mode === 'bfactor' ? 'B-Factor' : mode}</button>
      ))}
    </div>
  </div>
);

const ResidueCard = ({ atom, isAlphaFold }: { atom: ProteinAtom; isAlphaFold: boolean }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs grid grid-cols-2 md:grid-cols-5 gap-2">
    <Metric label="RESIDUE" value={`${atom.residueIndex}`} />
    <Metric label="AMINO ACID" value={`${atom.resName} (${atom.aa})`} />
    <Metric label="PDB POSITION" value={`${atom.aa}${atom.resSeq}`} />
    <Metric label="CHAIN" value={atom.chainID} />
    <Metric label={isAlphaFold ? 'pLDDT' : 'B-FACTOR'} value={atom.bFactor === null ? '-' : atom.bFactor.toFixed(1)} />
  </div>
);

const ResidueInspector = ({ selection, atom, protein }: { selection: CanonicalResidueSelection; atom: ProteinAtom | null; protein: ActiveProtein }) => {
  const comp = protein.compatibility;
  const canonicalPos = selection.canonicalPosition;
  const uploadedPos = canonicalPos && comp?.alignmentResult?.canonicalToUploaded
    ? comp.alignmentResult.canonicalToUploaded[canonicalPos]
    : undefined;

  const uploadedAA = uploadedPos ? protein.sequence[uploadedPos - 1] : undefined;
  const canonicalAA = canonicalPos && comp?.canonicalSequence ? comp.canonicalSequence[canonicalPos - 1] : selection.aminoAcid || atom?.aa;

  return (
    <section className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-sky-900 dark:text-sky-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600" />
          <span>Unified Residue Inspector</span>
        </h4>
        {comp && comp.relationship !== 'CANONICAL_EXACT' && comp.relationship !== 'UNRELATED_OR_UNRESOLVED' && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            Dual Coordinates Mode
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="UNIPROT" value={selection.uniprotAccession || 'Not available'} />
        <Metric
          label="UPLOADED FASTA POS"
          value={uploadedPos ? `${uploadedPos} (${uploadedAA || '-'})` : comp?.relationship !== 'CANONICAL_EXACT' ? 'Not present in uploaded sequence' : (canonicalPos ? `${canonicalPos} (${canonicalAA || '-'})` : 'Unavailable')}
        />
        <Metric
          label="CANONICAL 3D POS"
          value={canonicalPos ? `${canonicalPos} (${canonicalAA || '-'})` : 'Not represented in 3D model'}
        />
        <Metric label="CURRENT STRUCTURE" value={selection.structureSource === 'EXPERIMENTAL' ? `${selection.pdbId || protein.pdbId || 'PDB'} · Experimental` : protein.sourceType === 'ALPHAFOLD_PREDICTED' ? 'AlphaFold DB' : 'Local structure'} />
      </div>

      {comp && comp.relationship !== 'CANONICAL_EXACT' && comp.relationship !== 'UNRELATED_OR_UNRESOLVED' && canonicalPos && (
        <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-sky-200 dark:border-sky-800 text-[11px] space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Sequence Relationship Mapping:
          </div>
          {uploadedPos ? (
            <div>
              Uploaded residue <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{uploadedAA}{uploadedPos}</span> maps to canonical 3D model residue <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{canonicalAA}{canonicalPos}</span>.
              {uploadedAA !== canonicalAA && (
                <span className="ml-1 text-amber-700 dark:text-amber-400 font-bold">
                  (Sequence difference: Uploaded {uploadedAA} vs Canonical {canonicalAA})
                </span>
              )}
            </div>
          ) : (
            <div className="text-amber-700 dark:text-amber-400 font-bold">
              Canonical position {canonicalPos} ({canonicalAA}) is omitted or deleted in the uploaded FASTA sequence.
            </div>
          )}
        </div>
      )}

      {(selection.structureSource === 'EXPERIMENTAL' || selection.comparisonPdbId) && (
        <div className="text-slate-600 dark:text-slate-300">
          PDB author chain: {selection.comparisonPdbId ? (selection.comparisonAuthorChainId || 'Not represented') : (selection.authorChainId || 'Not available')} · PDB author residue: {selection.comparisonPdbId ? (selection.comparisonAuthorResidueNumber || 'Not represented') : (selection.authorResidueNumber || 'Not available')}
          <span className="block text-slate-500 mt-1">
            {selection.comparisonPdbId ? (selection.comparisonAuthorResidueNumber ? `Comparison PDB: ${selection.comparisonPdbId} · mapped by RCSB SIFTS` : `Comparison PDB: ${selection.comparisonPdbId} · residue not represented`) : selection.mappedBy === 'SIFTS' ? 'Mapped by: RCSB SIFTS' : 'Canonical mapping unavailable for this residue'}
          </span>
        </div>
      )}
      {selection.plddt !== undefined && <div className="text-slate-600 dark:text-slate-300">Canonical AlphaFold Model pLDDT: {selection.plddt.toFixed(1)}</div>}
      {selection.comparisonDisplacement !== undefined && <div className="text-slate-600 dark:text-slate-300">Cα displacement after superposition: {selection.comparisonDisplacement.toFixed(2)} Å</div>}
    </section>
  );
};

const ConfidenceTab = ({ protein, plddtSummary, pae, biology, selection }: { protein: ActiveProtein; plddtSummary: ReturnType<typeof summarizePlddt> | null; pae: PaeMatrix | null; biology: BiologyAnnotation | null; selection: CanonicalResidueSelection | null }) => {
  if (protein.sourceType !== 'ALPHAFOLD_PREDICTED') {
    return (
      <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
        <h4 className="font-bold">{protein.sourceType === 'SEQUENCE_ONLY' ? 'No structure confidence data' : 'Experimental structure'}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {protein.sourceType === 'SEQUENCE_ONLY'
            ? 'Sequence-only input has no atomic coordinates, pLDDT, or PAE matrix.'
            : 'AlphaFold confidence metrics are not shown for this structure. Deposited B-factor values are experimental structure metadata, not pLDDT.'}
        </p>
      </div>
    );
  }

  const isNonCanonical = protein.compatibility && protein.compatibility.relationship !== 'CANONICAL_EXACT';

  return (
    <div className="space-y-4">
      {selection?.canonicalPosition && <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg text-xs"><strong>Selected canonical residue {selection.canonicalPosition}</strong>{selection.plddt !== undefined && <span> · pLDDT {selection.plddt.toFixed(1)}</span>}<span className="block text-slate-500 mt-1">PAE data describes this residue's relationships to other regions; it is not a per-residue flexibility score.</span></div>}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3">
        <h4 className="font-bold">
          {isNonCanonical ? 'Canonical AlphaFold Model Confidence - pLDDT' : 'Local Confidence - pLDDT'}
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isNonCanonical ? 'pLDDT belongs to the canonical AlphaFold model. It describes confidence for the canonical reference sequence, not the exact uploaded variant/isoform.' : 'pLDDT estimates AlphaFold\'s local confidence for each residue. It is not an accuracy guarantee or a probability that the structure is correct.'}
        </p>
        {plddtSummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Metric label="MEAN" value={plddtSummary.mean === null ? '-' : plddtSummary.mean.toFixed(1)} />
            <Metric label=">90 VERY HIGH" value={formatPercent(plddtSummary.veryHigh, plddtSummary.count)} />
            <Metric label="70-90 CONFIDENT" value={formatPercent(plddtSummary.confident, plddtSummary.count)} />
            <Metric label="50-70 LOW" value={formatPercent(plddtSummary.low, plddtSummary.count)} />
            <Metric label="<50 VERY LOW" value={formatPercent(plddtSummary.veryLow, plddtSummary.count)} />
          </div>
        )}
        <p className="text-xs text-slate-500">
          Low-confidence regions may correspond to disorder or structural uncertainty; they are not proof of molecular flexibility.
        </p>
        {plddtSummary?.lowRegions.length ? (
          <div className="text-xs text-slate-600 dark:text-slate-300">Low-confidence regions: {plddtSummary.lowRegions.map((r) => `${r.start}-${r.end}`).join(', ')}</div>
        ) : null}
      </div>
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3">
        <h4 className="font-bold">Relative Position Confidence - PAE</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">Predicted Aligned Error (PAE) estimates uncertainty in the relative positions of residues. Low PAE between two regions suggests their relative orientation is predicted more confidently.</p>
        {pae ? <PaeHeatmap pae={pae} /> : <p className="text-xs text-slate-500">PAE data is unavailable or did not match the expected residue matrix.</p>}
      </div>
      <section className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3">
        <div>
          <h4 className="font-bold">Disorder & Structural Uncertainty</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">Low pLDDT indicates prediction uncertainty. UniProt disorder features are independent curated annotations and are not interchangeable with pLDDT.</p>
        </div>
        {biology?.features.filter(isDisorderFeature).length ? (
          <div className="space-y-2 text-xs">
            {biology.features.filter(isDisorderFeature).map((feature, index) => <div key={`${feature.type}-${index}`} className="flex items-center justify-between gap-3"><span><strong>Curated disorder annotation</strong><br /><span className="text-slate-500">Source: UniProt{feature.description ? ` · ${feature.description}` : ''}</span></span><span className="font-mono">{feature.start}-{feature.end}</span></div>)}
          </div>
        ) : <p className="text-xs text-slate-500">No matching curated disorder annotation was found in the loaded UniProt record.</p>}
        {plddtSummary?.lowRegions.length ? <p className="text-xs text-amber-700 dark:text-amber-300">Low prediction confidence: {plddtSummary.lowRegions.map((region) => `${region.start}-${region.end}`).join(', ')}. These regions may correspond to disorder or structural uncertainty, but low pLDDT alone does not establish disorder.</p> : null}
      </section>
      <LimitationCards />
    </div>
  );
};

const PaeHeatmap = ({ pae }: { pae: PaeMatrix }) => {
  const stride = Math.max(1, Math.ceil(pae.size / 96));
  const sampled = pae.matrix.filter((_, y) => y % stride === 0).map((row) => row.filter((_, x) => x % stride === 0));
  return (
    <div className="space-y-2">
      <div className="grid w-full max-w-[560px] aspect-square border border-slate-300 dark:border-slate-700 bg-white" style={{ gridTemplateColumns: `repeat(${sampled.length}, minmax(0, 1fr))` }}>
        {sampled.flatMap((row, y) =>
          row.map((value, x) => {
            const ratio = Math.min(1, value / pae.max);
            const color = `hsl(${210 - ratio * 170}, 85%, ${45 + ratio * 12}%)`;
            return <div key={`${x}-${y}`} title={`Residue ${y * stride + 1} aligned on residue ${x * stride + 1}: ${value.toFixed(1)} Å predicted aligned error`} style={{ backgroundColor: color }} />;
          }),
        )}
      </div>
      <div className="flex justify-between max-w-[560px] text-[11px] text-slate-500">
        <span>Residue i</span>
        <span>0 Å</span>
        <span>Max {pae.max.toFixed(1)} Å</span>
        <span>Residue j</span>
      </div>
    </div>
  );
};

const BiologyTab = ({ biology, onSelectFeature, selection, protein }: { biology: BiologyAnnotation | null; onSelectFeature: (position: number) => void; selection: CanonicalResidueSelection | null; protein: ActiveProtein }) => {
  if (!biology) {
    return (
      <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <h4 className="font-bold">Biological Annotation</h4>
        <p className="text-sm text-slate-500 mt-1">No annotation available. Load an AlphaFold model with a UniProt accession to retrieve curated UniProt context.</p>
      </div>
    );
  }

  const comp = protein.compatibility;

  return (
    <div className="space-y-4">
      {selection?.canonicalPosition && <section className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg text-xs"><strong>Selected UniProt residue {selection.canonicalPosition}</strong><div className="mt-1 text-slate-500">{biology.features.filter((feature) => selection.canonicalPosition! >= feature.start && selection.canonicalPosition! <= feature.end).map((feature) => feature.type).join(' · ') || 'No curated feature covers this residue.'}</div></section>}
      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div>
          <h4 className="font-bold">Identity</h4>
          <p className="text-xs text-slate-500 mt-1">Curated UniProt annotation for {biology.accession}.</p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          <Metric label="PROTEIN" value={biology.proteinName || 'No annotation available'} />
          <Metric label="GENE" value={biology.gene || 'No annotation available'} />
          <Metric label="ORGANISM" value={biology.organism || 'No annotation available'} />
          <Metric label="LENGTH" value={biology.length ? `${biology.length} aa` : '—'} />
        </div>
      </section>

      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div>
          <h4 className="font-bold">Function & Cellular Context</h4>
          <p className="text-xs text-slate-500 mt-1">Reported annotation, not an inference from the predicted structure.</p>
        </div>
        <BiologyText label="Function" value={biology.functionText} />
        <BiologyText label="Subcellular location" value={biology.subcellularLocation} />
        <BiologyText label="Cofactors" value={biology.cofactors} />
      </section>

      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div>
          <h4 className="font-bold">Regions & Features</h4>
          <p className="text-xs text-slate-500 mt-1">Click a mapped feature to highlight its annotated position in the structure.</p>
        </div>
        {biology.features.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {biology.features.slice(0, 40).map((feature, index) => {
              const uStart = comp?.alignmentResult?.canonicalToUploaded[feature.start];
              const uEnd = comp?.alignmentResult?.canonicalToUploaded[feature.end];
              const isPresentInUploaded = comp ? uStart !== null && uStart !== undefined : true;

              return (
                <div key={`${feature.type}-${feature.start}-${feature.end}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold">{feature.type}</div>
                    <div className="text-slate-500 truncate">{feature.description || 'No description available'}</div>
                    {comp && comp.relationship !== 'CANONICAL_EXACT' && (
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                        {isPresentInUploaded ? `Uploaded position: ${uStart}${uEnd && uEnd !== uStart ? `–${uEnd}` : ''} (Canonical: ${feature.start}${feature.end !== feature.start ? `–${feature.end}` : ''})` : 'Not present in uploaded sequence.'}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onSelectFeature(feature.start)} className="shrink-0 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] hover:bg-sky-100 dark:hover:bg-sky-950">
                    {feature.start}{feature.end !== feature.start ? `–${feature.end}` : ''}
                  </button>
                </div>
              );
            })}
          </div>
        ) : <p className="text-xs text-slate-500">No annotation available.</p>}
      </section>

      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div>
          <h4 className="font-bold">Post-Translational Modifications</h4>
          <p className="text-xs text-slate-500 mt-1">Curated UniProt features. AlphaFold coordinates are not altered to simulate modifications.</p>
        </div>
        {biology.features.filter(isPtmFeature).length ? <FeatureRows features={biology.features.filter(isPtmFeature)} onSelectFeature={onSelectFeature} /> : <p className="text-xs text-slate-500">No annotation available.</p>}
        <p className="text-[11px] text-amber-700 dark:text-amber-300">PTM context: the displayed AlphaFold DB structure may not explicitly model the structural effect of a modification.</p>
      </section>

      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <h4 className="font-bold">Experimental Structures</h4>
        {biology.experimentalStructures.length ? (
          <div className="grid md:grid-cols-2 gap-2">
            {biology.experimentalStructures.slice(0, 20).map((structure) => (
              <div key={structure.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                <div><div className="font-mono font-bold">{structure.id}</div><div className="text-slate-500">{structure.method || 'Method unavailable'}{structure.resolution ? ` · ${structure.resolution}` : ''}</div></div>
                <a href={`https://www.rcsb.org/structure/${structure.id}`} target="_blank" rel="noreferrer" className="text-sky-600 font-semibold">Open</a>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-slate-500">No annotation available.</p>}
        <p className="text-[11px] text-slate-500">Mapped experimental chains can be compared from the Evidence tab using canonical residue correspondence. No structural similarity or biological-effect claim is inferred.</p>
      </section>

      <InfoCard icon={<Info className="w-4 h-4 text-sky-600" />} title="Cellular Context Limitation" text="A structure does not represent the complete intracellular environment. Membranes, partners, modifications, pH, ionic conditions, and molecular crowding may change protein behavior." />
    </div>
  );
};

const FeatureRows = ({ features, onSelectFeature }: { features: BiologyAnnotation['features']; onSelectFeature: (position: number) => void }) => (
  <div className="divide-y divide-slate-100 dark:divide-slate-800">
    {features.slice(0, 40).map((feature, index) => <div key={`${feature.type}-${feature.start}-${feature.end}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs"><div className="min-w-0"><div className="font-semibold">{feature.type}</div><div className="text-slate-500 truncate">{feature.description || 'No description available'}</div></div><button onClick={() => onSelectFeature(feature.start)} className="shrink-0 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] hover:bg-sky-100 dark:hover:bg-sky-950">{feature.start}{feature.end !== feature.start ? `-${feature.end}` : ''}</button></div>)}
  </div>
);

const ComparisonPanel = ({ comparison, showAlphaFold, showExperimental, matchedOnly, setShowAlphaFold, setShowExperimental, setMatchedOnly, onExit, onChainChange, onSelectResidue, protein }: {
  comparison: ComparisonSession;
  showAlphaFold: boolean;
  showExperimental: boolean;
  matchedOnly: boolean;
  setShowAlphaFold: (value: boolean) => void;
  setShowExperimental: (value: boolean) => void;
  setMatchedOnly: (value: boolean) => void;
  onExit: () => void;
  onChainChange: (chainId: string) => void;
  onSelectResidue: (position: number) => void;
  protein?: ActiveProtein;
}) => {
  const { detail, result, reference } = comparison;
  const isNonCanonical = protein?.compatibility && protein.compatibility.relationship !== 'CANONICAL_EXACT';

  return <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-bold">AlphaFold ↔ Experimental Comparison</h4>
        <p className="text-xs text-slate-500 mt-1">{detail.uniprotAccession || 'Active UniProt accession'} · {reference.id} · {detail.method || 'Method unavailable'}{detail.resolution ? ` · ${detail.resolution.toFixed(2)} Å` : ''}</p>
        {isNonCanonical && (
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-1 font-mono">
            Comparison uses canonical UniProt coordinates.
          </p>
        )}
      </div>
      <button onClick={onExit} className="text-xs font-semibold text-slate-600 dark:text-slate-300">Exit Comparison</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"><Metric label="CANONICAL COVERAGE" value={detail.mappedCanonicalStart && detail.mappedCanonicalEnd && detail.canonicalLength ? `${detail.mappedCanonicalStart}-${detail.mappedCanonicalEnd} / ${detail.canonicalLength} aa` : 'Not available'} /><Metric label="CONSTRUCT LENGTH" value={detail.constructLength ? `${detail.constructLength} aa` : 'Not available'} /><Metric label="MATCHED Cα PAIRS" value={String(result.pairs.length)} /><Metric label="Cα RMSD AFTER SUPERPOSITION" value={`${result.rmsd.toFixed(2)} Å`} /></div>
    <p className="text-xs text-slate-500">RMSD summarizes coordinate differences among matched Cα atoms after optimal rigid-body superposition. This applies only to the matched experimental region and does not measure accuracy of the full AlphaFold model.</p>
    {result.excludedCanonicalPositions.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Excluded mapped residues without usable paired coordinates: {result.excludedCanonicalPositions.join(', ')}</p>}
    <div className="flex flex-wrap items-center gap-2 text-xs"><button onClick={() => setShowAlphaFold(!showAlphaFold)} className={`px-2 py-1 rounded font-semibold ${showAlphaFold ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>AlphaFold</button><button onClick={() => setShowExperimental(!showExperimental)} className={`px-2 py-1 rounded font-semibold ${showExperimental ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Experimental</button><button onClick={() => setMatchedOnly(!matchedOnly)} className={`px-2 py-1 rounded font-semibold ${matchedOnly ? 'bg-slate-800 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Matched region only</button>{detail.chains.length > 1 && <label className="flex items-center gap-1 text-slate-500">Experimental chain<select value={comparison.chainId} onChange={(event) => onChainChange(event.target.value)} className="border border-slate-300 dark:border-slate-600 rounded px-1.5 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{detail.chains.map((chain) => <option key={chain} value={chain}>{chain}</option>)}</select></label>}<span className="px-2 py-1 text-slate-500">Full AlphaFold context remains available when AlphaFold is enabled.</span></div>
    <div><div className="text-xs font-semibold text-slate-500 mb-1">Cα displacement after superposition</div><div className="h-36 flex items-end gap-px border-b border-l border-slate-300 dark:border-slate-700 px-1">{result.pairs.map((pair, index) => { const displacement = result.displacements[index]?.value ?? distanceForPair(result, index); const height = Math.max(3, Math.min(100, (displacement / Math.max(result.maxDisplacement.value, 0.01)) * 100)); return <button key={pair.canonicalPosition} onClick={() => onSelectResidue(pair.canonicalPosition)} title={`UniProt ${pair.canonicalPosition}: ${displacement.toFixed(2)} Å`} className="flex-1 min-w-[2px] bg-orange-400 hover:bg-sky-500" style={{ height: `${height}%` }} />; })}</div><div className="text-[10px] text-slate-500 mt-1">UniProt canonical residue position · no interpolation across unmapped gaps</div></div>
    <p className="text-[11px] text-slate-500">Structural differences can reflect construct design, ligands, binding partners, mutations, crystal packing, experimental conditions, biological conformational differences, or model disagreement.</p>
  </section>;
};

const distanceForPair = (result: StructureComparisonResult, index: number) => {
  const pair = result.pairs[index];
  const transformed = result.transformedExperimental[index];
  return Math.sqrt((pair.alphaFold.x - transformed.x) ** 2 + (pair.alphaFold.y - transformed.y) ** 2 + (pair.alphaFold.z - transformed.z) ** 2);
};

const SelectedEvidenceCoverage = ({ selection, details }: { selection: CanonicalResidueSelection | null; details: Record<string, ExperimentalEvidenceDetail> }) => {
  if (!selection?.canonicalPosition) return null;
  const covered = Object.values(details).filter((detail) => detail.canonicalSegments.some((segment) => selection.canonicalPosition! >= segment.canonicalStart && selection.canonicalPosition! < segment.canonicalStart + segment.length));
  return <section className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg text-xs"><h4 className="font-bold">Experimental Coordinate Coverage at Residue {selection.canonicalPosition}</h4><p className="mt-1 text-slate-500">{covered.length ? `${covered.length} linked PDB entr${covered.length === 1 ? 'y' : 'ies'} cover this canonical residue: ${covered.map((detail) => `${detail.pdbId} (${detail.chains.join(', ') || 'chains unavailable'})`).join(' · ')}` : 'No linked experimental structure currently covers this canonical residue.'}</p></section>;
};

const EvidenceTab = ({ biology, protein, details, loading, selection, canCompare, onCompare, onOpenStructure }: { biology: BiologyAnnotation | null; protein: ActiveProtein; details: Record<string, ExperimentalEvidenceDetail>; loading: boolean; selection: CanonicalResidueSelection | null; canCompare: boolean; onCompare: (reference: BiologyAnnotation['experimentalStructures'][number], detail: ExperimentalEvidenceDetail) => void; onOpenStructure: (reference: BiologyAnnotation['experimentalStructures'][number]) => void }) => {
  const comp = protein.compatibility;
  const evidenceDetails = Object.values(details);
  const mappedDetails = evidenceDetails.filter((detail) => detail.canonicalSegments.length > 0);
  const selectedCoverageCount = selection?.canonicalPosition ? mappedDetails.filter((detail) => detail.canonicalSegments.some((segment) => selection.canonicalPosition! >= segment.canonicalStart && selection.canonicalPosition! < segment.canonicalStart + segment.length)).length : 0;

  return (
    <div className="space-y-4">
      <SelectedEvidenceCoverage selection={selection} details={details} />
      <section className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
        <div>
          <h4 className="text-lg font-bold">Experimental Structural Evidence</h4>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 mt-1">See which regions of this protein have experimentally determined structures and how those structures map to the canonical UniProt sequence and the AlphaFold prediction.</p>
          <p className="text-xs leading-5 text-slate-500 mt-2">Experimental PDB structures often represent only part of a protein. PazAtlas shows the canonical residues actually represented, the experimental context, and whether the mapped sequence matches the reference.</p>
        </div>
        <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg text-xs leading-5">
          <div className="font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wide">Why this matters</div>
          <p className="mt-1 text-sky-900/80 dark:text-sky-200/80">AlphaFold provides a predicted structural model. Experimental PDB entries provide structural observations from methods such as X-ray crystallography, cryo-EM, or NMR. PazAtlas connects them by showing which experimentally studied regions correspond to the protein you are analyzing.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <Metric label="EXPERIMENTAL STRUCTURES FOUND" value={biology?.experimentalStructures.length ? String(biology.experimentalStructures.length) : '0'} />
          <Metric label="MAPPED CANONICAL REGIONS" value={String(mappedDetails.length)} />
          {selection?.canonicalPosition ? <Metric label="SELECTED RESIDUE COVERED BY" value={`${selectedCoverageCount} structure${selectedCoverageCount === 1 ? '' : 's'}`} /> : <Metric label="COORDINATE SYSTEM" value="UniProt canonical" />}
        </div>
        <p className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">Different PDB entries may represent different domains, fragments, binding partners, constructs, or experimental conditions. A 100% identity value does not mean two entries represent the same region or have the same overall shape.</p>
        {loading && <p className="text-xs text-sky-600">Retrieving structured RCSB evidence...</p>}
        {biology?.experimentalStructures.length ? <div className="grid md:grid-cols-2 gap-3">{biology.experimentalStructures.slice(0, 40).map((reference) => {
          const detail = details[reference.id];
          const mapped = detail?.mappingStatus === 'MAPPED_EXPLICITLY' || detail?.mappingStatus === 'CANONICAL_RANGE_UNAVAILABLE';
          const mappingLabel = detail?.mappingStatus === 'NETWORK_ERROR' ? 'Unable to retrieve mapping metadata' : mapped ? 'Mapped from RCSB/UniProt' : detail ? 'Mapping unavailable' : 'Mapping pending';

          const cStart = detail?.mappedCanonicalStart;
          const cEnd = detail?.mappedCanonicalEnd;
          const uStart = cStart && comp?.alignmentResult?.canonicalToUploaded ? comp.alignmentResult.canonicalToUploaded[cStart] : undefined;
          const uEnd = cEnd && comp?.alignmentResult?.canonicalToUploaded ? comp.alignmentResult.canonicalToUploaded[cEnd] : undefined;
          const canonicalLength = detail?.canonicalLength;
          const mappedResidues = detail?.mappedResidues;
          const coveragePercent = canonicalLength && mappedResidues ? (mappedResidues / canonicalLength) * 100 : undefined;
          const representation = coveragePercent === undefined ? 'Coverage unavailable' : mappedResidues === canonicalLength ? 'Full-length canonical region' : coveragePercent >= 80 ? 'Near-full-length canonical region' : 'Partial canonical region';
          const coversSelected = Boolean(selection?.canonicalPosition && detail?.canonicalSegments.some((segment) => selection.canonicalPosition! >= segment.canonicalStart && selection.canonicalPosition! < segment.canonicalStart + segment.length));
          const coverageLabel = detail?.canonicalSegments.length && canonicalLength
            ? `${detail.canonicalSegments.map((segment) => `${segment.canonicalStart}-${segment.canonicalStart + segment.length - 1}`).join(', ')} of ${canonicalLength}`
            : 'Canonical range not available';

          return <div key={reference.id} className={`p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-3 border ${coversSelected ? 'border-sky-400 dark:border-sky-600' : 'border-transparent'}`}>
            <div className="flex items-start justify-between gap-3"><div><div className="font-mono font-bold text-sm">{reference.id}</div><div className="text-slate-500 mt-0.5">{detail?.method || reference.method || 'Method unavailable'}{detail?.resolution ? ` · ${detail.resolution.toFixed(2)} Å` : reference.resolution ? ` · ${reference.resolution}` : ''}</div></div><span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">EXPERIMENTAL</span></div>
            <div className="font-semibold text-slate-600 dark:text-slate-300" title="Canonical mapping connects residues in a deposited PDB chain to positions in the full UniProt protein sequence.">Canonical mapping: {mappingLabel}</div>
            {coversSelected && <div className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Covers selected residue {selection?.canonicalPosition}</div>}
            {mapped && <>
              <div><div className="font-semibold uppercase tracking-wide text-[10px] text-slate-500">Experimental coverage</div><div className="mt-1 font-mono text-slate-700 dark:text-slate-200">Residues {coverageLabel}</div>{coveragePercent !== undefined && <div className="text-slate-500">{coveragePercent.toFixed(1)}% of canonical protein</div>}<CoverageBar segments={detail?.canonicalSegments} length={canonicalLength} /></div>
              <div className="text-slate-500">Experimental representation: <span className="font-semibold text-slate-700 dark:text-slate-300">{representation}</span></div>
              <div><div className="font-semibold uppercase tracking-wide text-[10px] text-slate-500">Sequence mapping</div><div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2"><EvidenceMetric label="MAPPED CANONICAL RESIDUES" value={mappedResidues !== undefined ? String(mappedResidues) : 'Not available'} tooltip="Number of canonical UniProt residue positions represented by this experimental structure. This is not the number of experimental structures." /><EvidenceMetric label="IDENTITY WITHIN MAPPED REGION" value={detail?.sequenceIdentity !== undefined ? `${detail.sequenceIdentity.toFixed(1)}%` : 'Not available'} tooltip="Percentage of mapped experimental residues that match the UniProt canonical sequence." /></div></div>
              {comp && comp.relationship !== 'CANONICAL_EXACT' && <div className="text-sky-600 font-mono">Coverage represented in uploaded sequence: {uStart && uEnd ? `${uStart}-${uEnd}` : 'Not fully mapped to uploaded sequence'}</div>}
              <div className="text-slate-500">Entity: {detail?.entityIds?.join(', ') || detail?.entityId || 'Not available'} · Author chain(s): {detail?.chains.length ? detail.chains.join(', ') : 'Unable to determine reliably'}</div>
              <div className="text-slate-500">Construct length: {detail?.constructLength ?? 'Not available'} aa · Resolved residues: {detail?.resolvedResidues ?? 'Not available'}</div>
            </>}
            {detail && !mapped && <p className="text-slate-500">UniProt links this entry to {biology?.accession || protein.accession}, but exact chain-to-canonical mapping could not be confirmed from available RCSB metadata. Coverage and canonical residue numbering are therefore not shown.</p>}
            {detail?.otherMolecules.length ? <div className="p-2 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"><div className="font-semibold">Experimental context</div><div className="mt-1">Other molecules: {detail.otherMolecules.map((molecule) => `${molecule.id}${molecule.name ? ` (${molecule.name})` : ''}`).join(', ')}</div><div className="mt-1 text-slate-500">The deposited structure may capture a complex or condition that differs from an isolated predicted model.</div></div> : null}
            <div className="flex flex-wrap gap-3"><button onClick={() => onOpenStructure(reference)} title="Open this experimental structure in the viewer" className="cursor-pointer text-sky-600 font-semibold hover:text-sky-800">Open in viewer</button><button disabled={!canCompare || !detail || detail.mappingStatus !== 'MAPPED_EXPLICITLY' || !detail.canonicalSegments.length} onClick={() => detail && onCompare(reference, detail)} title="Superimpose experimentally mapped residues with the corresponding AlphaFold residues" className="cursor-pointer text-sky-600 font-semibold disabled:cursor-not-allowed disabled:text-slate-400">Compare with AlphaFold</button><a href={`https://www.rcsb.org/structure/${reference.id}`} target="_blank" rel="noreferrer" className="cursor-pointer text-sky-600 font-semibold hover:text-sky-800">Open RCSB</a></div>
            {detail?.notes.filter((note) => !note.includes('canonical mapping')).map((note) => <div key={note} className="text-amber-700 dark:text-amber-300">{note}</div>)}
          </div>;
        })}</div> : <p className="text-xs text-slate-500">No experimental structure references available.</p>}
        <div className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3"><strong>Predicted vs experimental:</strong> AlphaFold is a predicted structural model; a PDB entry is an experimentally determined structure or fragment. Experimental coverage usually applies only to the represented region, not automatically to the entire protein.</div>
      </section>
    </div>
  );
};

const CoverageBar = ({ segments, length }: { segments?: Array<{ canonicalStart: number; length: number }>; length?: number }) => {
  const hasCoverage = Boolean(segments?.length && length);
  return <div className="mt-2 space-y-1" aria-label={hasCoverage ? `Experimental regions ${segments!.map((segment) => `${segment.canonicalStart}-${segment.canonicalStart + segment.length - 1}`).join(', ')} on a canonical protein of ${length} residues` : 'Experimental canonical coverage unavailable'}><div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-700">{hasCoverage && segments!.map((segment, index) => <div key={`${segment.canonicalStart}-${index}`} className="absolute inset-y-0 rounded-full bg-sky-500" style={{ left: `${((segment.canonicalStart - 1) / length!) * 100}%`, width: `${Math.max(0.5, (segment.length / length!) * 100)}%` }} />)}</div><div className="flex justify-between text-[10px] text-slate-400"><span>1</span><span>{length || 'canonical length unavailable'}</span></div></div>;
};

const EvidenceMetric = ({ label, value, tooltip }: { label: string; value: string; tooltip: string }) => (
  <div className="p-3 bg-white/70 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-1 text-slate-500 font-semibold text-[10px]">
      <span>{label}</span>
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-400 text-[9px]" title={tooltip} aria-label={tooltip}>i</span>
    </div>
    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{value}</div>
  </div>
);

const BiologyText = ({ label, value }: { label: string; value?: string }) => (
  <div className="text-xs"><div className="font-semibold text-slate-500">{label}</div><p className="mt-1 leading-relaxed">{value || 'No annotation available'}</p></div>
);

const SequenceTab = ({ protein, properties, copiedSeq, copiedFasta, onCopy, onSelectResidue }: {
  protein: ActiveProtein;
  properties: ProteinProperties | null;
  copiedSeq: boolean;
  copiedFasta: boolean;
  onCopy: (asFasta: boolean) => void;
  onSelectResidue: (position: number) => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h4 className="font-bold">Protein Sequence</h4>
        <p className="text-xs text-slate-500">{protein.sequenceLabel}</p>
        {protein.mappedFrom && (
          <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 mt-1 font-mono">
            Mapped from RefSeq {protein.mappedFrom} → UniProt {protein.accession}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onCopy(false)} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold flex items-center gap-1">{copiedSeq ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy Sequence</button>
        <button onClick={() => onCopy(true)} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold flex items-center gap-1">{copiedFasta ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy FASTA</button>
      </div>
    </div>

    {protein.rawFastaText && (
      <details className="group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/70 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span>Uploaded FASTA</span>
          <span className="text-[10px] font-mono text-slate-400 group-open:text-sky-500">View full text</span>
        </summary>
        <pre className="p-3 bg-slate-950 text-slate-100 max-h-56 overflow-auto font-mono text-[11px] whitespace-pre-wrap select-all leading-relaxed border-t border-slate-800">
          {protein.rawFastaText}
        </pre>
      </details>
    )}

    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-slate-500">Interactive Residue View ({protein.sequence.length} aa)</div>
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg max-h-56 overflow-y-auto font-mono text-xs leading-relaxed">
        {protein.sequence.split('').map((aa, idx) => (
          <button key={idx} onClick={() => onSelectResidue(idx + 1)} className="inline-block px-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded" title={`Residue ${idx + 1}: ${aa}`}>{aa}</button>
        ))}
      </div>
    </div>
    {properties && <HydropathyChart properties={properties} />}
    {properties && <Composition properties={properties} />}
  </div>
);

const Composition = ({ properties }: { properties: ProteinProperties }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
    <Metric label="HYDROPHOBIC" value={String(properties.composition.hydrophobic)} />
    <Metric label="POLAR" value={String(properties.composition.polar)} />
    <Metric label="ACIDIC" value={String(properties.composition.acidic)} />
    <Metric label="BASIC" value={String(properties.composition.basic)} />
    <Metric label="GLYCINE" value={String(properties.composition.glycine)} />
  </div>
);

const HydropathyChart = ({ properties }: { properties: ProteinProperties }) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h4 className="font-bold text-sm">Kyte-Doolittle Hydropathy</h4>
        <p className="text-[11px] text-slate-500">Window size 9. Bars show the average hydropathy around each sequence position.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500" aria-label="Hydropathy legend">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-sky-500" aria-hidden="true" /> Positive: more hydrophobic</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-amber-500" aria-hidden="true" /> Negative: more hydrophilic</span>
      </div>
    </div>
    <div className="relative h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex items-center" aria-label="Hydropathy chart; the horizontal line is zero">
      <div className="absolute left-2 right-2 top-1/2 border-t border-slate-300 dark:border-slate-700" />
      <span className="absolute right-2 top-[calc(50%-1.1rem)] text-[9px] text-slate-400">positive</span>
      <span className="absolute right-2 bottom-[calc(50%-1.1rem)] text-[9px] text-slate-400">negative</span>
      <div className="relative z-[1] w-full h-full flex items-stretch gap-px">
        {properties.hydropathy_profile.map((value, idx) => {
          const height = Math.max(4, Math.min(50, Math.abs(value / 4.5) * 50));
          return (
            <div key={idx} className="relative h-full min-w-0 flex-1" title={`Residue window ${idx + 1}: ${value.toFixed(2)}`}>
              <div
                className={`absolute left-0 right-0 ${value >= 0 ? 'bottom-1/2 bg-sky-500' : 'top-1/2 bg-amber-500'}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const MutationTab = ({ notation, setNotation, onInspect, result, error, highlightedResidue, selectedAtom, nearbyResidues, isAlphaFold, biology, selection, protein }: {
  notation: string;
  setNotation: (value: string) => void;
  onInspect: () => void;
  result: MutationDescription | null;
  error: string | null;
  highlightedResidue: number | null;
  selectedAtom: ProteinAtom | null;
  nearbyResidues: ProteinAtom[];
  isAlphaFold: boolean;
  biology: BiologyAnnotation | null;
  selection: CanonicalResidueSelection | null;
  protein: ActiveProtein;
}) => {
  const comp = protein.compatibility;
  const uploadedPos = highlightedResidue || selection?.canonicalPosition;
  const uploadedWT = uploadedPos ? protein.sequence[uploadedPos - 1] : undefined;

  const canonicalPos = uploadedPos && comp?.alignmentResult?.uploadedToCanonical
    ? comp.alignmentResult.uploadedToCanonical[uploadedPos]
    : uploadedPos;

  const canonicalWT = canonicalPos && comp?.canonicalSequence
    ? comp.canonicalSequence[canonicalPos - 1]
    : undefined;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-base">Mutation Inspector</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Inspect a single amino-acid substitution in sequence and structure context.
            </p>
          </div>
          <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2.5 py-1 rounded-lg border border-sky-300 dark:border-sky-800">
            Reference Sequence: <span className="font-bold">Uploaded FASTA ({protein.sequence.length} aa)</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            placeholder="e.g. G574S or F24S"
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono text-sm"
          />
          <button onClick={onInspect} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold">
            Inspect Mutation
          </button>
        </div>
        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Metric label={result.notation} value={`${result.wildTypeName} → ${result.mutantName}`} />
            <Metric label="AMINO-ACID CLASS" value={`${result.wildTypeClass} → ${result.mutantClass}`} />
            <Metric label="HYDROPATHY DELTA" value={result.hydropathyDelta.toFixed(2)} />
            <Metric label="MASS DELTA" value={`${result.massDelta.toFixed(2)} Da`} />
            <Metric label="CHARGE" value={result.chargeChange} />
            <Metric label="POLARITY" value={result.polarityChange} />
          </div>
        )}

        {uploadedPos && (
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-300">
              Reference Frame Verification (Position {uploadedPos})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Uploaded FASTA WT</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                  {uploadedWT ? `${uploadedWT}${uploadedPos}` : 'Unavailable'}
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Canonical UniProt WT</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                  {canonicalWT && canonicalPos ? `${canonicalWT}${canonicalPos}` : 'Same as uploaded'}
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">AlphaFold 3D Model Residue</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                  {canonicalWT && canonicalPos ? `${canonicalWT}${canonicalPos}` : selectedAtom ? `${selectedAtom.aa}${selectedAtom.resSeq}` : 'Canonical sequence model'}
                </div>
              </div>
            </div>
            {comp && uploadedWT && canonicalWT && uploadedWT !== canonicalWT && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
                Note: Uploaded FASTA residue at position {uploadedPos} is <strong>{uploadedWT}</strong>, whereas canonical UniProt AlphaFold model has <strong>{canonicalWT}</strong> at corresponding 3D position {canonicalPos}.
              </div>
            )}
          </div>
        )}

        {selectedAtom && <ResidueCard atom={selectedAtom} isAlphaFold={isAlphaFold} />}
        {highlightedResidue && selectedAtom && (
          <div className="text-xs">
            <div className="font-semibold text-slate-500">Nearby residues within 4 Å</div>
            <div className="mt-1 font-mono">
              {nearbyResidues.length ? nearbyResidues.map((atom) => `${atom.aa}${atom.resSeq}`).join(' · ') : 'No coordinates available within 4 Å'}
            </div>
          </div>
        )}
        {highlightedResidue && biology && (
          <div className="text-xs">
            <div className="font-semibold text-slate-500">Biological Context</div>
            <div className="mt-1">
              {biology.features.filter((feature) => highlightedResidue >= feature.start && highlightedResidue <= feature.end).map((feature) => feature.type).join(' · ') || 'No curated feature covers this residue.'}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200">
        <h4 className="font-bold">Mutation Interpretation</h4>
        <p className="mt-1">
          These comparisons describe sequence and structural context. PazAtlas is not predicting whether this mutation stabilizes or destabilizes the protein. AlphaFold confidence does not establish mutation pathogenicity or ΔΔG.
        </p>
      </div>
    </div>
  );
};


const LimitationCards = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
    <InfoCard icon={<Activity className="w-4 h-4 text-sky-600" />} title="Protein Dynamics" text="AlphaFold DB models represent predicted structural conformations, not molecular-dynamics trajectories." />
    <InfoCard icon={<Search className="w-4 h-4 text-sky-600" />} title="Binding & Drug Design" text="A predicted protein structure alone does not establish a drug-binding pose or binding affinity." />
    <InfoCard icon={<Info className="w-4 h-4 text-sky-600" />} title="Cellular Context" text="Crowding, membranes, cofactors, modifications, partners, pH, and ionic conditions may alter biological behavior." />
  </div>
);
