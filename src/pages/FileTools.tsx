import React, { useState } from 'react';
import { PageView, ValidationReport, SplitResult, ExtractionResult, ChecksumResult, MergeResult, SplitMode } from '../types/bio';
import { validateFile, splitFile, extractSequences, calculateChecksum, verifyChecksum, mergeFiles } from '../services/biofileApi';
import { FileUploader } from '../components/common/FileUploader';
import { open } from '@tauri-apps/plugin-dialog';

import {
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Search,
  KeyRound,
  FileCode2,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  GitMerge,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';


interface FileToolsProps {
  onNavigate: (view: PageView) => void;
}

type FileSubTool = 'split' | 'validate' | 'extract' | 'checksum' | 'merge';

export const FileTools: React.FC<FileToolsProps> = () => {
  const [activeTool, setActiveTool] = useState<FileSubTool>('split');

  // Common State
  const [inputFilePath, setInputFilePath] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Splitter State
  const [outputDir, setOutputDir] = useState<string>('');
  const [splitModeType, setSplitModeType] = useState<'size' | 'records' | 'parts'>('size');
  const [maxSizeMb, setMaxSizeMb] = useState<number>(24);
  const [maxRecords, setMaxRecords] = useState<number>(100000);
  const [numParts, setNumParts] = useState<number>(10);
  const [preserveCompression, setPreserveCompression] = useState<boolean>(true);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [splitError, setSplitError] = useState<string>('');

  // Validator State
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  // Extractor State
  const [extractOutputPath, setExtractOutputPath] = useState<string>('');
  const [targetIdsText, setTargetIdsText] = useState<string>('');
  const [exactMatch, setExactMatch] = useState<boolean>(true);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string>('');

  // Checksum State
  const [checksumResult, setChecksumResult] = useState<ChecksumResult | null>(null);
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [verificationMatch, setVerificationMatch] = useState<boolean | null>(null);
  const [checksumError, setChecksumError] = useState<string>('');

  // Merger State
  const [mergeInputFiles, setMergeInputFiles] = useState<string[]>([]);
  const [mergeOutputPath, setMergeOutputPath] = useState<string>('');
  const [validateMergeOutput, setValidateMergeOutput] = useState<boolean>(true);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [mergeError, setMergeError] = useState<string>('');

  // File Picker Helpers


  const handleAddMergeFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Genomic Files', extensions: ['fasta', 'fa', 'fastq', 'fq', 'gz'] },
        ],
      });
      if (selected) {
        const filesToAdd = Array.isArray(selected) ? selected : [selected];
        setMergeInputFiles((prev) => [...prev, ...filesToAdd]);
      }
    } catch {
      setMergeInputFiles((prev) => [
        ...prev,
        `/user/data/sample_part_${prev.length + 1}.fastq`,
      ]);
    }
  };

  const handleMoveMergeFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === mergeInputFiles.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newFiles = [...mergeInputFiles];
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setMergeInputFiles(newFiles);
  };

  const handleRemoveMergeFile = (index: number) => {
    setMergeInputFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        setOutputDir(selected);
      }
    } catch {
      setOutputDir('/user/data/output_parts/');
    }
  };

  const handleSelectExtractOutputFile = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        setExtractOutputPath(selected);
      }
    } catch {
      setExtractOutputPath('/user/data/extracted_sequences.fastq');
    }
  };

  const handleSelectMergeOutputFile = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        setMergeOutputPath(selected);
      }
    } catch {
      setMergeOutputPath('/user/data/merged_output.fastq');
    }
  };

  // Actions
  const handleRunSplit = async () => {
    if (!inputFilePath) {
      setSplitError('Please select an input FASTA/FASTQ file.');
      return;
    }
    setSplitError('');
    setIsProcessing(true);

    let mode: SplitMode;
    if (splitModeType === 'size') {
      mode = { max_size_mb: maxSizeMb };
    } else if (splitModeType === 'records') {
      mode = { max_records: maxRecords };
    } else {
      mode = { num_parts: numParts };
    }

    const targetDir = outputDir || './output_splits/';

    try {
      const res = await splitFile(inputFilePath, targetDir, mode, preserveCompression);
      setSplitResult(res);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setSplitError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunValidate = async () => {
    if (!inputFilePath) {
      setValidationError('Please select an input FASTA/FASTQ file.');
      return;
    }
    setValidationError('');
    setIsProcessing(true);
    try {
      const report = await validateFile(inputFilePath);
      setValidationReport(report);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setValidationError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunExtract = async () => {
    if (!inputFilePath) {
      setExtractionError('Please select an input FASTA/FASTQ file.');
      return;
    }
    if (!targetIdsText.trim()) {
      setExtractionError('Please enter at least one target sequence ID.');
      return;
    }
    setExtractionError('');
    setIsProcessing(true);

    const ids = targetIdsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const outPath = extractOutputPath || './extracted_output.fastq';

    try {
      const res = await extractSequences(inputFilePath, outPath, ids, exactMatch);
      setExtractionResult(res);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setExtractionError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunChecksum = async () => {
    if (!inputFilePath) {
      setChecksumError('Please select an input file.');
      return;
    }
    setChecksumError('');
    setIsProcessing(true);
    try {
      const res = await calculateChecksum(inputFilePath);
      setChecksumResult(res);
      if (expectedHash.trim()) {
        const isMatch = await verifyChecksum(inputFilePath, expectedHash.trim());
        setVerificationMatch(isMatch);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setChecksumError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunMerge = async () => {
    if (mergeInputFiles.length < 2) {
      setMergeError('Please select at least 2 input files to merge.');
      return;
    }
    setMergeError('');
    setIsProcessing(true);

    const outPath = mergeOutputPath || './merged_output.fastq';

    try {
      const res = await mergeFiles(mergeInputFiles, outPath, validateMergeOutput);
      setMergeResult(res);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setMergeError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FileCode2 className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Large File Tools Workspace</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic, streaming utilities for multi-gigabyte FASTA & FASTQ datasets.
          </p>
        </div>

        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Local Streaming Engine</span>
        </div>
      </div>

      {/* Tool Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTool('split')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTool === 'split'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Smart Splitter</span>
        </button>

        <button
          onClick={() => setActiveTool('merge')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTool === 'merge'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>File Merger</span>
        </button>

        <button
          onClick={() => setActiveTool('validate')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTool === 'validate'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Validator</span>
        </button>

        <button
          onClick={() => setActiveTool('extract')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTool === 'extract'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Extract by ID</span>
        </button>

        <button
          onClick={() => setActiveTool('checksum')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTool === 'checksum'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>SHA-256 Checksum</span>
        </button>
      </div>

      {/* Input File Selector (Shared across split, validate, extract, checksum) */}
      {activeTool !== 'merge' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
            Select Source Sequence File
          </label>
          <FileUploader
            compact
            currentValue={inputFilePath}
            onClear={() => setInputFilePath('')}
            label="Select Source Sequence File"
            onFileSelected={(files) => {
              if (files.length > 0) {
                setInputFilePath(files[0].path);
              }
            }}
          />
        </div>
      )}


      {/* TOOL 1: SMART SPLITTER WORKSPACE */}
      {activeTool === 'split' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-sky-600" />
              <span>Record-Aware Smart Splitter Settings</span>
            </h3>

            {/* Split Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setSplitModeType('size')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  splitModeType === 'size'
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">Max File Size</div>
                <div className="text-[11px] text-slate-500 mt-1 mb-2">Split by target chunk size in MB</div>
                {splitModeType === 'size' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={maxSizeMb}
                      onChange={(e) => setMaxSizeMb(parseFloat(e.target.value) || 24)}
                      className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold"
                    />
                    <span className="text-xs font-semibold">MB</span>
                  </div>
                )}
              </div>

              <div
                onClick={() => setSplitModeType('records')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  splitModeType === 'records'
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">Max Records Per Part</div>
                <div className="text-[11px] text-slate-500 mt-1 mb-2">Split by target record count</div>
                {splitModeType === 'records' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={maxRecords}
                      onChange={(e) => setMaxRecords(parseInt(e.target.value) || 100000)}
                      className="w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold"
                    />
                    <span className="text-xs font-semibold">reads</span>
                  </div>
                )}
              </div>

              <div
                onClick={() => setSplitModeType('parts')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  splitModeType === 'parts'
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">Number of Equal Parts</div>
                <div className="text-[11px] text-slate-500 mt-1 mb-2">Split file into N total parts</div>
                {splitModeType === 'parts' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={numParts}
                      onChange={(e) => setNumParts(parseInt(e.target.value) || 10)}
                      className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold"
                    />
                    <span className="text-xs font-semibold">files</span>
                  </div>
                )}
              </div>
            </div>

            {/* Output Destination Folder */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Folder</label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  placeholder="Output directory path (defaults to ./output_splits/)"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  onClick={handleSelectOutputDir}
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Choose Directory
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveCompression}
                  onChange={(e) => setPreserveCompression(e.target.checked)}
                  className="rounded text-sky-600"
                />
                <span>Preserve Gzip Compression (.gz)</span>
              </label>

              <button
                disabled={isProcessing}
                onClick={handleRunSplit}
                className="flex items-center space-x-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                <span>{isProcessing ? 'Splitting File...' : 'Start Record-Aware Split'}</span>
              </button>
            </div>

            {splitError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{splitError}</span>
              </div>
            )}
          </div>

          {/* Split Result Output & Manifest */}
          {splitResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Split Completed Successfully</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {splitResult.manifest.parts.length} parts created
                </span>
              </div>

              {splitResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300 rounded-lg text-xs space-y-1 border border-amber-200 dark:border-amber-800">
                  <span className="font-bold block">Warnings:</span>
                  {splitResult.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}

              {/* Parts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-sans font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Part #</th>
                      <th className="p-2.5">Filename</th>
                      <th className="p-2.5">Records</th>
                      <th className="p-2.5">Size (Bytes)</th>
                      <th className="p-2.5">SHA-256 Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {splitResult.manifest.parts.map((part) => (
                      <tr key={part.part} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-sans font-bold text-sky-600">Part {part.part}</td>
                        <td className="p-2.5 font-bold">{part.filename}</td>
                        <td className="p-2.5">{part.records_count.toLocaleString()}</td>
                        <td className="p-2.5">{part.size_bytes.toLocaleString()} B</td>
                        <td className="p-2.5 text-[11px] text-slate-500 truncate max-w-xs">{part.sha256}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-xs text-slate-500 font-mono flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span>Manifest Saved: {splitResult.manifest_filepath}</span>
                <span>Original SHA-256: {splitResult.manifest.original_sha256.substring(0, 16)}...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 2: MULTI-FILE MERGER WORKSPACE */}
      {activeTool === 'merge' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <GitMerge className="w-5 h-5 text-purple-600" />
                <span>Multi-File FASTA / FASTQ Merger</span>
              </h3>

              <button
                onClick={handleAddMergeFiles}
                className="flex items-center space-x-1.5 px-4 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Files to Merge</span>
              </button>
            </div>

            {/* Selected Input Files List with Reordering */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Files to Merge in Order ({mergeInputFiles.length} selected)
              </label>

              {mergeInputFiles.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  No files added yet. Click "Add Files to Merge" to choose FASTA or FASTQ files.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                  {mergeInputFiles.map((filepath, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-mono"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="font-sans font-bold text-purple-600 w-5">{idx + 1}.</span>
                        <span className="truncate text-slate-800 dark:text-slate-200">{filepath}</span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveMergeFile(idx, 'up')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === mergeInputFiles.length - 1}
                          onClick={() => handleMoveMergeFile(idx, 'down')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveMergeFile(idx)}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 rounded text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output File Path */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Merged Output File Destination</label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={mergeOutputPath}
                  onChange={(e) => setMergeOutputPath(e.target.value)}
                  placeholder="Output merged file path (e.g. ./merged_output.fastq)"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  onClick={handleSelectMergeOutputFile}
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Choose Output
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={validateMergeOutput}
                  onChange={(e) => setValidateMergeOutput(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span>Validate Format Compatibility Before Merging</span>
              </label>

              <button
                disabled={isProcessing || mergeInputFiles.length < 2}
                onClick={handleRunMerge}
                className="flex items-center space-x-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                <span>{isProcessing ? 'Merging Files...' : 'Execute File Merge'}</span>
              </button>
            </div>

            {mergeError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{mergeError}</span>
              </div>
            )}
          </div>

          {mergeResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>File Merge Successful</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {mergeResult.total_input_files} files merged into {mergeResult.format}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                  <div className="text-slate-500 font-semibold">Merged Records</div>
                  <div className="text-lg font-bold text-purple-600">{mergeResult.total_records_merged.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                  <div className="text-slate-500 font-semibold">Total Bytes Written</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{mergeResult.total_bytes_written.toLocaleString()} B</div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                  <div className="text-slate-500 font-semibold">Output SHA-256</div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate mt-1">{mergeResult.output_sha256.substring(0, 16)}...</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: VALIDATOR WORKSPACE */}
      {activeTool === 'validate' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Biologically Aware File Validator</span>
              </h3>

              <button
                disabled={isProcessing}
                onClick={handleRunValidate}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isProcessing ? 'Validating Stream...' : 'Run Full Validation'}</span>
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {validationReport && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{validationReport.file_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Format: {validationReport.format} • Total Records Scanned: {validationReport.total_records.toLocaleString()}</p>
                </div>

                <div className={`px-4 py-2 rounded-xl font-extrabold text-sm flex items-center space-x-2 ${
                  validationReport.is_valid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {validationReport.is_valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span>{validationReport.is_valid ? 'VALID FILE' : 'INVALID FILE'}</span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">Valid Records</div>
                  <div className="text-xl font-bold text-emerald-600">{validationReport.valid_records.toLocaleString()}</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">Invalid Records</div>
                  <div className="text-xl font-bold text-rose-600">{validationReport.invalid_records.toLocaleString()}</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">Total Bases</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{validationReport.total_bases.toLocaleString()}</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">Avg Read Length</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{validationReport.avg_read_length.toFixed(1)} bp</div>
                </div>
              </div>

              {/* Capped Error Report Table */}
              {validationReport.errors.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Validation Errors (Capped at 1,000 to save memory)</span>
                    {validationReport.errors_capped && <span className="text-amber-600 font-normal">Errors capped</span>}
                  </h5>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-sans font-semibold">
                        <tr>
                          <th className="p-2">Record #</th>
                          <th className="p-2">Error Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {validationReport.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                            <td className="p-2 font-bold text-rose-600">Record {err.record_number}</td>
                            <td className="p-2 text-slate-800 dark:text-slate-200">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: EXTRACTOR WORKSPACE */}
      {activeTool === 'extract' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Search className="w-5 h-5 text-amber-600" />
              <span>Sequence Extraction by Target ID</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target IDs (One per line)</label>
              <textarea
                value={targetIdsText}
                onChange={(e) => setTargetIdsText(e.target.value)}
                placeholder="Paste IDs here (e.g. seq_1001\nseq_1002\n...)"
                className="w-full h-32 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output File Path</label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={extractOutputPath}
                  onChange={(e) => setExtractOutputPath(e.target.value)}
                  placeholder="Output file path (e.g. ./extracted_reads.fastq)"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  onClick={handleSelectExtractOutputFile}
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Choose Output
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exactMatch}
                  onChange={(e) => setExactMatch(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <span>Exact ID Match (Checked = Exact, Unchecked = Header Substring)</span>
              </label>

              <button
                disabled={isProcessing}
                onClick={handleRunExtract}
                className="flex items-center space-x-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{isProcessing ? 'Extracting Reads...' : 'Extract Sequences'}</span>
              </button>
            </div>

            {extractionError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{extractionError}</span>
              </div>
            )}
          </div>

          {extractionResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Extraction Complete</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {extractionResult.records_extracted.toLocaleString()} records extracted
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                  <div className="text-slate-500 font-semibold">Requested IDs</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{extractionResult.total_requested_ids}</div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-xs">
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">Found IDs</div>
                  <div className="text-lg font-bold text-emerald-600">{extractionResult.found_ids_count}</div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-xs">
                  <div className="text-amber-700 dark:text-amber-400 font-semibold">Missing IDs</div>
                  <div className="text-lg font-bold text-amber-600">{extractionResult.missing_ids_count}</div>
                </div>
              </div>

              {extractionResult.missing_ids.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Missing Target IDs:</span>
                  <div className="font-mono text-slate-500 max-h-32 overflow-y-auto">
                    {extractionResult.missing_ids.map((id, idx) => (
                      <div key={idx}>• {id}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TOOL 5: CHECKSUM WORKSPACE */}
      {activeTool === 'checksum' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-rose-600" />
              <span>Streaming SHA-256 Checksum Calculator</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expected SHA-256 Hash (Optional for verification)</label>
              <input
                type="text"
                value={expectedHash}
                onChange={(e) => setExpectedHash(e.target.value)}
                placeholder="Paste expected 64-character SHA-256 hex string..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              disabled={isProcessing}
              onClick={handleRunChecksum}
              className="flex items-center space-x-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>{isProcessing ? 'Computing SHA-256...' : 'Calculate & Verify SHA-256'}</span>
            </button>

            {checksumError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{checksumError}</span>
              </div>
            )}
          </div>

          {checksumResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>SHA-256 Hash Generated</span>
                </h4>

                <button
                  onClick={() => handleCopyHash(checksumResult.sha256_hash)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHash ? 'Copied Hash!' : 'Copy Hash'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-500 font-semibold">File Name: {checksumResult.file_name}</div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 break-all select-all">
                  {checksumResult.sha256_hash}
                </div>
              </div>

              {verificationMatch !== null && (
                <div className={`p-4 rounded-xl font-bold text-xs flex items-center space-x-2 ${
                  verificationMatch
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                }`}>
                  {verificationMatch ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span>{verificationMatch ? 'MATCH: File SHA-256 hash matches the expected hash!' : 'DOES NOT MATCH: File hash differs from expected hash!'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
