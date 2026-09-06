import { useEffect, useState } from 'react';
import { PageView } from './types/bio';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home';
import { SequenceTools } from './pages/SequenceTools';
import { ProteinStudio } from './pages/ProteinStudio';
import { About } from './pages/About';
import { HowBioFileWorks } from './pages/HowBioFileWorks';

const routeByView: Record<PageView, string> = {
  home: '/',
  sequence_tools: '/sequence-tools',
  protein_studio: '/protein-studio',
  how_biofile_works: '/how-pazatlas-works',
  about: '/about',
};

const viewByPath: Record<string, PageView> = Object.fromEntries(
  Object.entries(routeByView).map(([view, path]) => [path, view as PageView]),
);

const legacyRouteRedirects: Record<string, string> = {
  '/how-biofile-works': '/how-pazatlas-works',
};

const viewFromLocation = (): PageView | 'not_found' => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return viewByPath[path] || (legacyRouteRedirects[path] ? 'how_biofile_works' : 'not_found');
};

const pageTitles: Record<PageView, string> = {
  home: 'PazAtlas — Research Beta',
  sequence_tools: 'Sequence Tools | PazAtlas',
  protein_studio: 'Protein Studio | PazAtlas',
  how_biofile_works: 'How PazAtlas Works | PazAtlas',
  about: 'About | PazAtlas',
};

export function App() {
  const [currentView, setCurrentView] = useState<PageView | 'not_found'>(viewFromLocation);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem('biofile-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [activeSequence, setActiveSequence] = useState('');

  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const replacement = legacyRouteRedirects[path];
    if (replacement) window.history.replaceState({}, '', `${replacement}${window.location.hash}`);
    const handlePopState = () => setCurrentView(viewFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.title = currentView === 'not_found' ? 'Page Not Found | PazAtlas' : pageTitles[currentView];
  }, [currentView]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      window.localStorage.setItem('biofile-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Theme still applies for the current session when storage is unavailable.
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => setIsDarkMode((prev) => !prev);

  const handleNavigate = (view: PageView) => {
    const path = routeByView[view] || '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setCurrentView(view);
  };

  const handleLoadPastedSequence = (seq: string) => {
    setActiveSequence(seq);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar
        currentView={currentView === 'not_found' ? 'home' : currentView}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 pb-12">
        {currentView === 'home' && (
          <Home onNavigate={handleNavigate} onLoadPastedSequence={handleLoadPastedSequence} />
        )}
        {currentView === 'sequence_tools' && (
          <SequenceTools initialSequence={activeSequence} />
        )}
        {currentView === 'protein_studio' && <ProteinStudio onNavigate={handleNavigate} />}

        {currentView === 'how_biofile_works' && <HowBioFileWorks onNavigate={handleNavigate} />}

        {currentView === 'about' && <About onNavigate={handleNavigate} />}

        {currentView === 'not_found' && <NotFound onNavigate={handleNavigate} />}
      </main>
      <footer className="border-t border-slate-200 bg-white px-5 py-5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>Research Beta · For research and educational use. PazAtlas does not provide medical, diagnostic, or clinical decision-making advice.</p>
            <p className="mt-1">No account or hosted user database is currently required. Online lookups send requested identifiers directly from your browser to external scientific services.</p>
          </div>
          <p className="shrink-0">Data sources: <a className="text-sky-700 hover:underline dark:text-sky-300" href="https://www.uniprot.org/" target="_blank" rel="noreferrer">UniProt</a> · <a className="text-sky-700 hover:underline dark:text-sky-300" href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">AlphaFold DB</a> · <a className="text-sky-700 hover:underline dark:text-sky-300" href="https://www.rcsb.org/" target="_blank" rel="noreferrer">RCSB PDB</a> · <a className="text-sky-700 hover:underline dark:text-sky-300" href="https://www.ebi.ac.uk/pdbe/docs/sifts/" target="_blank" rel="noreferrer">SIFTS</a></p>
        </div>
      </footer>
    </div>
  );
}

const NotFound = ({ onNavigate }: { onNavigate: (view: PageView) => void }) => (
  <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
    <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-sky-700 dark:text-sky-300">PAZATLAS</p>
    <h2 className="mt-4 text-3xl font-semibold tracking-tight">Page not found</h2>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">The requested PazAtlas page does not exist.</p>
    <button onClick={() => onNavigate('home')} className="mt-7 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500">Return Home</button>
  </section>
);

export default App;
