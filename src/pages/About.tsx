import React, { useState } from 'react';
import { ArrowRight, Mail, Microscope, GraduationCap, BookOpen, Sparkles, Building2, Terminal, ExternalLink } from 'lucide-react';
import { PageView } from '../types/bio';

interface AboutProps {
  onNavigate: (view: PageView) => void;
}

const researchAreas = [
  {
    title: 'Single-Cell & Disease Modeling',
    copy: 'Applied computational and machine-learning approaches to large-scale single-cell datasets to investigate disease states, biological signals, and potential biomarkers.',
  },
  {
    title: 'Biomarker Discovery & ML',
    copy: 'Built statistical and machine-learning workflows for classification, feature selection, model validation, and interpretation of high-dimensional biomedical data.',
  },
  {
    title: 'Bioinformatics & Imaging',
    copy: 'Worked across sequencing analysis, biological imaging, phylogenetics, microbiome research, and experimental biological datasets.',
  },
  {
    title: 'Scientific Software & Data Tools',
    copy: 'Develop scientific software and computational workflows that make complex biological information easier to analyze, visualize, and interpret.',
  },
];

const technicalAreas = [
  'Computational Biology',
  'Bioinformatics',
  'Single-Cell RNA-seq',
  'Machine Learning',
  'Python',
  'R',
  'SQL',
  'Scientific Computing',
  'Data Visualization',
  'Structural Biology Tools',
];

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  const [hasHeadshot, setHasHeadshot] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 space-y-8">
        
        {/* ========================================== */}
        {/* 1. ABOUT HEADER & BIO                      */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
            ABOUT
          </div>

          {/* Side-by-side profile row */}
          <div className="mt-6 flex flex-col sm:flex-row items-start gap-6 sm:gap-8 min-w-0">
            {/* Fixed-size Headshot Container: STRICT 135px x 165px */}
            <div
              style={{
                width: '135px',
                height: '165px',
                minWidth: '135px',
                maxWidth: '135px',
                minHeight: '165px',
                maxHeight: '165px',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: '12px',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                backgroundColor: '#f1f5f9',
              }}
              className="relative shadow-inner dark:border-slate-800 dark:bg-slate-800"
            >
              {hasHeadshot ? (
                <img
                  src="/about/alberto-headshot.jpg"
                  alt="Alberto Alejandro Paz"
                  style={{
                    width: '135px',
                    height: '165px',
                    minWidth: '135px',
                    maxWidth: '135px',
                    minHeight: '165px',
                    maxHeight: '165px',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                  onError={() => setHasHeadshot(false)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                  <Microscope className="h-8 w-8 text-sky-600 dark:text-sky-400" />
                  <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Headshot
                  </p>
                </div>
              )}
            </div>

            {/* Header Text Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-50">
                Alberto Alejandro Paz
              </h1>
              <p className="mt-1.5 text-base sm:text-lg font-semibold text-sky-700 dark:text-sky-400">
                Founder, Pazera · Creator of PazAtlas
              </p>
              <p className="mt-3 text-base sm:text-lg font-medium text-slate-700 dark:text-slate-300 leading-snug">
                Computational biology researcher and scientific software builder.
              </p>
            </div>
          </div>

          {/* Narrative Bio Copy */}
          <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 text-base leading-relaxed">
            <p>
              I’m Alberto Alejandro Paz, a computational biology researcher and scientific software builder with a background in cell and molecular biology, bioinformatics, machine learning, and biomedical data analysis.
            </p>
            <p>
              My research has included single-cell transcriptomics, disease modeling, biomarker discovery, biological imaging, microbiome analysis, and computational tool development.
            </p>
          </div>
        </section>

        {/* ========================================== */}
        {/* 2. RESEARCH BACKGROUND                     */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
            RESEARCH BACKGROUND
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {researchAreas.map((area) => (
              <div
                key={area.title}
                className="group relative rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/40 hover:border-sky-500/60 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-sky-500 group-hover:scale-125 transition-transform duration-200" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {area.title}
                  </h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400 pl-4 border-l-2 border-slate-200 dark:border-slate-800 group-hover:border-sky-500 transition-colors duration-200">
                  {area.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================== */}
        {/* 3. PAZERATECH                              */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            PAZERA
          </div>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300 max-w-4xl">
            I founded Pazera to build practical technology for the life sciences, combining biology, chemistry, data science, and software to turn scientific problems and technical ideas into functional tools and prototypes.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            Research ideas → engineered tools → usable scientific technology
          </div>
        </section>

        {/* ========================================== */}
            {/* 4. PAZATLAS                                 */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            <Terminal className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            PAZATLAS
          </div>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300 max-w-4xl">
            PazAtlas is one example of the Pazera approach: connecting biological sequences, structural information, experimental evidence, and scientific interpretation in one environment.
          </p>

          <button
            onClick={() => onNavigate('protein_studio')}
            className="mt-6 group inline-flex items-center gap-2.5 rounded-xl border border-sky-600 bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-200 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Explore Protein Studio
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </section>

        {/* ========================================== */}
        {/* 5. EDUCATION & PUBLICATIONS                */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-6">
            <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            EDUCATION / PUBLICATIONS
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Education Block (NO GPA, NO cum laude) */}
            <div className="space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Education
              </h3>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/40">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  University of Rhode Island
                </h4>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  <p className="flex justify-between items-center border-b border-slate-200/60 pb-2 dark:border-slate-800/60">
                    <span>M.S. Cell and Molecular Biology</span>
                    <span className="font-mono text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded dark:bg-sky-900/60 dark:text-sky-300">2026</span>
                  </p>
                  <p className="flex justify-between items-center pt-1">
                    <span>B.S. Microbiology</span>
                    <span className="font-mono text-xs bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-slate-300">2024</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Research & Publications Block */}
            <div className="space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Research & Publications
              </h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Morphological responses of a temperate intertidal foraminifer, Haynesina sp., to coastal acidification.
                  </p>
                  <p className="mt-1 font-mono text-xs text-sky-600 dark:text-sky-400">
                    Frontiers in Microbiology, 2025.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Machine Learning Approaches to Biomarker Discovery in Hemic Neoplasia of Mercenaria mercenaria.
                  </p>
                  <p className="mt-1 font-mono text-xs text-sky-600 dark:text-sky-400">
                    University of Rhode Island Graduate Conference, 2026.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* 6. TECHNICAL AREAS                         */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-5">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
            TECHNICAL AREAS
          </div>

          <div className="flex flex-wrap gap-2.5">
            {technicalAreas.map((area) => (
              <span
                key={area}
                className="font-mono text-xs font-medium px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 hover:border-sky-500/70 hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-200"
              >
                {area}
              </span>
            ))}
          </div>
        </section>

        {/* ========================================== */}
        {/* 7. WORK WITH ME                            */}
        {/* ========================================== */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-6">
            <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            WORK WITH ME
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Employment & Research */}
            <a
              href="mailto:albertoalejandropaz@gmail.com"
              className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800/80 dark:bg-slate-900/40 hover:border-sky-500/80 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Employment & Research Opportunities
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </div>
              <span className="mt-3 block font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 break-all">
                albertoalejandropaz@gmail.com
              </span>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                For employment opportunities, research positions, scientific collaborations, and professional inquiries.
              </p>
            </a>

            {/* Pazera Projects */}
            <a
              href="mailto:pazeratechnology@gmail.com"
              className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800/80 dark:bg-slate-900/40 hover:border-sky-500/80 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Pazera Projects, Collaborations & Quotes
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              </div>
              <span className="mt-3 block font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 break-all">
                pazeratechnology@gmail.com
              </span>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                For life-science, biology, chemistry, data, software, prototype development, collaboration, and quote requests.
              </p>
            </a>
          </div>
        </section>

      </main>
    </div>
  );
};
