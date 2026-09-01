import React from 'react';
import { History as HistoryIcon, Clock, CheckCircle2, Trash2 } from 'lucide-react';

export const History: React.FC = () => {
  const sampleHistory = [
    {
      time: 'Just now',
      op: 'Reverse Complement',
      input: 'sample_primers.fasta',
      output: 'sample_primers_reverse_complement.fasta',
      status: 'Completed',
    },
    {
      time: '12:42 PM',
      op: 'Split FASTQ File',
      input: 'sequencing_run_R1.fastq.gz',
      output: '14 parts created',
      status: 'Completed',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <HistoryIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Local Processing History</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log of operations executed locally. Sequence contents are never stored in history.
          </p>
        </div>

        <button className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg transition-colors cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Operation</th>
              <th className="p-3">Input</th>
              <th className="p-3">Output Result</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sampleHistory.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 flex items-center space-x-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.time}</span>
                </td>
                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{item.op}</td>
                <td className="p-3 font-mono">{item.input}</td>
                <td className="p-3 font-mono">{item.output}</td>
                <td className="p-3">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium rounded-full text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
