import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Activity, Box, Search, Globe, Sparkles } from 'lucide-react';



export interface Atom {
  serial: number;
  name: string;
  resName: string;
  chainID: string;
  resSeq: number;
  x: number;
  y: number;
  z: number;
  bFactor: number;
}

interface Pdb3DViewerProps {
  pdbText?: string;
  filename?: string;
  isAlphaFoldModel?: boolean;
  selectedChain?: string;
  colorModeOverride?: 'plddt' | 'chain' | 'spectrum' | 'bfactor';
  renderModeOverride?: 'ribbon' | 'trace' | 'spheres';
  detectedAccession?: string;
  detectedProteinName?: string;
  detectedOrganism?: string;
  onFetchAlphaFoldRequested?: (accession: string) => void;
  className?: string;
}

export const Pdb3DViewer: React.FC<Pdb3DViewerProps> = ({
  pdbText = '',
  filename = 'structure.pdb',
  isAlphaFoldModel = true,
  selectedChain = 'ALL',
  colorModeOverride,
  renderModeOverride,
  detectedAccession,
  detectedProteinName,
  detectedOrganism,
  onFetchAlphaFoldRequested,
  className = '',
}) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [renderMode, setRenderMode] = useState<'ribbon' | 'trace' | 'spheres'>('ribbon');
  const [colorMode, setColorMode] = useState<'plddt' | 'chain' | 'spectrum' | 'bfactor'>('plddt');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Sync prop overrides if provided
  useEffect(() => {
    if (colorModeOverride) setColorMode(colorModeOverride);
  }, [colorModeOverride]);

  useEffect(() => {
    if (renderModeOverride) setRenderMode(renderModeOverride);
  }, [renderModeOverride]);

  // 3D Camera & Controls State
  const rotationRef = useRef<{ rx: number; ry: number }>({ rx: 0.3, ry: 0.5 });
  const zoomRef = useRef<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Ensure canvas pixel dimensions match layout at top-level component scope
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 480;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 2. Parse PDB text strictly — DO NOT fabricate 3D coordinates if no ATOM records exist
  useEffect(() => {
    const parsedAtoms: Atom[] = [];

    if (pdbText && (pdbText.includes('ATOM') || pdbText.includes('HETATM'))) {
      const lines = pdbText.split('\n');
      for (let line of lines) {
        if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
          const name = line.substring(12, 16).trim();
          if (name === 'CA') {
            const serial = parseInt(line.substring(6, 11).trim()) || 0;
            const resName = line.substring(17, 20).trim();
            const chainID = line.substring(21, 22).trim() || 'A';
            const resSeq = parseInt(line.substring(22, 26).trim()) || 0;
            const x = parseFloat(line.substring(30, 38).trim()) || 0;
            const y = parseFloat(line.substring(38, 46).trim()) || 0;
            const z = parseFloat(line.substring(46, 54).trim()) || 0;
            const bFactor = parseFloat(line.substring(60, 66).trim()) || 0;

            parsedAtoms.push({ serial, name, resName, chainID, resSeq, x, y, z, bFactor });
          }
        }
      }
    }

    // Filter by chain if selectedChain !== 'ALL'
    const filtered = selectedChain === 'ALL'
      ? parsedAtoms
      : parsedAtoms.filter((a) => a.chainID === selectedChain);

    setAtoms(filtered);
  }, [pdbText, selectedChain]);

  // Color lookup helper
  const getAtomColor = (atom: Atom, idx: number, total: number): string => {
    if (colorMode === 'spectrum') {
      return `hsl(${(idx / total) * 300}, 85%, 55%)`;
    }
    if (colorMode === 'chain') {
      const chainCodes = atom.chainID.charCodeAt(0) % 6;
      const hues = [210, 140, 45, 280, 340, 180];
      return `hsl(${hues[chainCodes]}, 85%, 55%)`;
    }
    if (colorMode === 'bfactor' || !isAlphaFoldModel) {
      // Experimental B-factor spectrum
      const b = Math.max(0, Math.min(100, atom.bFactor));
      const hue = Math.max(0, Math.min(240, 240 - (b / 100) * 240));
      return `hsl(${hue}, 85%, 55%)`;
    }
    // AlphaFold pLDDT coloring
    const plddt = atom.bFactor;
    if (plddt > 90) return '#1d4ed8'; // Deep Blue (>90)
    if (plddt >= 70) return '#06b6d4'; // Cyan (70-90)
    if (plddt >= 50) return '#eab308'; // Yellow (50-70)
    return '#f97316'; // Orange (<50)
  };

  // 3. Canvas 3D Rendering Engine Loop at top-level
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || atoms.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Calculate centroid center
    let cx = 0, cy = 0, cz = 0;
    for (let a of atoms) {
      cx += a.x;
      cy += a.y;
      cz += a.z;
    }
    cx /= atoms.length;
    cy /= atoms.length;
    cz /= atoms.length;

    // Calculate max bounding radius
    let maxR = 0;
    for (let a of atoms) {
      const dist = Math.hypot(a.x - cx, a.y - cy, a.z - cz);
      if (dist > maxR) maxR = dist;
    }
    if (maxR === 0) maxR = 1;

    const render = () => {
      const width = canvas.width || 600;
      const height = canvas.height || 480;
      ctx.clearRect(0, 0, width, height);

      if (autoRotate && !isDraggingRef.current) {
        rotationRef.current.ry += 0.006;
      }

      const rx = rotationRef.current.rx;
      const ry = rotationRef.current.ry;

      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);

      const scale = (Math.min(width, height) / (maxR * 2.4)) * zoomRef.current;
      const halfW = width / 2;
      const halfH = height / 2;

      // Project 3D points
      const projected = atoms.map((atom, idx) => {
        let x = atom.x - cx;
        let y = atom.y - cy;
        let z = atom.z - cz;

        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;

        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;

        const px = halfW + x1 * scale;
        const py = halfH + y2 * scale;
        const color = getAtomColor(atom, idx, atoms.length);

        return { px, py, pz: z2, atom, color };
      });

      projected.sort((a, b) => a.pz - b.pz);

      // Render 3D Ribbon / Backbone / Spheres
      if (renderMode === 'ribbon' || renderMode === 'trace') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < projected.length - 1; i++) {
          const p1 = projected[i];
          const p2 = projected[i + 1];

          // Draw ribbon tube segment if same chain
          if (p1.atom.chainID === p2.atom.chainID) {
            const thickness = renderMode === 'ribbon' ? Math.max(3.5, scale * 0.38) : Math.max(1.5, scale * 0.15);

            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = p1.color;
            ctx.lineWidth = thickness * (1 + (p1.pz / (maxR * 3)));
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(p1.px, p1.py, thickness * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = p1.color;
            ctx.fill();
          }
        }
      } else if (renderMode === 'spheres') {
        for (let p of projected) {
          const radius = Math.max(3, (scale * 0.32) * (1 + p.pz / (maxR * 2)));
          ctx.beginPath();
          ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [atoms, renderMode, colorMode, autoRotate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;

    rotationRef.current.ry += dx * 0.008;
    rotationRef.current.rx += dy * 0.008;

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomRef.current = Math.min(3.5, zoomRef.current * 1.1);
    } else {
      zoomRef.current = Math.max(0.3, zoomRef.current * 0.9);
    }
  };

  // Render Empty State or 3D STRUCTURE AVAILABLE Callout if no 3D coordinates are loaded
  if (atoms.length === 0) {
    if (detectedAccession) {
      return (
        <div className={`relative w-full h-[480px] min-h-[440px] max-h-[560px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-8 shadow-inner select-none ${className}`}>
          <div className="w-16 h-16 rounded-2xl bg-sky-950/80 border border-sky-800/80 flex items-center justify-center mb-4 text-sky-400 shadow-lg animate-pulse">
            <Globe className="w-8 h-8 text-sky-400 stroke-1" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-sky-900/60 border border-sky-700/60 rounded-full text-[11px] font-bold text-sky-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>3D STRUCTURE AVAILABLE</span>
          </div>

          <h4 className="text-lg font-bold text-slate-100 mb-1 font-mono">
            AlphaFold DB model found for {detectedAccession}
          </h4>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6 font-medium">
            {detectedProteinName || 'Protein'} {detectedOrganism ? `• ${detectedOrganism}` : ''}
          </p>

          <button
            onClick={() => onFetchAlphaFoldRequested?.(detectedAccession)}
            className="px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-lg hover:shadow-sky-500/20"
          >
            <Globe className="w-4 h-4" />
            <span>Fetch & Render 3D Structure — ONLINE</span>
          </button>
          <span className="text-[10px] text-slate-500 font-mono mt-3">Contacts EMBL-EBI AlphaFold DB using accession {detectedAccession}</span>
        </div>
      );
    }

    return (
      <div className={`relative w-full h-[480px] min-h-[440px] max-h-[560px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-8 shadow-inner select-none ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500 shadow-sm">
          <Box className="w-8 h-8 text-sky-500/80 stroke-1" />
        </div>

        <h4 className="text-base font-bold text-slate-200 mb-1">
          No 3D structure loaded
        </h4>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
          A protein sequence contains amino-acid information but no atomic coordinates.
          To view a 3D structure, load a PDB/mmCIF file or fetch an AlphaFold DB model using a UniProt accession.
        </p>

        {onFetchAlphaFoldRequested && (
          <button
            onClick={() => onFetchAlphaFoldRequested('P04637')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Look up AlphaFold DB structure</span>
          </button>
        )}
      </div>
    );
  }


  return (
    <div className={`relative w-full h-[480px] min-h-[440px] max-h-[560px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between shadow-inner select-none ${className}`}>
      {/* 3D Toolbar Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur border border-slate-800 p-1.5 rounded-lg text-xs text-slate-300">
        <button
          onClick={() => setRenderMode('ribbon')}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
            renderMode === 'ribbon' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
          }`}
        >
          Ribbon
        </button>
        <button
          onClick={() => setRenderMode('trace')}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
            renderMode === 'trace' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
          }`}
        >
          Backbone
        </button>
        <button
          onClick={() => setRenderMode('spheres')}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
            renderMode === 'spheres' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
          }`}
        >
          Cα Spheres
        </button>

        <div className="w-px h-4 bg-slate-800" />

        {/* Color Mode Options */}
        {isAlphaFoldModel ? (
          <button
            onClick={() => setColorMode('plddt')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              colorMode === 'plddt' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
            }`}
          >
            pLDDT
          </button>
        ) : (
          <button
            onClick={() => setColorMode('bfactor')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              colorMode === 'bfactor' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
            }`}
          >
            B-Factor
          </button>
        )}

        <button
          onClick={() => setColorMode('chain')}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
            colorMode === 'chain' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
          }`}
        >
          Chain
        </button>
        <button
          onClick={() => setColorMode('spectrum')}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
            colorMode === 'spectrum' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
          }`}
        >
          Spectrum
        </button>
      </div>

      {/* Top Right Camera Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1 bg-slate-900/80 backdrop-blur border border-slate-800 p-1 rounded-lg text-slate-300">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle 3D Auto-Rotation"
          className={`p-1.5 rounded hover:bg-slate-800 cursor-pointer ${autoRotate ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => (zoomRef.current = Math.min(3.5, zoomRef.current * 1.2))}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => (zoomRef.current = Math.max(0.3, zoomRef.current * 0.8))}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            zoomRef.current = 1.0;
            rotationRef.current = { rx: 0.3, ry: 0.5 };
          }}
          title="Reset Camera"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer text-[10px] font-mono px-2"
        >
          Reset
        </button>
      </div>

      {/* Interactive WebGL/Canvas 3D View */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Status Overlay Footer */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 z-10">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-slate-200">{filename}</span>
          <span>•</span>
          <span>{atoms.length} Cα Residues</span>
          {selectedChain !== 'ALL' && <span className="text-sky-400 font-bold">• Chain {selectedChain}</span>}
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Drag to Rotate • Scroll to Zoom</span>
      </div>
    </div>
  );
};
