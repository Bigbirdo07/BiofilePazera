import React, { useMemo, useRef, useState } from 'react';
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
import {
  MutationDescription,
  PaeMatrix,
  ProteinAtom,
  StructureSourceType,
  classifyProteinStudioInput,
  classifyStructureSource,
  describeMutation,
  extractChainsFromAtoms,
  formatPercent,
  getStructureMetricLabel,
  hasProteinProperties,
  extractLookupIds,
  normalizeProteinAccession,
  parseFastaHeader,
  parsePaeJson,
  parsePdbAtoms,
  parseProteinInput,
  summarizePlddt,
  validateMutationInput,
} from '../utils/proteinStudio';

export { parseFastaHeader };

interface ProteinStudioProps {
  onNavigate?: (view: PageView) => void;
}

type InputMode = 'structure' | 'uniprot' | 'sequence';
type WorkspaceTab = 'structure' | 'confidence' | 'sequence' | 'mutations';
type LoadStep = 'metadata' | 'model' | 'confidence';

interface SelectedFile {
  name: string;
  size: number;
  content: string;
  format: string;
}

interface ActiveProtein {
  title: string;
  accession?: string;
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
  sequenceLabel: string;
  chains: string[];
  atoms: ProteinAtom[];
}

interface AlphaFoldMetadata {
  pdbUrl?: string;
  paeDocUrl?: string;
  plddtDocUrl?: string;
  accession?: string;
  entryName?: string;
  proteinName?: string;
  organism?: string;
  gene?: string;
  sequence?: string;
}

const insulinFasta = `>sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED
LQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN`;

export const ProteinStudio: React.FC<ProteinStudioProps> = ({ onNavigate }) => {
  const [inputMode, setInputMode] = useState<InputMode>('structure');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('structure');
  const [structureFile, setStructureFile] = useState<SelectedFile | null>(null);
  const [sequenceFile, setSequenceFile] = useState<SelectedFile | null>(null);
  const [pastedSequence, setPastedSequence] = useState('');
  const [uniprotAccession, setUniprotAccession] = useState('P04637');
  const [activeProtein, setActiveProtein] = useState<ActiveProtein | null>(null);
  const [properties, setProperties] = useState<ProteinProperties | null>(null);
  const [pae, setPae] = useState<PaeMatrix | null>(null);
  const [selectedChain, setSelectedChain] = useState('ALL');
  const [renderMode, setRenderMode] = useState<'ribbon' | 'trace' | 'spheres'>('ribbon');
  const [colorMode, setColorMode] = useState<'plddt' | 'chain' | 'spectrum' | 'bfactor'>('chain');
  const [highlightedResidue, setHighlightedResidue] = useState<number | null>(null);
  const [selectedResidue, setSelectedResidue] = useState<ProteinAtom | null>(null);
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
  const [isFastqDetected, setIsFastqDetected] = useState(false);
  const [copiedSeq, setCopiedSeq] = useState(false);
  const [copiedFasta, setCopiedFasta] = useState(false);
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

  const startRequest = () => {
    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const id = requestRef.current.id + 1;
    requestRef.current = { id, controller };
    return { id, controller };
  };

  const isLatestRequest = (id: number) => id === requestRef.current.id;

  const resetAlphaFoldState = () => {
    setPae(null);
    setColorMode('chain');
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
    setMutationResult(null);
    setMutationError(null);
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
    setMutationResult(null);
    clearErrors();
  };

  const handleLoadStructure = async () => {
    if (!structureFile) {
      setErrorMessage('Please select or drop a PDB/mmCIF structure file.');
      return;
    }
    if (!structureFile.content) {
      setErrorMessage('Structure file content is not available.');
      setErrorDetails('Drop the file into the panel, or use browser file selection. Native path-only selection is not readable in this build.');
      return;
    }

    clearErrors();
    resetAlphaFoldState();
    setExecutionState('loading');
    const { id } = startRequest();
    try {
      const sourceType = classifyStructureSource(structureFile.content, structureFile.name);
      const atoms = parsePdbAtoms(structureFile.content);
      if (!atoms.length) throw new Error('No C-alpha ATOM records were found. True mmCIF coordinate parsing is not available in this RC.');
      const sequence = atoms.map((atom) => atom.aa).join('');
      if (!isLatestRequest(id)) return;
      const chains = extractChainsFromAtoms(atoms);
      const protein: ActiveProtein = {
        title: structureFile.name,
        sourceType,
        sourceLabel: sourceType === 'EXPERIMENTAL' ? 'Experimental Structure' : 'Local Structure',
        locationLabel: 'LOCAL',
        structureType: sourceType === 'EXPERIMENTAL' ? 'Experimental / deposited coordinates' : 'Local coordinate file',
        pdbText: structureFile.content,
        sequence,
        sequenceLabel: 'Observed structure-derived sequence',
        chains,
        atoms,
      };
      setActiveProtein(protein);
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

  const normalizeAlphaFoldMetadata = (data: unknown, accession: string): AlphaFoldMetadata | null => {
    if (!Array.isArray(data) || !data.length) return null;
    const exact = data.find((item) => item?.uniprotAccession?.toUpperCase() === accession);
    const item = exact || data[0];
    return {
      pdbUrl: item.pdbUrl,
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

  const handleFetchUniProt = async (overrideAccession?: string) => {
    const accession = normalizeProteinAccession(overrideAccession || activeProtein?.accession || uniprotAccession);
    if (!/^[A-Z0-9]{6,10}(?:-\d+)?$/.test(accession)) {
      setExecutionState('error');
      setErrorMessage(`"${accession}" is not recognized as a valid UniProt accession format.`);
      setErrorDetails('Examples: P01308, P04637, P0DTC2.');
      return;
    }

    clearErrors();
    setExecutionState('loading');
    setLoadSteps({ metadata: 'loading', model: 'idle', confidence: 'idle' });
    resetAlphaFoldState();
    setUniprotAccession(accession);
    const { id, controller } = startRequest();

    try {
      const apiRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${accession}`, { signal: controller.signal });
      if (!apiRes.ok) throw new Error(`AlphaFold DB metadata request failed with HTTP ${apiRes.status}.`);
      const metadata = normalizeAlphaFoldMetadata(await apiRes.json(), accession);
      if (!metadata?.pdbUrl) throw new Error(`No AlphaFold DB model found for accession "${accession}".`);
      if (!isLatestRequest(id)) return;
      setLoadSteps({ metadata: 'done', model: 'loading', confidence: 'idle' });

      const pdbRes = await fetch(metadata.pdbUrl, { signal: controller.signal });
      if (!pdbRes.ok) throw new Error(`AlphaFold DB model request failed with HTTP ${pdbRes.status}.`);
      const pdbText = await pdbRes.text();
      const atoms = parsePdbAtoms(pdbText);
      const sequence = metadata.sequence || (await extractFastaFromPdb(pdbText)).toString().replace(/>.*/g, '').replace(/\s+/g, '');
      if (!atoms.length) throw new Error('AlphaFold DB model did not contain readable C-alpha coordinates.');
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
        sequence,
        sequenceLabel: 'UniProt sequence associated with AlphaFold DB model',
        chains,
        atoms,
      });
      setPae(parsedPae);
      setProperties(await calculateProteinProperties(sequence));
      setColorMode('plddt');
      setSelectedChain('ALL');
      setActiveTab('structure');
      setLoadSteps({ metadata: 'done', model: 'done', confidence: parsedPae ? 'done' : 'error' });
      setExecutionState('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError' || !isLatestRequest(id)) return;
      setExecutionState('error');
      setLoadSteps((prev) => ({ ...prev, metadata: prev.metadata === 'loading' ? 'error' : prev.metadata, model: prev.model === 'loading' ? 'error' : prev.model }));
      setErrorMessage('No AlphaFold DB model found or retrieval failed.');
      setErrorDetails(err instanceof Error ? err.message : 'Network request failed.');
    }
  };

  const handleAnalyzeSequence = async () => {
    const raw = sequenceFile?.content || pastedSequence;
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
    setExecutionState('loading');
    const { id } = startRequest();
    try {
      const lookupIds = extractLookupIds(`${sequenceFile?.name || ''}\n${raw}`);
      const parsed = parseProteinInput(raw);
      if (!raw.trim().startsWith('>') && lookupIds.uniprotAccessions.length > 0 && parsed.sequence.length > 40) {
        const accession = lookupIds.uniprotAccessions[0];
        setInputMode('uniprot');
        setUniprotAccession(accession);
        setExecutionState('idle');
        setNoticeMessage(`UniProt accession ${accession} detected in this text file.`);
        setNoticeDetails('Click Fetch Structure to retrieve the AlphaFold DB model online. No network request has been made.');
        return;
      }
      if (!parsed.sequence) throw new Error('No amino-acid sequence was found.');
      if (parsed.nucleotideWarning) {
        setErrorMessage('This sequence appears to be nucleotide DNA/RNA rather than protein amino acids.');
      }
      const header = parsed.header;
      const accession = header?.accession || lookupIds.uniprotAccessions[0];
      setActiveProtein({
        title: accession ? `${accession} · ${header?.entryName || header?.proteinName || 'Protein sequence'}` : sequenceFile?.name || 'Analyzed Protein Sequence',
        accession,
        entryName: header?.entryName,
        proteinName: header?.proteinName,
        organism: header?.organism,
        gene: header?.gene,
        sourceType: 'SEQUENCE_ONLY',
        sourceLabel: header?.pdbId ? `Protein Sequence · PDB ${header.pdbId}` : 'Protein Sequence',
        locationLabel: 'LOCAL',
        structureType: 'No coordinates',
        pdbText: '',
        sequence: parsed.sequence,
        sequenceLabel: 'Sequence-only amino-acid input',
        chains: [],
        atoms: [],
      });
      setProperties(await calculateProteinProperties(parsed.sequence));
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

  const handleMutationInspect = () => {
    if (!activeProtein) return;
    const validation = validateMutationInput(mutationNotation, activeProtein.sequence);
    if (!validation.ok) {
      setMutationResult(null);
      setMutationError(validation.error || 'Invalid mutation.');
      return;
    }
    const description = describeMutation(validation);
    setMutationError(null);
    setMutationResult(description);
    setHighlightedResidue(validation.position || null);
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

          {isFastqDetected && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>FASTQ sequencing data detected</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Protein Studio analyzes protein sequences and structures. Open this file in Sequencing QC instead.
              </p>
              <button onClick={() => onNavigate?.('inspect')} className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">
                Open Sequencing QC
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
              <button disabled={!structureFile || executionState === 'loading'} onClick={handleLoadStructure} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
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
              <input value={uniprotAccession} onChange={(e) => setUniprotAccession(e.target.value)} placeholder="P01308" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {['P01308', 'P04637', 'P0DTC2'].map((acc) => (
                  <button key={acc} onClick={() => handleFetchUniProt(acc)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 rounded font-mono text-[11px]">
                    {acc}
                  </button>
                ))}
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
              <textarea
                value={pastedSequence}
                onChange={(e) => {
                  setPastedSequence(e.target.value);
                  if (e.target.value.trim()) setSequenceFile(null);
                }}
                placeholder={insulinFasta}
                className="w-full h-32 p-2.5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button disabled={(!sequenceFile && !pastedSequence.trim()) || executionState === 'loading'} onClick={handleAnalyzeSequence} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
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
            <EmptyWorkspace onFetch={() => handleFetchUniProt('P04637')} />
          ) : (
            <>
              <ActiveHeader protein={activeProtein} />
              <MetricCards protein={activeProtein} properties={properties} structureMetric={structureMetric} />
              <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

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
                    detectedProteinName={activeProtein.proteinName}
                    detectedOrganism={activeProtein.organism}
                    onFetchAlphaFoldRequested={(acc) => handleFetchUniProt(acc)}
                    highlightedResidue={highlightedResidue}
                    onResidueSelected={(atom) => {
                      setSelectedResidue(atom);
                      setHighlightedResidue(atom.residueIndex);
                    }}
                  />
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
                  {selectedResidue && (
                    <ResidueCard atom={selectedResidue} isAlphaFold={isAlphaFold} />
                  )}
                </div>
              )}

              {activeTab === 'confidence' && (
                <ConfidenceTab protein={activeProtein} plddtSummary={plddtSummary} pae={pae} />
              )}

              {activeTab === 'sequence' && (
                <SequenceTab protein={activeProtein} properties={properties} copiedSeq={copiedSeq} copiedFasta={copiedFasta} onCopy={copySequence} onSelectResidue={setHighlightedResidue} />
              )}

              {activeTab === 'mutations' && (
                <MutationTab
                  notation={mutationNotation}
                  setNotation={setMutationNotation}
                  onInspect={handleMutationInspect}
                  result={mutationResult}
                  error={mutationError}
                  highlightedResidue={highlightedResidue}
                  selectedAtom={selectedResidue}
                  isAlphaFold={isAlphaFold}
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
  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs gap-3">
    <div className="min-w-0">
      <div className="font-bold font-mono truncate">{file.name}</div>
      <div className="text-[10px] text-slate-500 font-mono">{file.format} · {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'content pending'}</div>
    </div>
    <button onClick={onClear} className="text-rose-600 hover:underline text-[11px] font-semibold">Remove</button>
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

const EmptyWorkspace = ({ onFetch }: { onFetch: () => void }) => (
  <div className="space-y-5">
    <div>
      <h3 className="font-bold text-lg">Active Protein</h3>
      <p className="text-xs text-slate-500 mt-1">Choose one input workflow: structure file, UniProt accession, or protein sequence.</p>
    </div>
    <Pdb3DViewer pdbText="" onFetchAlphaFoldRequested={onFetch} />
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

const ActiveHeader = ({ protein }: { protein: ActiveProtein }) => (
  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
    <div>
      <h3 className="font-bold text-lg">{protein.title}</h3>
      <p className="text-xs text-slate-500 mt-1">
        {[protein.proteinName, protein.organism, protein.gene ? `Gene ${protein.gene}` : ''].filter(Boolean).join(' · ') || protein.sequenceLabel}
      </p>
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
      <span className="px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{protein.sourceLabel}</span>
      <span className="px-2.5 py-1 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{protein.structureType}</span>
      <span className={`px-2.5 py-1 rounded-lg border ${protein.locationLabel === 'ONLINE' ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>{protein.locationLabel}</span>
    </div>
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
    {(['structure', 'confidence', 'sequence', 'mutations'] as WorkspaceTab[]).map((tab) => (
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

const ConfidenceTab = ({ protein, plddtSummary, pae }: { protein: ActiveProtein; plddtSummary: ReturnType<typeof summarizePlddt> | null; pae: PaeMatrix | null }) => {
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

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3">
        <h4 className="font-bold">Local Confidence - pLDDT</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">pLDDT estimates AlphaFold's local confidence for each residue. It is not an accuracy guarantee or a probability that the structure is correct.</p>
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
      </div>
      <div className="flex gap-2">
        <button onClick={() => onCopy(false)} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold flex items-center gap-1">{copiedSeq ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy Sequence</button>
        <button onClick={() => onCopy(true)} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold flex items-center gap-1">{copiedFasta ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}Copy FASTA</button>
      </div>
    </div>
    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg max-h-56 overflow-y-auto font-mono text-xs leading-relaxed">
      {protein.sequence.split('').map((aa, idx) => (
        <button key={idx} onClick={() => onSelectResidue(idx + 1)} className="inline-block px-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded" title={`Residue ${idx + 1}: ${aa}`}>{aa}</button>
      ))}
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
    <div>
      <h4 className="font-bold text-sm">Kyte-Doolittle Hydropathy</h4>
      <p className="text-[11px] text-slate-500">Window size 9. Hydrophobic region scores are above the zero line.</p>
    </div>
    <div className="relative h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex items-center">
      <div className="absolute left-2 right-2 top-1/2 border-t border-slate-300 dark:border-slate-700" />
      <div className="relative w-full h-full flex items-center gap-px">
        {properties.hydropathy_profile.map((value, idx) => {
          const height = Math.max(4, Math.min(50, Math.abs(value / 4.5) * 50));
          return <div key={idx} title={`Residue window ${idx + 1}: ${value.toFixed(2)}`} className={`flex-1 ${value >= 0 ? 'self-start mt-[50%] bg-sky-500' : 'self-end mb-[50%] bg-amber-500'}`} style={{ height: `${height}%` }} />;
        })}
      </div>
    </div>
  </div>
);

const MutationTab = ({ notation, setNotation, onInspect, result, error, highlightedResidue, selectedAtom, isAlphaFold }: {
  notation: string;
  setNotation: (value: string) => void;
  onInspect: () => void;
  result: MutationDescription | null;
  error: string | null;
  highlightedResidue: number | null;
  selectedAtom: ProteinAtom | null;
  isAlphaFold: boolean;
}) => (
  <div className="space-y-4">
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-3">
      <div>
        <h4 className="font-bold">Mutation Inspector</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">Inspect a single amino-acid substitution in sequence and structure context. This is not a mutation-effect predictor.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="F24S" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono text-sm" />
        <button onClick={onInspect} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold">Inspect Mutation</button>
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
      <div className="text-xs text-slate-500">Mutation location: {highlightedResidue ? `residue ${highlightedResidue}` : 'select or inspect a residue'}</div>
      {selectedAtom && <ResidueCard atom={selectedAtom} isAlphaFold={isAlphaFold} />}
    </div>
    <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200">
      <h4 className="font-bold">Mutation Interpretation</h4>
      <p className="mt-1">These comparisons describe sequence and structural context. BioFile Toolkit is not predicting whether this mutation stabilizes or destabilizes the protein. AlphaFold confidence does not establish mutation pathogenicity or ΔΔG.</p>
    </div>
  </div>
);

const LimitationCards = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
    <InfoCard icon={<Activity className="w-4 h-4 text-sky-600" />} title="Protein Dynamics" text="AlphaFold DB models represent predicted structural conformations, not molecular-dynamics trajectories." />
    <InfoCard icon={<Search className="w-4 h-4 text-sky-600" />} title="Binding & Drug Design" text="A predicted protein structure alone does not establish a drug-binding pose or binding affinity." />
    <InfoCard icon={<Info className="w-4 h-4 text-sky-600" />} title="Cellular Context" text="Crowding, membranes, cofactors, modifications, partners, pH, and ionic conditions may alter biological behavior." />
  </div>
);
