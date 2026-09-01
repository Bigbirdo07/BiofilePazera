import { useState } from 'react';
import { PageView } from './types/bio';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home';
import { SequenceTools } from './pages/SequenceTools';
import { FileTools } from './pages/FileTools';
import { Inspect } from './pages/Inspect';
import { ProteinStudio } from './pages/ProteinStudio';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

export function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSequence, setActiveSequence] = useState('');

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleLoadPastedSequence = (seq: string) => {
    setActiveSequence(seq);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 pb-12">
        {currentView === 'home' && (
          <Home onNavigate={setCurrentView} onLoadPastedSequence={handleLoadPastedSequence} />
        )}
        {currentView === 'sequence_tools' && (
          <SequenceTools initialSequence={activeSequence} />
        )}
        {currentView === 'file_tools' && <FileTools onNavigate={setCurrentView} />}
        {currentView === 'inspect' && <Inspect />}
        {currentView === 'protein_studio' && <ProteinStudio onNavigate={setCurrentView} />}

        {currentView === 'history' && <History />}
        {currentView === 'settings' && (
          <Settings isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
        )}
      </main>
    </div>
  );
}

export default App;
