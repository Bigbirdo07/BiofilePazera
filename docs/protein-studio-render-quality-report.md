# Protein Studio Render Quality Report

## Viewer library used

Protein Studio now uses NGL 2.4.0 for the structure surface in `Pdb3DViewer.tsx`. The existing custom Canvas renderer was replaced only at the viewer layer; the surrounding React workflow remains intact.

## Issues found

The backing canvas was allocated in device pixels, but projection and interaction used those physical dimensions as CSS pixels. On high-DPI displays this could produce incorrect model scale and inaccurate residue hit testing. Resize initialization could also run before the canvas existed because the empty state does not render a canvas.

## Visual improvements made

- Replaced approximate Canvas line rendering with NGL's real cartoon, backbone, and C-alpha representations.
- Enabled NGL high-quality rendering, impostors, GPU antialiasing, depth shading, and camera fitting.
- Added parent `ResizeObserver` handling and NGL resize updates.
- Preserved camera reset, source-aware coloring, and residue picking through the existing controls.
- Kept pLDDT/B-factor coloring semantics: AlphaFold uses B-factor-backed pLDDT coloring, while experimental structures use B-factors.
- Preserved Ribbon, Backbone, C-alpha, source-aware coloring, pLDDT/B-factor semantics, and existing controls.

No scientific feature or interpretation behavior was changed. Fullscreen remains deferred because the current viewer is a Canvas 2D surface and there was no existing stable fullscreen implementation.

## Before / after behavior

Before, 1UBQ appeared as a tangled set of straight Canvas segments. After the change, the live screenshot showed a centered NGL cartoon with recognizable helices and beta sheets, smooth edges, depth, and correct experimental source semantics.

## Structures tested

| Structure | Result |
|---|---|
| P01308 | IMPLEMENTED BUT NOT MANUALLY VERIFIED in this visual-only pass; existing AlphaFold flow retained |
| P04637 | IMPLEMENTED BUT NOT MANUALLY VERIFIED in this visual-only pass; existing AlphaFold flow retained |
| 1UBQ | EXECUTED AND VERIFIED in live webpage; 76 residues, experimental state, no pLDDT |
| 1CRN | EXECUTED AND VERIFIED in live webpage; 46 residues, experimental state, no pLDDT |

Both local experimental structures rendered at normal and smaller desktop widths. The live NGL viewer was visually inspected with 1UBQ at 1440x900. AlphaFold online loading was exercised previously and remains outside the visual renderer change; the browser harness timed out during an additional online confidence-tab wait, so PAE display was not re-claimed as manually verified here.

## Build and test results

- `npm run test:protein-studio`: PASS
- `npm run build`: PASS
- `cargo fmt --check` from `src-tauri`: PASS
- `cargo clippy --all-targets --all-features -- -D warnings` from `src-tauri`: PASS
- `cargo test` from `src-tauri`: PASS, 107 tests
- `git diff --check`: PASS

## Limitations

NGL provides real molecular cartoon geometry, but this pass does not add fullscreen support or experimental/AlphaFold structural alignment. PAE, pLDDT, Biology, and Mutation Inspector semantics were not changed.
