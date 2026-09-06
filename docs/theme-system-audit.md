# BioFile Theme System Audit

## Theme System Found

The application uses React state in `src/App.tsx` and Tailwind `dark:` utility classes. No theme context or System mode exists.

## Theme Control Location

The control is the moon/sun button in `src/components/layout/Navbar.tsx`. It calls `onToggleTheme`, which updates the `isDarkMode` state owned by `App`.

## Root Theme Mechanism

`App` applies or removes the `dark` class on `document.documentElement`. Tailwind v4 is now explicitly configured in `src/index.css` with:

`@custom-variant dark (&:where(.dark, .dark *));`

This makes the manual root class authoritative instead of depending on the operating-system media preference.

## Findings Before Fix

- Manual toggle state was not persisted.
- Reload reset the state to light.
- The root class was only changed inside the click handler.
- Tailwind v4 generated `dark:` utilities under `prefers-color-scheme` because no class-based custom variant was configured.
- No System appearance option or system-change listener exists.
- `src/App.css` contains an old Vite dark media block, but it is not imported by `src/main.tsx` and does not affect the application.

## Fix Applied

The minimum infrastructure fix now:

- initializes Light/Dark from `localStorage` key `biofile-theme`;
- synchronizes `html.dark` in a React effect;
- persists Light/Dark changes across navigation and reload;
- uses class-based Tailwind dark variants.

No System mode was added because the existing UI did not expose one.

## Page Review

Home, Protein Studio, Sequence Tools, File Tools, FASTQ QC, and About use paired light/dark utility classes for their primary page surfaces, text, borders, inputs, tabs, and cards. The NGL molecular viewport remains intentionally dark as a scientific visualization surface. About also contains an intentional light placeholder background with a dark-mode class fallback.

Hardcoded `bg-white` and similar classes are classified safe when paired with `dark:bg-*` or used for intentional light controls. The old unimported `App.css` is inactive legacy styling, not a runtime theme failure.

## Acceptance Results

- Light root state: PASS after fix (`html` without `dark`, persisted `light`).
- Dark root state: PASS after fix (`html.dark`, persisted `dark`).
- Navigation persistence: PASS by shared App state.
- Reload persistence: PASS by `localStorage` initialization.
- System mode: NOT APPLICABLE; no existing System mode.
- Scientific dark viewport exception: INTENTIONAL.
- About page theme tokens: PASS; paired dark utilities are used, with one intentional placeholder color fallback.

## Verification

- `npm test`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
