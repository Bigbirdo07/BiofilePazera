import React from 'react';
import { Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

interface SettingsProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          <span>Application Settings</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure local preferences, file safety rules, and interface options.
        </p>
      </div>

      {/* Privacy Guarantee Box */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-start space-x-3 text-emerald-900 dark:text-emerald-200">
        <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm">Local Privacy Statement</h4>
          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            BioFile Toolkit processes files locally on your computer. Version 1 does not upload your sequence data to BioFile Toolkit servers or any external cloud services.
          </p>
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            File Output Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300">Default Compression</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200">
                <option value="same">Same as Input (Default)</option>
                <option value="gzip">Always gzip (.gz)</option>
                <option value="uncompressed">Always uncompressed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300">Default Output Casing</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200">
                <option value="uppercase">UPPERCASE (Default)</option>
                <option value="lowercase">lowercase</option>
                <option value="preserve">Preserve Original Input</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            File Safety & Cleanup
          </h3>

          <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded text-sky-600 focus:ring-sky-500" />
            <span>Delete partial output files automatically if job is cancelled</span>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            Interface Theme
          </h3>

          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleTheme}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Toggle Theme (Currently {isDarkMode ? 'Dark' : 'Light'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
