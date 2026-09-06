import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PageView } from '../types/bio';

interface HowBioFileWorksProps {
  onNavigate: (view: PageView) => void;
}

const flow = ['FASTA', 'Identity', 'Sequence relationship', 'Structure', 'Evidence', 'Residue context'];
const studioTabs = ['Structure', 'Confidence', 'Biology', 'Experimental Evidence', 'Mutation'];

const GuideSection: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 border-t border-slate-200 py-10 dark:border-slate-800">
    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    <div className="mt-5">{children}</div>
  </section>
);

const FlowDiagram: React.FC = () => (
  <div className="mt-6 flex flex-col gap-2 text-center text-xs font-semibold sm:flex-row sm:items-center sm:gap-0">
    {flow.map((item, index) => (
      <React.Fragment key={item}>
        <div className="flex-1 border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">{item}</div>
        {index < flow.length - 1 && <span className="py-1 text-sky-600 sm:px-2" aria-hidden="true">-&gt;</span>}
      </React.Fragment>
    ))}
  </div>
);

const StatusStrip: React.FC = () => (
  <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {[
      ['Current status', 'Research Beta'],
      ['Core workflows', 'Implemented & benchmarked'],
      ['Development', 'Active'],
      ['Intended use', 'Research exploration & interpretation'],
    ].map(([label, value]) => (
      <div key={label} className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-semibold">{value}</div>
      </div>
    ))}
  </div>
);

const GuideCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="font-semibold">{title}</div>
    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</p>
  </div>
);

export const HowBioFileWorks: React.FC<HowBioFileWorksProps> = ({ onNavigate }) => (
  <div className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <section id="overview" className="scroll-mt-24 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-sky-700 dark:text-sky-300">PAZATLAS GUIDE</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">How PazAtlas Works</h1>
          </div>
          <span className="border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">Research Beta</span>
        </div>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">PazAtlas helps connect the biological sequence you are actually working with to reference sequences, predicted structures, experimental structures, and residue-level evidence.</p>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">It keeps sequence identity, isoforms, variants, predicted structures, experimental data, and residue numbering clearly separated throughout the workflow.</p>
        <FlowDiagram />
      </section>

      <GuideSection id="research-beta" title="Research Beta">
        <div className="border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">PazAtlas is currently in Research Beta. Its core workflows are implemented, tested, and benchmarked across representative use cases, but the software remains under active development.</p>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">Results should be interpreted with appropriate scientific judgment, and critical findings should be confirmed using authoritative databases, experimental evidence, and established computational or laboratory methods where appropriate.</p>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">PazAtlas is being developed with the long-term goal of growing from a research software project into a broader scientific software platform.</p>
        </div>
        <StatusStrip />
      </GuideSection>

      <GuideSection id="sequence" title="Start with your sequence">
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <pre className="overflow-x-auto border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-100 dark:border-slate-700">{`>protein_example\nMALWMRLLPLLALLAL...`}</pre>
          <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>PazAtlas begins with the biological sequence you provide. Depending on the input, it can detect sequence type, calculate local properties, perform sequence transforms, and identify supported accession patterns.</p>
            <p>When a supported accession is present, PazAtlas can attempt to connect the sequence to authoritative reference databases. Unknown sequences can still be analyzed locally; they are not assigned an identity by guesswork.</p>
          <div className="border-l-2 border-emerald-500 pl-3 text-xs">Local analysis includes parsing, statistics, transformations, and protein property calculations. Online databases are not required simply to inspect a local sequence.</div>
          </div>
        </div>
      </GuideSection>

      <GuideSection id="identity" title="Connect to the biological reference">
        <div className="grid gap-3 sm:grid-cols-3">
          <GuideCard title="Uploaded FASTA">The sequence supplied by the scientist is the starting object.</GuideCard>
          <GuideCard title="Supported accession">RefSeq and other supported identifiers can provide an explicit database relationship.</GuideCard>
          <GuideCard title="UniProt">The reference record supplies canonical sequence and curated biological annotations.</GuideCard>
        </div>
        <p className="mt-5 border-l-2 border-amber-500 pl-3 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">A database relationship does not automatically mean that the uploaded sequence is identical to the UniProt canonical sequence.</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">The same protein identity can involve a canonical sequence, documented isoform, sequence variant, historical database version, truncation, or experimental construct.</p>
      </GuideSection>

      <GuideSection id="sequence-relationship" title="Determine what sequence you actually have">
        <div className="grid gap-3 md:grid-cols-3">
          <GuideCard title="EXACT CANONICAL MATCH"><strong>Uploaded sequence = UniProt canonical sequence.</strong><br />Direct canonical residue correspondence is available.</GuideCard>
          <GuideCard title="EXACT ISOFORM MATCH"><strong>Uploaded sequence = documented isoform.</strong><br />The canonical model may remain useful as a reference, but coordinates can require translation.</GuideCard>
          <GuideCard title="SEQUENCE VARIANT"><strong>Reference protein is known, but amino acids differ.</strong><br />The canonical structure is not the exact uploaded sequence.</GuideCard>
        </div>
        <p className="mt-4 text-xs text-slate-500">Other outcomes may be partial/differing sequence or unresolved relationship. In those cases PazAtlas keeps unsupported mappings unavailable.</p>
      </GuideSection>

      <GuideSection id="numbering" title="Keep residue numbering straight">
        <div className="grid gap-2 text-center text-xs font-semibold sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">Uploaded FASTA<br /><span className="font-mono text-sky-700 dark:text-sky-300">Residue 230</span></div><span className="text-sky-600" aria-hidden="true">-&gt; alignment -&gt;</span>
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">UniProt canonical<br /><span className="font-mono text-sky-700 dark:text-sky-300">Residue 254</span></div><span className="text-sky-600" aria-hidden="true">-&gt;</span>
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">PDB chain A<br /><span className="font-mono text-sky-700 dark:text-sky-300">Author residue 173</span></div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Numbering can differ across isoforms, deletions, insertions, experimental constructs, and deposited PDB structures. PazAtlas translates between coordinate systems only when a valid mapping exists. Otherwise it shows <strong>Not represented</strong> rather than guessing.</p>
        <p className="mt-4 border-l-2 border-sky-500 pl-3 text-sm font-semibold">Residue N in an uploaded isoform is not always residue N in the canonical reference.</p>
      </GuideSection>

      <GuideSection id="protein-studio" title="Protein Studio">
        <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Protein Studio is the central sequence-to-structure-to-evidence workspace. Its sections keep model confidence, curated biology, experimental coordinates, and mutation descriptions separate.</p>
        <div className="mt-5 flex flex-wrap gap-2">{studioTabs.map((tab) => <span key={tab} className="border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">{tab}</span>)}</div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <GuideCard title="Structure">Displays available coordinates from an AlphaFold DB predicted model or a loaded PDB/mmCIF. PazAtlas does not run AlphaFold; it retrieves an existing model when requested.</GuideCard>
          <GuideCard title="Confidence">Shows pLDDT as local model confidence and PAE as uncertainty in relative residue/region positioning. These are not experimental validation; low pLDDT does not prove disorder.</GuideCard>
          <GuideCard title="Biology">Connects the structure to curated UniProt domains, regions, sites, processing, PTMs, cofactors, localization, and other annotations when available.</GuideCard>
          <GuideCard title="Experimental Evidence">Uses UniProt links, RCSB metadata, and SIFTS mapping to show chains, canonical coverage, construct context, ligands, and resolved regions.</GuideCard>
        </div>
      </GuideSection>

      <GuideSection id="experimental-evidence" title="Experimental evidence and coverage">
        <div className="grid gap-3 sm:grid-cols-3">
          <GuideCard title="UniProt">Why the PDB entry is associated with the active accession.</GuideCard>
          <GuideCard title="RCSB PDB">Deposited experimental method, resolution, entities, chains, and molecular contents.</GuideCard>
          <GuideCard title="SIFTS mapping">Residue-level translation between PDB coordinates and UniProt canonical positions.</GuideCard>
        </div>
        <div className="mt-6 space-y-3 border border-slate-200 bg-white p-4 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">
          <div>Canonical protein: 1 ------------------------------ 419</div>
          <div className="text-sky-700 dark:text-sky-300">PDB example: &nbsp;&nbsp;&nbsp;&nbsp;41 ============ 174</div>
          <div className="text-emerald-700 dark:text-emerald-300">Another PDB: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;247 ===== 364</div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Experimental structures often represent only part of a protein. PazAtlas reports represented and resolved regions rather than treating a partial structure as evidence for the full protein. Experimental coverage is not a validation percentage.</p>
        <p className="mt-3 text-xs text-slate-500">Available context may include experimental method, resolution, mapped chains, polymer entities, construct length, ligands, ions, nucleic acids, and other protein partners.</p>
      </GuideSection>

      <GuideSection id="structural-comparison" title="Compare prediction with experiment">
        <div className="grid gap-3 md:grid-cols-2">
          <GuideCard title="AlphaFold canonical model">Predicted coordinates associated with the reference sequence.</GuideCard>
          <GuideCard title="Experimental PDB structure">Deposited coordinates for the mapped experimental region.</GuideCard>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">PazAtlas matches reliably mapped canonical residues, extracts corresponding Cα atoms, and performs rigid-body superposition. It reports matched residues, Cα RMSD, and per-residue displacement only for the compared region.</p>
        <p className="mt-3 border-l-2 border-amber-500 pl-3 text-sm font-semibold leading-6">RMSD describes geometric agreement within the compared region. It is not an AlphaFold accuracy score and does not validate regions that were not experimentally observed.</p>
      </GuideSection>

      <GuideSection id="residue-inspector" title="One residue across the workflow">
        <div className="grid gap-2 text-center text-xs font-semibold sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">Uploaded FASTA<br /><span className="font-mono">G574</span></div><span className="text-sky-600" aria-hidden="true">-&gt;</span>
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">UniProt canonical<br /><span className="font-mono">S574</span></div><span className="text-sky-600" aria-hidden="true">-&gt;</span>
          <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">AlphaFold / PDB<br /><span className="font-mono">Mapped residue</span></div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">The Unified Residue Inspector keeps the same biological position connected across uploaded sequence, canonical reference, AlphaFold, experimental structure, and annotations whenever a valid mapping exists.</p>
      </GuideSection>

      <GuideSection id="mutation" title="Mutation Inspector">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Mutation Inspector is descriptive, not predictive. It identifies the wild-type residue in the active reference sequence, accepts a substitution, and reports amino-acid properties such as charge class, hydropathy changes, and nearby residues when coordinates exist.</p>
        <div className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">PazAtlas does not currently predict pathogenicity, Delta Delta G, stability effects, functional outcomes, mutant structures, molecular dynamics, or docking outcomes.</div>
      </GuideSection>

      <GuideSection id="sequence-tools" title="Sequence Tools">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Sequence Tools performs direct DNA, RNA, and protein operations: reverse, complement, reverse complement, DNA/RNA conversion, translation, six-frame translation, GC content, composition, properties, and hydropathy. Six-frame translation is not ORF detection.</p>
      </GuideSection>

      <GuideSection id="local-vs-online" title="What runs locally and what goes online?">
        <div className="grid gap-3 md:grid-cols-2">
          <GuideCard title="LOCAL">Sequence parsing, transformations, statistics, alignment calculations, local PDB/mmCIF viewing, file processing, and local scientific calculations.</GuideCard>
          <GuideCard title="ONLINE WHEN REQUESTED">UniProt, AlphaFold DB, RCSB PDB, and related mapping resources such as SIFTS-associated data.</GuideCard>
        </div>
        <p className="mt-5 text-sm font-semibold leading-6">PazAtlas does not send a FASTA to AlphaFold to generate a new structure. When an AlphaFold DB model is used, PazAtlas retrieves an existing prediction associated with the reference protein.</p>
        <p className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800">Data sources used when requested: NCBI/RefSeq for supported identifiers, UniProt for canonical sequences and curated annotations, AlphaFold DB for predicted reference coordinates, RCSB PDB for deposited experimental structures, and SIFTS-associated mappings for residue correspondence.</p>
      </GuideSection>

      <GuideSection id="difference" title="What does PazAtlas do differently?">
        <div className="grid gap-3 md:grid-cols-4">
          <GuideCard title="ALPHAFOLD">What structure is predicted for this reference sequence?</GuideCard>
          <GuideCard title="UNIPROT">What is known about this protein?</GuideCard>
          <GuideCard title="PDB">What experimental structures have been deposited?</GuideCard>
          <GuideCard title="PAZATLAS">How do these resources relate to the exact sequence I am working with?</GuideCard>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">PazAtlas adds an interpretation and evidence layer around existing sequence and structure resources. It does not replace AlphaFold, validate AlphaFold, or predict structures itself.</p>
      </GuideSection>

      <GuideSection id="limitations" title="What PazAtlas does not currently model">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">PazAtlas does not currently model conformational ensembles, dynamics, environmental effects, ligand-induced changes, PTM-induced structural effects, mutant structure prediction, Delta Delta G, stability, pathogenicity, docking, or molecular dynamics.</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">These limitations are intentionally kept explicit rather than hidden behind unsupported predictions.</p>
      </GuideSection>

      <section id="beta-reminder" className="scroll-mt-24 border-t border-slate-200 py-10 dark:border-slate-800">
        <div><h2 className="text-xl font-semibold">Research Beta</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">PazAtlas is actively evolving. Core workflows have been tested and benchmarked, but users should confirm critical biological conclusions with authoritative databases and established experimental or computational approaches.</p></div>
        <button onClick={() => onNavigate('protein_studio')} className="mt-6 inline-flex items-center gap-2 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500">Open Protein Studio <ArrowRight className="h-4 w-4" /></button>
      </section>
    </main>
  </div>
);
