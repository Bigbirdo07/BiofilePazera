import React, { useState, useEffect } from 'react';
import { PageView, SequenceType } from '../types/bio';
import { detectSequenceType } from '../services/biofileApi';
import { FileUploader } from '../components/common/FileUploader';
import {
  FileText,
  Dna,
  Scissors,
  ArrowRight,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (view: PageView) => void;
  onLoadPastedSequence: (seq: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onLoadPastedSequence }) => {
  const [pastedSeq, setPastedSeq] = useState('');
  const [detectedType, setDetectedType] = useState<SequenceType>('Unknown');

  useEffect(() => {
    if (!pastedSeq.trim()) {
      setDetectedType('Unknown');
      return;
    }
    detectSequenceType(pastedSeq).then(setDetectedType);
  }, [pastedSeq]);

  const handleSequenceSubmit = (targetView: PageView = 'sequence_tools') => {
    if (!pastedSeq.trim()) return;
    onLoadPastedSequence(pastedSeq);
    onNavigate(targetView);
  };


  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          BIOFILE TOOLKIT
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto">
          Local-first sequence manipulation and streaming genomic file utilities for scientists.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <FileUploader
        label="Upload or Drop FASTA, FASTQ, or PDB file here"
        description="Supports .fasta, .fastq, .gz, .pdb, .cif files — Click to browse your computer or drag & drop"
        onFileSelected={(files) => {
          if (files.length > 0) {
            const first = files[0];
            if (first.content) {
              onLoadPastedSequence(first.content);
              onNavigate('sequence_tools');
            } else if (first.name.endsWith('.pdb') || first.name.endsWith('.cif')) {
              onNavigate('protein_studio');
            } else if (first.name.includes('fastq') || first.name.includes('fq')) {
              onNavigate('inspect');
            } else {
              onNavigate('file_tools');
            }
          }
        }}
      />


      {/* Paste Sequence Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              Or paste a sequence
            </h3>
          </div>
          {pastedSeq.trim() && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                detectedType === 'DNA'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : detectedType === 'RNA'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  : detectedType === 'Protein'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Detected: {detectedType}
            </span>
          )}
        </div>

        <textarea
          value={pastedSeq}
          onChange={(e) => setPastedSeq(e.target.value)}
          placeholder="Paste raw sequence or FASTA format here (e.g. >seq1\nATGCCGTA...)"
          className="w-full h-32 p-3 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-200"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            Length: {pastedSeq.replace(/\s+/g, '').replace(/>.*/g, '').length} bases
          </span>
          <button
            disabled={!pastedSeq.trim()}
            onClick={() => handleSequenceSubmit('sequence_tools')}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span>Open in Sequence Tools</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Tools & File Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Tools */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Dna className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Sequence Tools</h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleSequenceSubmit('sequence_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                Reverse Complement
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Complement DNA/RNA</div>
            </button>

            <button
              onClick={() => handleSequenceSubmit('sequence_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                Translate
              </div>
              <div className="text-xs text-slate-500 mt-0.5">6-frame translation</div>
            </button>

            <button
              onClick={() => handleSequenceSubmit('sequence_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                Sequence Statistics
              </div>
              <div className="text-xs text-slate-500 mt-0.5">GC% & base counts</div>
            </button>

            <button
              onClick={() => handleSequenceSubmit('sequence_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                DNA ↔ RNA
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Transcription converter</div>
            </button>
          </div>
        </div>

        {/* File Tools */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Scissors className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Large File Tools</h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigate('file_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Split File
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Record-aware splitting</div>
            </button>

            <button
              onClick={() => onNavigate('file_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Validate File
              </div>
              <div className="text-xs text-slate-500 mt-0.5">FASTA / FASTQ check</div>
            </button>

            <button
              onClick={() => onNavigate('file_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Merge Files
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Combine FASTA/FASTQ</div>
            </button>

            <button
              onClick={() => onNavigate('file_tools')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                SHA-256 Verification
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Generate / verify hash</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
