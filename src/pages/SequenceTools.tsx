import React, { useState, useEffect } from 'react';
import { CasingOption, OverallStatsSummary, TranslationResponse } from '../types/bio';
import { FileUploader } from '../components/common/FileUploader';
import {
  transformSequence,
  translateSequence,
  calculateSequenceStats,
  detectSequenceType,
} from '../services/biofileApi';
import {
  Dna,
  Copy,
  Download,
  Trash2,
  Check,
  Table as TableIcon,
} from 'lucide-react';


interface SequenceToolsProps {
  initialSequence: string;
}

export const SequenceTools: React.FC<SequenceToolsProps> = ({ initialSequence }) => {
  const [inputSeq, setInputSeq] = useState(initialSequence || '>sample1\nATGCCGTTAGAATAG');
  const [outputSeq, setOutputSeq] = useState('');
  const [operation, setOperation] = useState<'reverse' | 'complement' | 'reverse_complement' | 'dna_to_rna' | 'rna_to_dna' | 'translate' | 'stats'>('reverse_complement');
  const [isRna] = useState(false);
  const [casing, setCasing] = useState<CasingOption>('uppercase');
  const [appendSuffix, setAppendSuffix] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null); // null = all 6 frames
  const [stopAtStopCodon, setStopAtStopCodon] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResponse | null>(null);
  const [statsResult, setStatsResult] = useState<OverallStatsSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [recordsCount, setRecordsCount] = useState(1);

  useEffect(() => {
    runTransformation();
  }, [inputSeq, operation, isRna, casing, appendSuffix, selectedFrame, stopAtStopCodon]);

  const runTransformation = async () => {
    if (!inputSeq.trim()) {
      setOutputSeq('');
      setTranslationResult(null);
      setStatsResult(null);
      return;
    }

    // Detect RNA vs DNA automatically
    const detected = await detectSequenceType(inputSeq);
    const rnaMode = detected === 'RNA' || isRna;

    if (operation === 'translate') {
      const res = await translateSequence(inputSeq, selectedFrame, stopAtStopCodon);
      setTranslationResult(res);
      const text = res.frames
        .map((f) => `>Frame_${f.frame_label} (${f.amino_acid_count} AA, ${f.stop_codon_count} stops)\n${f.protein_sequence}`)
        .join('\n\n');
      setOutputSeq(text);
      setRecordsCount(res.frames.length);
    } else if (operation === 'stats') {
      const res = await calculateSequenceStats(inputSeq);
      setStatsResult(res);
      setOutputSeq(
        `Overall Statistics:\nTotal Records: ${res.total_records}\nTotal Length: ${res.total_length} bp\nGC Content: ${res.overall_gc_percent.toFixed(2)}%\nA: ${res.total_a}  C: ${res.total_c}  G: ${res.total_g}  T: ${res.total_t}  N: ${res.total_n}`
      );
    } else {
      const res = await transformSequence(inputSeq, operation, rnaMode, casing, appendSuffix);
      setOutputSeq(res.output_text);
      setRecordsCount(res.records_transformed);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputSeq);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'fasta') => {
    const blob = new Blob([outputSeq], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequence_${operation}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Dna className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Sequence Workspace</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Perform biological transformations, 6-frame translation, and GC statistics on plain or multi-FASTA sequences.
          </p>
        </div>

        {/* Casing & Suffix controls */}
        <div className="flex items-center space-x-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg shadow-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Casing:</span>
            <select
              value={casing}
              onChange={(e) => setCasing(e.target.value as CasingOption)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="preserve">Preserve Input</option>
            </select>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={appendSuffix}
              onChange={(e) => setAppendSuffix(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Append Header Suffix</span>
          </label>
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
        <button
          onClick={() => setOperation('reverse_complement')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'reverse_complement'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Reverse Complement
        </button>

        <button
          onClick={() => setOperation('complement')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'complement'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Complement
        </button>

        <button
          onClick={() => setOperation('reverse')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'reverse'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Reverse Only
        </button>

        <button
          onClick={() => setOperation('dna_to_rna')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'dna_to_rna'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          DNA → RNA
        </button>

        <button
          onClick={() => setOperation('rna_to_dna')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'rna_to_dna'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          RNA → DNA
        </button>

        <button
          onClick={() => setOperation('translate')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'translate'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Translate (Proteins)
        </button>

        <button
          onClick={() => setOperation('stats')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            operation === 'stats'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Sequence Statistics
        </button>
      </div>

      {/* Translation Settings (visible if translate is active) */}
      {operation === 'translate' && (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">Frame Selection:</span>
            <select
              value={selectedFrame === null ? 'all' : selectedFrame.toString()}
              onChange={(e) => setSelectedFrame(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1"
            >
              <option value="all">All 6 Frames (+1..+3, -1..-3)</option>
              <option value="1">Frame +1</option>
              <option value="2">Frame +2</option>
              <option value="3">Frame +3</option>
              <option value="-1">Frame -1</option>
              <option value="-2">Frame -2</option>
              <option value="-3">Frame -3</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={stopAtStopCodon}
              onChange={(e) => setStopAtStopCodon(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Stop at first stop codon (*)</span>
          </label>
        </div>
      )}

      {/* Split Workspace View (Input vs Output) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input Sequence */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center space-x-2">
              <span>Input Sequence</span>
            </h3>
            <button
              onClick={() => setInputSeq('')}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <FileUploader
            compact
            label="Load FASTA/FASTQ File"
            onFileSelected={(files) => {
              if (files.length > 0 && files[0].content) {
                setInputSeq(files[0].content);
              }
            }}
          />

          <textarea
            value={inputSeq}
            onChange={(e) => setInputSeq(e.target.value)}
            placeholder="Paste sequence or FASTA format here, or use the file uploader above..."
            className="w-full h-72 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-200"
          />


          <div className="text-xs text-slate-500 flex justify-between">
            <span>Raw Characters: {inputSeq.length}</span>
            <span>Lines: {inputSeq.split('\n').length}</span>
          </div>
        </div>

        {/* Right: Output Transformed Sequence */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center space-x-2">
              <span>Output Result</span>
              <span className="text-xs bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded-full font-medium">
                {recordsCount} record{recordsCount > 1 ? 's' : ''}
              </span>
            </h3>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                disabled={!outputSeq}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleDownload('fasta')}
                disabled={!outputSeq}
                className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={outputSeq}
            placeholder="Transformed output will appear here..."
            className="w-full h-80 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
          />

          <div className="text-xs text-slate-500 flex justify-between">
            <span>Result Length: {outputSeq.length} characters</span>
            <span>Operation: {operation}</span>
          </div>
        </div>
      </div>

      {/* Translation Frames Summary Cards */}
      {operation === 'translate' && translationResult && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {translationResult.frames.map((fr, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-1 shadow-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Frame {fr.frame_label}</span>
              <div className="text-slate-500">{fr.amino_acid_count} AA</div>
              <div className="text-slate-500">{fr.stop_codon_count} Stops (*)</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-Record Statistics Table (if stats active) */}
      {operation === 'stats' && statsResult && statsResult.per_record_stats.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-amber-600" />
            <span>Per-Record Sequence Analysis</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Header / ID</th>
                  <th className="p-2.5">Length (bp)</th>
                  <th className="p-2.5">GC %</th>
                  <th className="p-2.5">AT %</th>
                  <th className="p-2.5">A</th>
                  <th className="p-2.5">C</th>
                  <th className="p-2.5">G</th>
                  <th className="p-2.5">T/U</th>
                  <th className="p-2.5">N / Ambiguous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {statsResult.per_record_stats.map((st, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {st.header || `Record ${idx + 1}`}
                    </td>
                    <td className="p-2.5">{st.length}</td>
                    <td className="p-2.5 font-bold text-amber-600 dark:text-amber-400">
                      {st.gc_percent.toFixed(2)}%
                    </td>
                    <td className="p-2.5">{st.at_percent.toFixed(2)}%</td>
                    <td className="p-2.5">{st.count_a}</td>
                    <td className="p-2.5">{st.count_c}</td>
                    <td className="p-2.5">{st.count_g}</td>
                    <td className="p-2.5">{st.count_t + st.count_u}</td>
                    <td className="p-2.5">{st.count_n + st.count_ambiguous}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
