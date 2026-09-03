# Protein Studio Render Quality Audit

## Current viewer

- **Library:** custom HTML Canvas 2D renderer in `src/components/common/Pdb3DViewer.tsx`; no Mol*, NGL, WebGL, or external molecular rendering library is used.
- **Renderer initialization:** one canvas ref is created by React and an animation loop projects parsed C-alpha atoms into 2D. The viewer instance is not recreated on each frame.
- **Pixel ratio:** the canvas backing store is multiplied by device pixel ratio, capped at 2. However, rendering currently uses the backing-store dimensions as though they were CSS dimensions, while click coordinates are separately multiplied by DPR. This mixes coordinate spaces and can make models too small or selections inaccurate on Retina displays.
- **Resize handling:** a `ResizeObserver` updates the canvas backing dimensions. The viewer has an explicit `clamp(520px, 60vh, 760px)` height, but the render loop does not establish a logical CSS-pixel transform after resizing.
- **Antialiasing:** Canvas 2D browser antialiasing is available, but image smoothing and high-DPI logical rendering are not explicitly configured. Lines are currently flat strokes without depth shading or edge treatment.
- **Default representation:** Ribbon is already the default, with Backbone and C-alpha sphere modes preserved. Ribbon is rendered as straight C-alpha segments with a fixed thickness formula.
- **Lighting/shading:** there is no lighting model. Depth affects thickness/radius only; ribbon strokes have flat color and limited visual depth.
- **Background:** the viewer uses a restrained dark slate scientific workspace background with dark controls and footer overlays.
- **Camera fit/reset:** the model is centered using its atom centroid and scaled to a fixed bounding-radius margin. Reset restores the initial rotation and zoom. Model changes do not explicitly reset the camera.
- **Selection:** selected residues use a fixed-size yellow ring and center dot. The highlight is not expressed in logical CSS pixels, so it is also affected by the DPR mismatch.
- **Fullscreen:** no fullscreen control is currently implemented. This pass will leave it unchanged rather than introduce a new unstable interaction.

## Reusable behavior

The existing PDB parser, source-aware coloring, pLDDT/B-factor semantics, representation controls, camera interactions, residue selection, and bounded viewer layout are retained.

## Visual-only implementation scope

This pass will correct high-DPI coordinate handling, make resize behavior deterministic, improve camera fitting and model reset behavior, and add restrained depth/edge shading and a clearer selection treatment. AlphaFold, experimental-structure, pLDDT, PAE, Biology, and Mutation Inspector behavior remain unchanged.
