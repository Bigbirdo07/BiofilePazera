import React, { useState, useRef } from 'react';
import { PageView, ProteinProperties } from '../types/bio';
import { calculateProteinProperties, extractFastaFromPdb } from '../services/biofileApi';
import { FileUploader } from '../components/common/FileUploader';
import { Pdb3DViewer } from '../components/common/Pdb3DViewer';

import {
  Activity,
  Search,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Layers,
  AlertTriangle,
  FileCode,
  Globe,
  FileText,
  RotateCcw,
  Info,
} from 'lucide-react';


export interface ParsedHeaderInfo {
  headerRaw: string;
  accession?: string;
  entryName?: string;
  proteinName?: string;
  organism?: string;
  gene?: string;
}

export const parseFastaHeader = (headerLine: string): ParsedHeaderInfo => {
  const result: ParsedHeaderInfo = { headerRaw: headerLine };
  if (!headerLine || !headerLine.trim()) return result;

  const line = headerLine.trim();
  const header = line.startsWith('>') ? line.substring(1).trim() : line;

  // Pattern 1: SwissProt / TrEMBL: >sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
  // Pattern 1b: >tr|A0A024RBG1|A0A024RBG1_HUMAN ...
  const dbMatch = header.match(/^(?:sp|tr)\|([A-Z0-9]{6,10})\|(\S+)\s+(.*)$/i);
  if (dbMatch) {
    result.accession = dbMatch[1].toUpperCase();
    result.entryName = dbMatch[2];
    
    const rest = dbMatch[3];
    // Extract OS=Organism
    const osMatch = rest.match(/OS=([^=]+?)(?=\s+[A-Z]{2}=|$)/);
    if (osMatch) result.organism = osMatch[1].trim();

    // Extract GN=Gene
    const gnMatch = rest.match(/GN=([^=]+?)(?=\s+[A-Z]{2}=|$)/);
    if (gnMatch) result.gene = gnMatch[1].trim();

    // Extract Protein Name (everything before OS=)
    const nameMatch = rest.split(/\s+[A-Z]{2}=/)[0];
    if (nameMatch) result.proteinName = nameMatch.trim();

    return result;
  }

  // Pattern 2: PDB format: >pdb|1UBQ|A Chain A, Ubiquitin
  const pdbMatch = header.match(/^pdb\|([A-Z0-9]{4})\|(\S+)\s+(.*)$/i);
  if (pdbMatch) {
    result.accession = pdbMatch[1].toUpperCase();
    result.proteinName = pdbMatch[3].trim();
    return result;
  }

  // Pattern 3: Generic UniProt accession in header: P01308 or P04637
  const accMatch = header.match(/\b([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-N,R-Z][0-9]{5})\b/i);
  if (accMatch) {
    result.accession = accMatch[1].toUpperCase();
    const parts = header.split(/\s+/);
    if (parts.length > 1) {
      result.proteinName = parts.slice(1).join(' ');
    }
  }

  return result;
};

interface ProteinStudioProps {
  onNavigate?: (view: PageView) => void;
}

type InputMode = 'structure' | 'uniprot' | 'sequence';

interface SelectedFile {
  name: string;
  size: number;
  content: string;
}

interface ActiveModel {
  title: string;
  accession?: string;
  species?: string;
  proteinName?: string;
  source: 'LOCAL' | 'PDB' | 'ALPHAFOLD DB' | 'SEQUENCE';
  sourceDetails: string;
  isExperimental: boolean;
  isAlphaFold: boolean;
  pdbText?: string;
  sequence: string;
  chains: string[];
}


export const ProteinStudio: React.FC<ProteinStudioProps> = ({ onNavigate }) => {
  // Input Mode Segmented Switch
  const [inputMode, setInputMode] = useState<InputMode>('structure');

  // Input States
  const [structureFile, setStructureFile] = useState<SelectedFile | null>(null);
  const [sequenceFile, setSequenceFile] = useState<SelectedFile | null>(null);
  const [uniprotAccession, setUniprotAccession] = useState<string>('P04637');
  const [pastedSequence, setPastedSequence] = useState<string>('');

  // Misrouting Guard
  const [isFastqDetected, setIsFastqDetected] = useState<boolean>(false);

  // Execution & Race Safety States
  const [executionState, setExecutionState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const latestTokenRef = useRef<number>(0);

  // Active Rendered Model & Results Workspace
  const [activeModel, setActiveModel] = useState<ActiveModel | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('ALL');
  const [colorMode, setColorMode] = useState<'plddt' | 'chain' | 'spectrum' | 'bfactor'>('plddt');
  const [renderMode, setRenderMode] = useState<'ribbon' | 'trace' | 'spheres'>('ribbon');

  const [properties, setProperties] = useState<ProteinProperties | null>(null);
  const [copiedFasta, setCopiedFasta] = useState<boolean>(false);
  const [copiedSeq, setCopiedSeq] = useState<boolean>(false);

  // Parse chains from PDB ATOM lines
  const extractChainsFromPdb = (pdbText: string): string[] => {
    const chainsSet = new Set<string>();
    const lines = pdbText.split('\n');
    for (let l of lines) {
      if ((l.startsWith('ATOM') || l.startsWith('HETATM')) && l.length > 21) {
        const c = l.substring(21, 22).trim();
        if (c) chainsSet.add(c);
      }
    }
    return Array.from(chainsSet).sort();
  };

  // WORKFLOW A: LOAD A STRUCTURE (.pdb, .cif, .mmcif)
  const handleLoadStructure = async () => {
    if (!structureFile) {
      setErrorMessage('Please select or drop a PDB/mmCIF structure file.');
      return;
    }
    setIsFastqDetected(false);
    setErrorMessage(null);
    setErrorDetails(null);
    setExecutionState('loading');
    const token = ++latestTokenRef.current;

    try {
      const content = structureFile.content;

      // Validate structure parsing
      if (!content.includes('ATOM') && !content.includes('HETATM')) {
        throw new Error('No valid ATOM or HETATM atomic coordinate records found in the structure file.');
      }

      const extractedFasta = await extractFastaFromPdb(content);
      const cleanSeq = extractedFasta.toString().replace(/>.*/g, '').replace(/\s+/g, '');
      const chains = extractChainsFromPdb(content);
      const isExperimental = content.includes('X-RAY') || content.includes('NMR') || content.includes('CRYO-EM') || !content.includes('ALPHAFOLD');

      if (token !== latestTokenRef.current) return;

      const model: ActiveModel = {
        title: structureFile.name,
        source: 'PDB',
        sourceDetails: isExperimental ? 'Experimental Structure (X-Ray / Cryo-EM)' : 'Local Structure File',
        isExperimental,
        isAlphaFold: !isExperimental,
        pdbText: content,
        sequence: cleanSeq,
        chains: chains.length > 0 ? chains : ['A'],
      };

      setActiveModel(model);
      setSelectedChain('ALL');
      setColorMode(isExperimental ? 'chain' : 'plddt');

      const props = await calculateProteinProperties(cleanSeq);
      if (token !== latestTokenRef.current) return;
      setProperties(props);
      setExecutionState('idle');
    } catch (err: any) {
      if (token !== latestTokenRef.current) return;
      setExecutionState('error');
      setErrorMessage('The structure file could not be parsed.');
      setErrorDetails(err?.message || 'Unknown structure parsing error');
    }
  };

  // WORKFLOW B: FETCH UNIPROT ALPHAFOLD DB STRUCTURE
  const handleFetchUniProt = async (overrideAccession?: string) => {
    const targetId = (overrideAccession || uniprotAccession).trim().toUpperCase();
    if (!targetId) {
      setErrorMessage('Please enter a valid UniProt accession ID.');
      return;
    }

    // Validate accession format
    const isAccValid = /^[A-Z0-9]{6,10}$/i.test(targetId);
    if (!isAccValid) {
      setExecutionState('error');
      setErrorMessage(`"${targetId}" is not recognized as a valid UniProt accession format.`);
      setErrorDetails('UniProt accessions usually consist of 6 to 10 alphanumeric characters (e.g. P04637, P01308).');
      return;
    }

    setErrorMessage(null);
    setErrorDetails(null);
    setExecutionState('loading');
    const token = ++latestTokenRef.current;

    try {
      // 1. Query AlphaFold DB API to resolve exact PDB URL and metadata
      let pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${targetId}-F1-model_v6.pdb`;
      let metaOrganism = '';
      let metaDescription = '';

      try {
        const apiRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${targetId}`);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData) && apiData.length > 0) {
            const item = apiData[0];
            if (item.pdbUrl) pdbUrl = item.pdbUrl;
            if (item.organismScientificName) metaOrganism = item.organismScientificName;
            if (item.uniprotDescription) metaDescription = item.uniprotDescription;
          }
        }
      } catch (_e) {
        // Fallback to static URL if API search fails
      }

      let response = await fetch(pdbUrl);
      
      // Secondary Fallback to v4
      if (!response.ok) {
        pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${targetId}-F1-model_v4.pdb`;
        response = await fetch(pdbUrl);
      }

      if (!response.ok) {
        throw new Error(`No AlphaFold DB structure model found for accession "${targetId}". HTTP Status ${response.status}`);
      }

      const pdbText = await response.text();
      const extractedFasta = await extractFastaFromPdb(pdbText);
      const cleanSeq = extractedFasta.toString().replace(/>.*/g, '').replace(/\s+/g, '');
      const chains = extractChainsFromPdb(pdbText);

      if (token !== latestTokenRef.current) return;

      const speciesText = metaOrganism
        ? `${metaDescription ? metaDescription + ' · ' : ''}${metaOrganism}`
        : targetId === 'P04637'
        ? 'Cellular tumor antigen p53 · Homo sapiens'
        : targetId === 'P01308'
        ? 'Insulin · Homo sapiens'
        : targetId === 'P0DTC2'
        ? 'Spike glycoprotein · SARS-CoV-2'
        : 'Organism Metadata via AlphaFold DB';

      const model: ActiveModel = {
        title: `UniProt Accession ${targetId}`,
        accession: targetId,
        species: speciesText,
        proteinName: metaDescription || 'Protein Structure',
        source: 'ALPHAFOLD DB',
        sourceDetails: 'AlphaFold DB • ONLINE Model',
        isExperimental: false,
        isAlphaFold: true,
        pdbText,
        sequence: cleanSeq,
        chains: chains.length > 0 ? chains : ['A'],
      };

      setActiveModel(model);
      setSelectedChain('ALL');
      setColorMode('plddt');

      const props = await calculateProteinProperties(cleanSeq);
      if (token !== latestTokenRef.current) return;
      setProperties(props);
      setExecutionState('idle');
    } catch (err: any) {

      if (token !== latestTokenRef.current) return;
      setExecutionState('error');
      setErrorMessage('AlphaFold DB structure lookup failed.');
      setErrorDetails(err?.message || 'Network request failed or accession model unavailable.');
    }
  };

  // WORKFLOW C: ANALYZE A PROTEIN SEQUENCE (FASTA / Raw)
  const handleAnalyzeSequence = async () => {
    const rawContent = sequenceFile?.content || pastedSequence;
    if (!rawContent.trim()) {
      setErrorMessage('Please upload a FASTA file or paste an amino-acid sequence.');
      return;
    }

    setErrorMessage(null);
    setErrorDetails(null);
    setExecutionState('loading');
    const token = ++latestTokenRef.current;

    try {
      const cleanSeq = rawContent.replace(/>.*/g, '').replace(/[^A-Z]/gi, '').toUpperCase();

      if (!cleanSeq) {
        throw new Error('No valid amino-acid characters found in sequence input.');
      }

      // Check for ambiguous DNA letter sequences (e.g. sequence containing only A, C, G, T)
      const dnaBaseCount = (cleanSeq.match(/[ACGT]/g) || []).length;
      if (cleanSeq.length > 15 && dnaBaseCount / cleanSeq.length > 0.95) {
        setErrorMessage('Warning: This sequence appears to be nucleotide DNA (A, C, G, T) rather than protein amino acids.');
      }

      if (token !== latestTokenRef.current) return;

      const firstLine = rawContent.split('\n')[0] || '';
      const parsedHeader = parseFastaHeader(firstLine);

      const displayTitle = parsedHeader.accession && parsedHeader.proteinName
        ? `${parsedHeader.accession} · ${parsedHeader.entryName || parsedHeader.proteinName}`
        : parsedHeader.accession
        ? `UniProt ${parsedHeader.accession}`
        : sequenceFile
        ? sequenceFile.name
        : 'Analyzed Protein Sequence';

      const model: ActiveModel = {
        title: displayTitle,
        accession: parsedHeader.accession,
        species: parsedHeader.organism || (parsedHeader.proteinName ? `${parsedHeader.proteinName} · Homo sapiens` : undefined),
        proteinName: parsedHeader.proteinName,
        source: 'SEQUENCE',
        sourceDetails: parsedHeader.accession
          ? `Sequence Loaded (AlphaFold DB ${parsedHeader.accession} available)`
          : 'Sequence Analysis (No 3D Coordinates)',
        isExperimental: false,
        isAlphaFold: false,
        pdbText: '', // Empty 3D coordinates triggers informative empty state or 3D STRUCTURE AVAILABLE callout
        sequence: cleanSeq,
        chains: ['Sequence-derived'],
      };

      setActiveModel(model);
      setSelectedChain('ALL');


      const props = await calculateProteinProperties(cleanSeq);
      if (token !== latestTokenRef.current) return;
      setProperties(props);
      setExecutionState('idle');
    } catch (err: any) {
      if (token !== latestTokenRef.current) return;
      setExecutionState('error');
      setErrorMessage('Invalid FASTA or amino-acid sequence input.');
      setErrorDetails(err?.message || 'Unable to parse sequence data');
    }
  };

  // Reset / Clear handler
  const handleResetAnalysis = () => {
    setActiveModel(null);
    setProperties(null);
    setStructureFile(null);
    setSequenceFile(null);
    setPastedSequence('');
    setIsFastqDetected(false);
    setErrorMessage(null);
    setErrorDetails(null);
    setExecutionState('idle');
  };

  const handleCopyFastaText = () => {
    if (!activeModel) return;
    const fasta = `>${activeModel.title}\n${activeModel.sequence}`;
    navigator.clipboard.writeText(fasta);
    setCopiedFasta(true);
    setTimeout(() => setCopiedFasta(false), 2000);
  };

  const handleCopyRawSeq = () => {
    if (!activeModel) return;
    navigator.clipboard.writeText(activeModel.sequence);
    setCopiedSeq(true);
    setTimeout(() => setCopiedSeq(false), 2000);
  };

  return (
    <div className="w-full px-4 sm:px-5 lg:px-6 xl:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Protein Studio</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Load atomic structures, query predicted AlphaFold DB models, or calculate sequence-derived physicochemical properties.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeModel && (
            <button
              onClick={handleResetAnalysis}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Scientific Workstation</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Scientific Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        
        {/* LEFT PANEL: INPUT CONTROL SIDEBAR (fixed 350-380px on desktop) */}
        <div className="min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Sidebar Title & Segmented Mode Selector */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-sky-600" />
                <span>Input</span>
              </h3>

              {/* 3 Segmented Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                <button
                  onClick={() => {
                    setInputMode('structure');
                    setIsFastqDetected(false);
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                    inputMode === 'structure' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  Structure File
                </button>
                <button
                  onClick={() => {
                    setInputMode('uniprot');
                    setIsFastqDetected(false);
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                    inputMode === 'uniprot' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  UniProt
                </button>
                <button
                  onClick={() => {
                    setInputMode('sequence');
                    setIsFastqDetected(false);
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 rounded-md text-[11px] transition-all cursor-pointer ${
                    inputMode === 'sequence' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  Sequence
                </button>
              </div>
            </div>

            {/* ERROR / WARNING MESSAGES */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs space-y-1">
                <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Input Error</span>
                </div>
                <p className="text-rose-800 dark:text-rose-300 leading-snug">{errorMessage}</p>
                {errorDetails && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-1">{errorDetails}</p>}
              </div>
            )}

            {/* FASTQ MISROUTING GUARD ALERT */}
            {isFastqDetected && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>FASTQ detected</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  FASTQ contains sequencing reads rather than a protein structure.
                </p>
                <button
                  onClick={() => onNavigate?.('inspect')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Open in Sequencing QC
                </button>
              </div>
            )}

            {/* MODE 1: STRUCTURE FILE (.pdb, .cif, .mmcif) */}
            {inputMode === 'structure' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">Structure File</h4>
                  <p className="text-[11px] text-slate-500">Load local experimental 3D atomic coordinates.</p>
                </div>

                <FileUploader
                  accept=".pdb,.cif,.mmcif,.ent"
                  label="Drop PDB or mmCIF structure file (.pdb, .cif, .mmcif)"
                  onFileSelected={(files) => {
                    if (files.length > 0) {
                      const f = files[0];
                      // FASTQ Check
                      if (f.name.endsWith('.fastq') || f.name.endsWith('.fq') || f.name.endsWith('.gz') || f.content?.startsWith('@')) {
                        setIsFastqDetected(true);
                        setStructureFile(null);
                        return;
                      }
                      setIsFastqDetected(false);
                      setStructureFile({
                        name: f.name,
                        size: f.content ? f.content.length : 0,
                        content: f.content || '',
                      });
                    }
                  }}
                />

                {structureFile && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 font-mono truncate max-w-[200px]">{structureFile.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{(structureFile.size / 1024).toFixed(1)} KB • PDB Structure</div>
                    </div>
                    <button
                      onClick={() => setStructureFile(null)}
                      className="text-rose-600 hover:underline text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <button
                  disabled={!structureFile || executionState === 'loading'}
                  onClick={handleLoadStructure}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  <span>{executionState === 'loading' ? 'Loading Structure...' : 'Load Structure'}</span>
                </button>
              </div>
            )}

            {/* MODE 2: UNIPROT ALPHAFOLD DB LOOKUP */}
            {inputMode === 'uniprot' && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">UniProt / AlphaFold DB</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Fetch predicted structure from AlphaFold DB.</p>
                  </div>
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>ONLINE</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">UniProt accession</label>
                  <input
                    type="text"
                    value={uniprotAccession}
                    onChange={(e) => setUniprotAccession(e.target.value)}
                    placeholder="e.g. P04637, P01308, P0DTC2"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Example Accession Buttons */}
                <div className="text-[11px] space-y-1">
                  <span className="text-slate-500 block">Try:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setUniprotAccession('P01308');
                        handleFetchUniProt('P01308');
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px] cursor-pointer"
                    >
                      P01308 (Insulin)
                    </button>
                    <button
                      onClick={() => {
                        setUniprotAccession('P04637');
                        handleFetchUniProt('P04637');
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px] cursor-pointer"
                    >
                      P04637 (p53)
                    </button>
                    <button
                      onClick={() => {
                        setUniprotAccession('P0DTC2');
                        handleFetchUniProt('P0DTC2');
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px] cursor-pointer"
                    >
                      P0DTC2 (Spike)
                    </button>
                  </div>
                </div>

                <button
                  disabled={!uniprotAccession.trim() || executionState === 'loading'}
                  onClick={() => handleFetchUniProt()}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{executionState === 'loading' ? 'Fetching AlphaFold DB...' : 'Fetch AlphaFold DB Structure'}</span>
                </button>
              </div>
            )}

            {/* MODE 3: PROTEIN SEQUENCE (.fasta, .fa, .txt or paste) */}
            {inputMode === 'sequence' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">Protein Sequence</h4>
                  <p className="text-[11px] text-slate-500">Calculate physicochemical properties from sequence.</p>
                </div>

                <FileUploader
                  accept=".fasta,.fa,.faa,.txt"
                  label="Drop FASTA file (.fasta, .fa, .faa, .txt)"
                  onFileSelected={(files) => {
                    if (files.length > 0) {
                      const f = files[0];
                      if (f.name.endsWith('.fastq') || f.name.endsWith('.fq') || f.content?.startsWith('@')) {
                        setIsFastqDetected(true);
                        setSequenceFile(null);
                        return;
                      }
                      setIsFastqDetected(false);
                      setSequenceFile({
                        name: f.name,
                        size: f.content ? f.content.length : 0,
                        content: f.content || '',
                      });
                    }
                  }}
                />

                {sequenceFile && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{sequenceFile.name}</span>
                    <button onClick={() => setSequenceFile(null)} className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer">Remove</button>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Or paste amino-acid sequence</label>
                  <textarea
                    value={pastedSequence}
                    onChange={(e) => setPastedSequence(e.target.value)}
                    placeholder="Paste sequence (e.g. >protein\nMEEPQSDPSV...)"
                    className="w-full h-24 p-2.5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[11px] text-slate-500 leading-relaxed">
                  Note: Sequence analysis calculates protein properties without fabricating 3D coordinates.
                </div>

                <button
                  disabled={(!sequenceFile && !pastedSequence.trim()) || executionState === 'loading'}
                  onClick={handleAnalyzeSequence}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {executionState === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span>{executionState === 'loading' ? 'Analyzing Sequence...' : 'Analyze Sequence'}</span>
                </button>
              </div>
            )}

          </div>

          {/* Footer Method Badge */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Method Scope: Single Action Execution</span>
            <span className="text-slate-500">v1.0.0-rc.1</span>
          </div>

        </div>

        {/* RIGHT PANEL: MAIN SCIENTIFIC WORKSPACE */}
        <div className="min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
          
          {/* STATE A: EMPTY STATE BEFORE SUBMISSION */}
          {!activeModel && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Protein Studio</h3>
                <p className="text-xs text-slate-500 mt-1">Load a structure, enter a UniProt accession, or analyze a protein sequence.</p>
              </div>

              {/* Informative 3D Canvas Placeholder */}
              <Pdb3DViewer
                pdbText=""
                onFetchAlphaFoldRequested={() => {
                  setInputMode('uniprot');
                  setUniprotAccession('P04637');
                }}
              />

              {/* Workflow Hints Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span>PDB / mmCIF</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Visualize known experimental 3D structures locally.</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>UniProt</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Retrieve AlphaFold DB predicted 3D models online.</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>FASTA</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Calculate sequence properties and hydropathy profiles.</p>
                </div>
              </div>
            </div>
          )}

          {/* STATE B: ACTIVE SUBMITTED MODEL RESULTS WORKSPACE */}
          {activeModel && (
            <div className="space-y-6">
              
              {/* Active Model Header & Source Badges */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center space-x-2">
                    <span>{activeModel.title}</span>
                  </h3>
                  {activeModel.species && (
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{activeModel.species}</div>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  {activeModel.source === 'ALPHAFOLD DB' && (
                    <span className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-lg font-bold">
                      ALPHAFOLD DB • ONLINE
                    </span>
                  )}
                  {activeModel.source === 'PDB' && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-bold">
                      LOCAL STRUCTURE • {activeModel.isExperimental ? 'EXPERIMENTAL' : 'PREDICTED'}
                    </span>
                  )}
                  {activeModel.source === 'SEQUENCE' && (
                    <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg font-bold">
                      SEQUENCE ANALYSIS
                    </span>
                  )}
                </div>
              </div>

              {/* 3D VIEWER CONTAINER (Minimum Height 480-520px) */}
              <div className="space-y-3">
                <Pdb3DViewer
                  pdbText={activeModel.pdbText}
                  filename={activeModel.title}
                  isAlphaFoldModel={activeModel.isAlphaFold}
                  selectedChain={selectedChain}
                  colorModeOverride={colorMode}
                  renderModeOverride={renderMode}
                  detectedAccession={activeModel.accession}
                  detectedProteinName={activeModel.proteinName}
                  detectedOrganism={activeModel.species}
                  onFetchAlphaFoldRequested={(acc) => handleFetchUniProt(acc)}
                />


                {/* Controls Toolbar: Render Modes, Chain & Color Modes */}
                {activeModel.pdbText && activeModel.pdbText.includes('ATOM') && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
                    {/* Style Render Mode Selector */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold">Style:</span>
                      <button
                        onClick={() => setRenderMode('ribbon')}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                          renderMode === 'ribbon' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Ribbon
                      </button>
                      <button
                        onClick={() => setRenderMode('trace')}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                          renderMode === 'trace' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Backbone
                      </button>
                      <button
                        onClick={() => setRenderMode('spheres')}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                          renderMode === 'spheres' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Cα
                      </button>
                    </div>

                    {/* Chain Selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-semibold">Chain:</span>
                      <select
                        value={selectedChain}
                        onChange={(e) => setSelectedChain(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="ALL">All Chains ({activeModel.chains.length})</option>
                        {activeModel.chains.map((c) => (
                          <option key={c} value={c}>Chain {c}</option>
                        ))}
                      </select>
                    </div>


                    {/* Color Mode Selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-semibold">Color by:</span>
                      {activeModel.isAlphaFold ? (
                        <button
                          onClick={() => setColorMode('plddt')}
                          className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                            colorMode === 'plddt' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          pLDDT
                        </button>
                      ) : (
                        <button
                          onClick={() => setColorMode('bfactor')}
                          className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                            colorMode === 'bfactor' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          B-Factor
                        </button>
                      )}
                      <button
                        onClick={() => setColorMode('chain')}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                          colorMode === 'chain' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Chain
                      </button>
                      <button
                        onClick={() => setColorMode('spectrum')}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                          colorMode === 'spectrum' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Spectrum
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ALPHAFOLD pLDDT LEGEND — ONLY RENDERED WHEN ALPHAFOLD pLDDT COLORING IS ACTIVE */}
              {activeModel.isAlphaFold && colorMode === 'plddt' && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>pLDDT Confidence</span>
                    <div className="group relative flex items-center space-x-1 text-[11px] font-normal text-slate-500 cursor-pointer">
                      <Info className="w-3.5 h-3.5 text-sky-500" />
                      <span>Estimates local confidence in predicted AlphaFold model</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-950/60 rounded border border-blue-200 dark:border-blue-800">
                      <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold text-blue-900 dark:text-blue-200">&gt; 90</div>
                        <div className="text-slate-500">Very High</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-2 bg-cyan-50 dark:bg-cyan-950/60 rounded border border-cyan-200 dark:border-cyan-800">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 shrink-0" />
                      <div>
                        <div className="font-bold text-cyan-900 dark:text-cyan-200">70–90</div>
                        <div className="text-slate-500">Confident</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-950/60 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                      <div>
                        <div className="font-bold text-yellow-900 dark:text-yellow-200">50–70</div>
                        <div className="text-slate-500">Low</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-2 bg-orange-50 dark:bg-orange-950/60 rounded border border-orange-200 dark:border-orange-800">
                      <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
                      <div>
                        <div className="font-bold text-orange-900 dark:text-orange-200">&lt; 50</div>
                        <div className="text-slate-500">Very Low</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROTEIN PROPERTY CARDS (4 COMPACT METRIC CARDS) */}
              {properties && (
                <div className="space-y-4 pt-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Protein Properties</div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold text-[11px]">LENGTH</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{properties.length} aa</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Sequence-derived</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold text-[11px]">MASS</div>
                      <div className="text-lg font-bold text-sky-600">{properties.molecular_weight_kda.toFixed(2)} kDa</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Calculated composition</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold text-[11px]">pI</div>
                      <div className="text-lg font-bold text-purple-600">{properties.isoelectric_point_pi.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Isoelectric point</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold text-[11px]">CHAINS</div>
                      <div className="text-lg font-bold text-emerald-600">{activeModel.chains.length}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{selectedChain === 'ALL' ? 'All Chains' : `Chain ${selectedChain}`}</div>
                    </div>
                  </div>

                  {/* Kyte-Doolittle Hydropathy Chart Section */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Kyte-Doolittle Hydropathy</div>
                      <p className="text-[11px] text-slate-500">Sliding-window estimate of hydrophobic (&gt;0) and hydrophilic (&lt;0) regions.</p>
                    </div>

                    <div className="h-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex items-end justify-between space-x-0.5">
                      {properties.hydropathy_profile.map((val, idx) => {
                        const normalizedHeight = Math.min(100, Math.max(10, ((val + 4.5) / 9.0) * 100));
                        const isHydrophobic = val > 0;
                        return (
                          <div
                            key={idx}
                            title={`Residue window ${idx + 1}: ${val.toFixed(2)}`}
                            className={`flex-1 rounded-t transition-all ${
                              isHydrophobic ? 'bg-sky-500 hover:bg-sky-400' : 'bg-amber-500 hover:bg-amber-400'
                            }`}
                            style={{ height: `${normalizedHeight}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>N-Terminus (1)</span>
                      <span>Hydrophobic (&gt;0) / Hydrophilic (&lt;0)</span>
                      <span>C-Terminus ({properties.length})</span>
                    </div>
                  </div>

                  {/* Collapsible Sequence Panel */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Protein Sequence</div>
                        {activeModel.pdbText && (
                          <div className="text-[10px] text-slate-400">Sequence extracted from observed structure residues</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleCopyRawSeq}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                        >
                          {copiedSeq ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSeq ? 'Copied!' : 'Copy Sequence'}</span>
                        </button>
                        <button
                          onClick={handleCopyFastaText}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                        >
                          {copiedFasta ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedFasta ? 'Copied!' : 'Copy FASTA'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-36 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed select-all">
                      {activeModel.sequence}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
