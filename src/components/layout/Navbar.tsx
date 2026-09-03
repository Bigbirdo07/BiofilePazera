import React, { useState } from 'react';
import { PageView } from '../../types/bio';
import {
  Dna,
  Home,
  FileCode2,
  Search,
  History as HistoryIcon,
  Settings,
  ShieldCheck,
  Moon,
  Sun,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { RcFeedbackModal } from '../RcFeedbackModal';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isDarkMode,
  onToggleTheme,
}) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const navItems: { view: PageView; label: string; icon: React.ReactNode }[] = [
    { view: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { view: 'sequence_tools', label: 'Sequence Tools', icon: <Dna className="w-4 h-4" /> },
    { view: 'protein_studio', label: 'Protein Studio', icon: <Activity className="w-4 h-4 text-emerald-500" /> },
    { view: 'file_tools', label: 'File Tools', icon: <FileCode2 className="w-4 h-4" /> },
    { view: 'inspect', label: 'Inspect', icon: <Search className="w-4 h-4" /> },
    { view: 'history', label: 'History', icon: <HistoryIcon className="w-4 h-4" /> },
    { view: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
      {/* Privacy Notice Banner */}
      <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local processing — sequence files remain on your computer.</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">v1.0.0-rc.2 (Local & Offline Mode)</span>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="bg-sky-600 text-white p-2 rounded-lg shadow-sm">
            <Dna className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-none">
              BIOFILE TOOLKIT
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Sequence & Genomic File Utilities
            </p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
            title="Open RC Tester Feedback Exporter"
          >
            <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Help & Feedback</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <RcFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </header>
  );
};
