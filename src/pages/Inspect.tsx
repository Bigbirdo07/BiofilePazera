import React, { useState } from 'react';
import { FastQcReport, MotifSearchReport } from '../types/bio';
import { generateFastqQcReport, scanSequenceForMotifs } from '../services/biofileApi';
import { FileUploader } from '../components/common/FileUploader';


import {
  Search,
  Activity,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react';

export const Inspect: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'qc' | 'motifs'>('qc');

  // FastQC State
  const [qcFilePath, setQcFilePath] = useState<string>('');
  const [qcReport, setQcReport] = useState<FastQcReport | null>(null);
  const [isQcLoading, setIsQcLoading] = useState<boolean>(false);
  const [qcError, setQcError] = useState<string>('');

  // Motif / Restriction Enzyme State
  const [sequenceInput, setSequenceInput] = useState<string>(
    'ATGTTTGTTTTTCTTGTTTTATTGCCACTAGTCTCTAGTCAGTGTGTTAATGAATTCCTTACAACCAGAACTCAATTACCCCCTGCATACACTAATTCTTTCACACGTGGTGTTTATTACCCTGACAAAGTTTTCAGATCCTCAGTTTTACATTCAACTCAGGACTTGTTCTTACCTTTCTTTTCCAATGTTACTTGGTTCCATGCTATACATGTCTCTGGGACCAATGGTACTAAGAGGTTTGATAACCCTGTCCTACCATTTAATGATGGTGTTTATTTTGCTTCCACTGAGAAGTCTAACATAATAAGAGGCTGGATTTTTGGTACTACTTTAGATTCGAAGACCCAGTCCCTACTTATTGTTAATAACGCTACTAATGTTGTTATTAAAGTCTGTGAATTTCAATTTTGTAATGATCCATTTTTGGGTGTTTATTACCACAAAAACAACAAAAGTTGGATGGAAAGTGAGTTCAGAGTTTATTCTAGTGCGAATAATTGCACTTTTGAATATGTCTCTCAGCCTTTTCTTATGGACCTTGAAGGAAAACAGGGTAATTTCAAAAATCTTAGGGAATTTGTGTTTAAGAATATTGATGGTTATTTCAAAATATATTCTAAGCACACGCCTATTAATTTAGTGCGTGATCTCCCTCAGGGTTTTTCGGCTTTAGAACCATTGGTAGATTTGCCAATAGGTATTAACATCACTAGGTTTCAAACTTTACTTGCTTTACATAGAAGTTATTTGACTCCTGGTGATTCTTCTTCAGGTTGGACAGCT'
  );
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>([
    'EcoRI',
    'BamHI',
    'HindIII',
  ]);
  const [customMotifPattern, setCustomMotifPattern] = useState<string>('NGG');
  const [motifReport, setMotifReport] = useState<MotifSearchReport | null>(null);
  const [isMotifLoading, setIsMotifLoading] = useState<boolean>(false);


  const handleRunQc = async () => {
    if (!qcFilePath) {
      setQcError('Please select a FASTQ file for QC inspection.');
      return;
    }
    setQcError('');
    setIsQcLoading(true);
    try {
      const report = await generateFastqQcReport(qcFilePath);
      setQcReport(report);
    } catch (e: unknown) {
      setQcError(e instanceof Error ? e.message : String(e));
    } fontFinally: {
      setIsQcLoading(false);
    }
  };

  const handleRunMotifSearch = async () => {
    if (!sequenceInput.trim()) return;
    setIsMotifLoading(true);
    try {
      const report = await scanSequenceForMotifs(
        sequenceInput,
        selectedEnzymes,
        customMotifPattern
      );
      setMotifReport(report);
    } catch {
      // Handled
    } finally {
      setIsMotifLoading(false);
    }
  };

  const handleToggleEnzyme = (name: string) => {
    setSelectedEnzymes((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  };

  const handleExportLabReport = () => {
    const reportData = {
      toolkit_version: 'BioFile Toolkit V1.0.0',
      timestamp: new Date().toISOString(),
      qc_report: qcReport,
      motif_report: motifReport,
    };

    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioFile_Lab_Notebook_Report_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Search className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Inspection & QC Studio</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time FastQC sequencing quality metrics, restriction enzyme cut maps, and CRISPR PAM search.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportLabReport}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Lab Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('qc')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'qc'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>FastQC Quality Control</span>
        </button>

        <button
          onClick={() => setActiveSubTab('motifs')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'motifs'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/40'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>CRISPR & Restriction Enzymes</span>
        </button>
      </div>

      {/* SUB-TAB 1: FASTQC QUALITY CONTROL */}
      {activeSubTab === 'qc' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
              Select FASTQ File for Quality Inspection
            </label>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <FileUploader
                  compact
                  accept=".fastq,.fq,.gz"
                  currentValue={qcFilePath}
                  onClear={() => setQcFilePath('')}
                  label="Select FASTQ File"
                  onFileSelected={(files) => {
                    if (files.length > 0) {
                      setQcFilePath(files[0].path);
                    }
                  }}
                />
              </div>
              <button
                disabled={isQcLoading}
                onClick={handleRunQc}
                className="flex items-center space-x-2 px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm shrink-0"
              >
                {isQcLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                <span>{isQcLoading ? 'Analyzing Quality...' : 'Run Sequencing QC Report'}</span>
              </button>
            </div>


            {qcError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{qcError}</span>
              </div>
            )}
          </div>

          {qcReport && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{qcReport.file_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Total Reads: {qcReport.total_reads.toLocaleString()} • Total Bases: {qcReport.total_bases.toLocaleString()}</p>
                </div>

                <div className={`px-4 py-2 rounded-xl font-extrabold text-sm flex items-center space-x-2 ${
                  qcReport.overall_status === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : qcReport.overall_status === 'WARN'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{qcReport.overall_status}</span>
                </div>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold">Q30 Bases (&ge;99.9% acc)</div>
                  <div className="text-2xl font-black text-emerald-600">{qcReport.q30_bases_pct.toFixed(2)}%</div>
                </div>

                <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl">
                  <div className="text-xs text-sky-800 dark:text-sky-400 font-semibold">Q20 Bases (&ge;99% acc)</div>
                  <div className="text-2xl font-black text-sky-600">{qcReport.q20_bases_pct.toFixed(2)}%</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">Mean Phred Score</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{qcReport.mean_phred_score.toFixed(1)}</div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500 font-semibold">GC Content</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{qcReport.gc_content_pct.toFixed(1)}%</div>
                </div>
              </div>

              {/* Per-Base Quality Score Decay Graph */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                  Per-Base Phred Quality Score Across Read Positions
                </h5>
                <div className="h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-end justify-between space-x-1">
                  {qcReport.per_base_quality_scores.map((score, idx) => {
                    const normHeight = Math.min(100, Math.max(10, (score / 40.0) * 100));
                    const isGood = score >= 30;
                    return (
                      <div
                        key={idx}
                        title={`Position ${idx + 1}: Phred Q${score.toFixed(1)}`}
                        className={`flex-1 rounded-t transition-all ${
                          isGood ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400'
                        }`}
                        style={{ height: `${normHeight}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Cycle 1 (5' End)</span>
                  <span>Phred Q30 Cutoff Threshold</span>
                  <span>Cycle {qcReport.per_base_quality_scores.length} (3' End)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: RESTRICTION ENZYMES & CRISPR PAM FINDER */}
      {activeSubTab === 'motifs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
              <Scissors className="w-5 h-5 text-purple-600" />
              <span>Restriction Enzyme Cut Map & CRISPR PAM Finder</span>
            </h3>

            {/* Sequence Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target DNA Sequence</label>
              <textarea
                value={sequenceInput}
                onChange={(e) => setSequenceInput(e.target.value)}
                placeholder="Paste DNA sequence to scan..."
                className="w-full h-32 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Enzyme Selector Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Restriction Enzymes</label>
              <div className="flex flex-wrap gap-2">
                {['EcoRI', 'BamHI', 'HindIII', 'NotI', 'XhoI', 'TaqI', 'BglII', 'PstI', 'SmaI'].map((name) => (
                  <button
                    key={name}
                    onClick={() => handleToggleEnzyme(name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedEnzymes.includes(name)
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom CRISPR PAM */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Motif / CRISPR PAM Pattern</label>
                <input
                  type="text"
                  value={customMotifPattern}
                  onChange={(e) => setCustomMotifPattern(e.target.value)}
                  placeholder="e.g. NGG for SpCas9, NNGRRT for SaCas9"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <button
                disabled={isMotifLoading}
                onClick={handleRunMotifSearch}
                className="self-end flex items-center space-x-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                {isMotifLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                <span>{isMotifLoading ? 'Scanning Motifs...' : 'Scan Cut Map & PAMs'}</span>
              </button>
            </div>
          </div>

          {/* Motif Search Report */}
          {motifReport && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Motif Scan Complete</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {motifReport.total_matches} cut sites / PAMs found in {motifReport.query_length} bp
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-sans font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Motif / Enzyme</th>
                      <th className="p-2.5">Pattern</th>
                      <th className="p-2.5">Position</th>
                      <th className="p-2.5">Strand</th>
                      <th className="p-2.5">Matched Sequence</th>
                      <th className="p-2.5">Cut Site</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {motifReport.matches.map((m, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
                        <td className="p-2.5 font-bold text-purple-600 font-sans">{m.motif_name}</td>
                        <td className="p-2.5 font-bold">{m.pattern}</td>
                        <td className="p-2.5">{m.start_pos}..{m.end_pos}</td>
                        <td className="p-2.5 font-bold">{m.strand}</td>
                        <td className="p-2.5 text-emerald-600 font-bold">{m.matched_sequence}</td>
                        <td className="p-2.5 text-slate-500">{m.cut_site_pos ? `Position ${m.cut_site_pos}` : 'N/A'}</td>
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
  );
};
