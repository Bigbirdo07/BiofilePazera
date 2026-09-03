# NGL Web Polish Audit

## Current NGL Architecture

`src/components/common/Pdb3DViewer.tsx` owns the Protein Studio molecular surface. NGL is loaded with a dynamic `import('ngl')` only after parsed coordinate-bearing atoms exist. A single NGL `Stage` is stored in a React ref; loaded structures become NGL components and representations are replaced when the existing Ribbon, Backbone, Cα, color, chain, or residue-highlight controls change.

NGL provides the actual WebGL renderer, cartoon geometry, high-quality impostors, camera fitting, native drag/zoom, and residue picking. PDB/mmCIF parsing and all scientific state remain in the existing Protein Studio code.

## Existing Canvas Code

The previous custom Canvas projection is no longer the visible surface. It remains as dead code inside `Pdb3DViewer.tsx` and should be removed in the cleanup portion of this pass. Its parser and scientific utilities must remain available where used outside the viewer.

## Potential Memory Leaks

The NGL path removes old components before loading a new structure, disconnects its `ResizeObserver`, and disposes the Stage on component unmount. Dynamic-load cancellation prevents a late import/load from attaching after the component has changed. The remaining risk is that the old Canvas effect and refs add unnecessary code and should be deleted rather than maintained.

## Bundle Impact

NGL was initially a static dependency in the main bundle. It is now dynamically imported, producing a separate NGL chunk so Home and non-Protein Studio routes do not download the molecular renderer during the initial build.

## Responsive UI Problems

The viewer has a bounded responsive height and the NGL container observes its own size. Desktop layouts are the primary target. Smaller widths need browser validation to ensure the existing two-column page stacks or remains usable without document overflow.

## State-Transition Risks

Structure changes must remove the prior NGL component before loading the next file. AlphaFold pLDDT coloring must remain limited to AlphaFold models, while experimental structures retain B-factor semantics. Existing React state reset logic for Biology, PAE, mutation, and source badges is outside the viewer and must be regression-tested rather than duplicated here.
