import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { sanitizeFeedbackText } from '../utils/sanitizer';

interface RcFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RcFeedbackModal: React.FC<RcFeedbackModalProps> = ({ isOpen, onClose }) => {
  const [role, setRole] = useState('molecular_biologist');
  const [taskTested, setTaskTested] = useState('');
  const [difficulty, setDifficulty] = useState('3');
  const [confidence, setConfidence] = useState('Yes');
  const [feedbackText, setFeedbackText] = useState('');
  const [sanitizeData, setSanitizeData] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateFeedbackMarkdown = () => {
    const rawFeedback = feedbackText || 'No additional comments provided.';
    const finalFeedback = sanitizeData ? sanitizeFeedbackText(rawFeedback) : rawFeedback;
    const finalTask = sanitizeData ? sanitizeFeedbackText(taskTested || 'General Exploration') : (taskTested || 'General Exploration');

    return `# BioFile Toolkit V1 — RC Feedback Submission

## Tester Background
- **Role**: ${role}
- **BioFile Toolkit Version**: 1.0.0-rc.1
- **OS**: macOS Darwin (arm64)
- **Local Privacy Mode**: Active (No automated sequence telemetry)

## Workflow Tested
- **Task / Workflow**: ${finalTask}
- **Difficulty Rating (1-5)**: ${difficulty}
- **Scientific Confidence**: ${confidence}

## User Observations & Feedback
${finalFeedback}

## Sanitize Log Data Flag
- **Sequence & Path Sanitization**: ${sanitizeData ? 'ENABLED (Biological sequence data excluded)' : 'DISABLED'}

---
*Generated via BioFile Toolkit Help & RC Feedback Module*
`;
  };


  const handleCopy = () => {
    navigator.clipboard.writeText(generateFeedbackMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = generateFeedbackMarkdown();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rc-feedback-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-xl w-full p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="bg-sky-100 dark:bg-sky-950 p-2 rounded-lg text-sky-600 dark:text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Help & RC Feedback
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                BioFile Toolkit 1.0.0-rc.1 — Tester Feedback Tool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-emerald-800 dark:text-emerald-300">
              <strong>Local Privacy Guarantee:</strong> No automatic data transmission. Sequence contents, FASTA headers, and sensitive local file paths are strictly excluded.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tester Role / Background
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
              >
                <option value="molecular_biologist">Molecular Biologist</option>
                <option value="bioinformatician">Bioinformatician</option>
                <option value="biochemist">Biochemist</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="student">Graduate / Student</option>
                <option value="other">Other Scientist</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Scientific Output Trust
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
              >
                <option value="Yes">Yes — I trust the output</option>
                <option value="Unsure">Unsure — Requires verification</option>
                <option value="No">No — Output raised doubts</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workflow / Task Tested
            </label>
            <input
              type="text"
              placeholder="e.g. Six-frame translation, FASTQ split, SHA-256 verify..."
              value={taskTested}
              onChange={(e) => setTaskTested(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workflow Ease / Difficulty (1 = Very Easy, 5 = Confusing/Blocked)
            </label>
            <div className="flex items-center space-x-3">
              {['1', '2', '3', '4', '5'].map((num) => (
                <label key={num} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="difficulty"
                    value={num}
                    checked={difficulty === num}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="accent-sky-600"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{num}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Feedback, Confusing Terms, or Observations
            </label>
            <textarea
              rows={3}
              placeholder="Describe any friction, terminology issues, or suggestions..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="sanitizeCheck"
              checked={sanitizeData}
              onChange={(e) => setSanitizeData(e.target.checked)}
              className="rounded-xs border-slate-300 text-sky-600 accent-sky-600"
            />
            <label htmlFor="sanitizeCheck" className="text-slate-600 dark:text-slate-400 font-medium">
              Sanitize diagnostic log data (strip sequence strings & private paths)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Saves report to local Markdown file</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Feedback (.md)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
