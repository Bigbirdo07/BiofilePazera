import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Dna, Info, Upload } from 'lucide-react';
import { PageView } from '../types/bio';
import { Pdb3DViewer } from '../components/common/Pdb3DViewer';

interface HomeProps {
  onNavigate: (view: PageView) => void;
  onLoadPastedSequence: (seq: string) => void;
}

const tools: Array<{ title: string; description: string; view: PageView; icon: React.ReactNode }> = [
  { title: 'Protein Studio', description: 'Sequence → structure → evidence', view: 'protein_studio', icon: <Activity className="h-5 w-5" /> },
  { title: 'Sequence Tools', description: 'DNA, RNA, and protein sequence operations', view: 'sequence_tools', icon: <Dna className="h-5 w-5" /> },
  { title: 'How PazAtlas Works', description: 'Understand sequences, structures, evidence, and residue context', view: 'how_biofile_works', icon: <BookOpen className="h-5 w-5" /> },
  { title: 'About', description: 'Meet the researcher and builder behind PazAtlas', view: 'about', icon: <Info className="h-5 w-5" /> },
];

const flow = ['FASTA', 'Sequence identity', 'Structure', 'Experimental evidence', 'Residue context'];
const demoPath = '/demo-structures/P00533_EGFR_AlphaFold.pdb';

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [previewMode, setPreviewMode] = useState<'ribbon' | 'trace' | 'spheres'>('ribbon');
  const [previewColor, setPreviewColor] = useState<'plddt' | 'chain' | 'spectrum'>('plddt');
  const [demoPdb, setDemoPdb] = useState('');
  const [demoError, setDemoError] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    updateMotion();
    query.addEventListener('change', updateMotion);
    const controller = new AbortController();
    void fetch(demoPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Demo model returned HTTP ${response.status}`);
        return response.text();
      })
      .then(setDemoPdb)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setDemoError(true);
      });
    const previousOverflow = document.body.style.overflowX;
    document.body.style.overflowX = 'hidden';
    return () => {
      controller.abort();
      query.removeEventListener('change', updateMotion);
      document.body.style.overflowX = previousOverflow;
    };
  }, []);

  const modeLabel = previewMode === 'ribbon' ? 'Cartoon' : previewMode === 'trace' ? 'Backbone' : 'Cα Trace';

  return (
    <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main>
        <section className="border-b border-slate-200 bg-[#f4f8fc] dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:py-12">
            <div className="max-w-xl">
              <div className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-sky-700 dark:text-sky-300">PAZATLAS</div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">From sequence to structure, with the biological context in between.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">PazAtlas connects your exact protein sequence to UniProt, AlphaFold, experimental PDB structures, and residue-level evidence.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button onClick={() => onNavigate('protein_studio')} className="inline-flex min-h-11 items-center gap-2 bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"><Upload className="h-4 w-4" /> Open Protein Studio</button>
                <a href="#tools" className="inline-flex min-h-11 items-center gap-2 px-1 py-3 text-sm font-semibold text-sky-700 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-sky-300">Explore tools <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
            <div className="min-w-0">
              <div className="overflow-hidden border border-slate-700 bg-[#080b10] shadow-sm [&>div]:!h-[360px] [&>div]:!min-h-0 [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!shadow-none sm:[&>div]:!h-[430px]">
                {demoPdb ? <Pdb3DViewer pdbText={demoPdb} filename="AF-P00533-F1-model_v4.pdb" isAlphaFoldModel colorModeOverride={previewColor} renderModeOverride={previewMode} autoRotateOverride={!reducedMotion} showControls={false} showCameraControls backgroundColor="#080b10" /> : <div className="flex h-[360px] items-center justify-center bg-[#080b10] font-mono text-xs text-slate-400 sm:h-[430px]">{demoError ? 'EGFR preview is not available locally.' : 'Loading EGFR preview…'}</div>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-x border-b border-slate-700 bg-[#11161d] px-3 py-2">
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Protein representation">
                  <button onClick={() => setPreviewMode('ribbon')} className={`px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewMode === 'ribbon' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>Cartoon</button>
                  <button onClick={() => setPreviewMode('trace')} className={`px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewMode === 'trace' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>Backbone</button>
                  <button onClick={() => setPreviewMode('spheres')} className={`px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewMode === 'spheres' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>Cα Trace</button>
                </div>
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Protein color">
                  <button onClick={() => setPreviewColor('plddt')} className={`px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewColor === 'plddt' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>pLDDT</button>
                  <button onClick={() => setPreviewColor('chain')} className={`px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewColor === 'chain' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>Chain</button>
                  <button onClick={() => setPreviewColor('spectrum')} className={`px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${previewColor === 'spectrum' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-900'}`}>Spectrum</button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-1 pt-2"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">EGFR · P00533</p><p className="font-mono text-[10px] uppercase tracking-[.1em] text-slate-500">Representation: {modeLabel}</p></div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">AlphaFold DB canonical reference model · local homepage copy</p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8"><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Understand what your structure actually represents.</h2><p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">PazAtlas checks whether your uploaded sequence matches the UniProt canonical sequence, a documented isoform, or a differing variant before structural interpretation. That relationship stays clear across models, evidence, and residue numbering.</p><div className="mt-10 flex flex-col items-stretch justify-center gap-3 text-left sm:flex-row sm:items-center sm:gap-0 sm:text-center">{flow.map((item, index) => <React.Fragment key={item}><div className="border border-slate-200 bg-white px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">{item}</div>{index < flow.length - 1 && <span className="hidden px-2 text-sky-600 sm:block" aria-hidden="true">→</span>}</React.Fragment>)}</div></section>
        <section id="tools" className="scroll-mt-6 border-y border-slate-200 bg-[#fbfcfe] px-5 py-14 dark:border-slate-800 dark:bg-slate-950 sm:px-8"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-semibold tracking-tight">Explore PazAtlas</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{tools.map((tool) => <button key={tool.title} onClick={() => onNavigate(tool.view)} className="group flex min-h-28 items-center gap-4 border border-slate-200 bg-white p-5 text-left transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900"><span className="text-sky-700 dark:text-sky-300">{tool.icon}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{tool.title}</span><span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">{tool.description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-700" /></button>)}</div></div></section>
        <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><div className="border-y border-slate-200 py-5 text-center font-mono text-[11px] uppercase tracking-[.12em] leading-7 text-slate-500 dark:border-slate-800">Exact sequence comparison <span className="mx-2 text-sky-600">•</span> Isoform awareness <span className="mx-2 text-sky-600">•</span> AlphaFold reference <span className="mx-2 text-sky-600">•</span> PDB evidence <span className="mx-2 text-sky-600">•</span> Residue mapping</div><p className="mt-6 text-center text-xs text-slate-500">Local-first sequence and file analysis. Online biological databases are contacted only when requested.</p></section>
      </main>
    </div>
  );
};
