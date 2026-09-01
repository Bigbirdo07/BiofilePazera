# BioFile Toolkit V1 — Accessibility (a11y) & Usability Audit

**Date**: August 31, 2026  
**Status**: **COMPLIANT**

---

## 1. Core Accessibility Standards Checked

- **Keyboard Navigation**: All interactive tabs, buttons, inputs, file dropzones, and modals are fully keyboard navigable via standard `Tab`, `Shift+Tab`, `Space`, and `Enter` keys.
- **Focus Indicators**: Visible blue/indigo focus rings (`focus:ring-2 focus:ring-sky-500`) applied across all interactive elements in both Light and Dark visual modes.
- **Accessible Names & ARIA Attributes**:
  - `aria-label` tags provided for all icon-only buttons (theme toggle, copy buttons, tab selectors).
  - Proper `<label htmlFor="...">` associations for text inputs and drop-down selectors.
- **Color Contrast**: Complies with WCAG 2.1 AA contrast thresholds ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text).
- **Independent pLDDT Visualization**: AlphaFold structure confidence metric labels (Very high $>90$, Confident $70\text{--}90$, Low $50\text{--}70$, Very low $<50$) provide explicit numerical ranges and textual descriptors alongside color badges to ensure full accessibility for color-blind users.

---

## 2. Tested Workflows

1. **Navbar & Navigation**: Keyboard accessible tab bar with `aria-current="page"` indicator.
2. **Home Workspace**: Quick sequence paste textarea with explicit `<label>` and clear error alerts.
3. **Sequence Workbench**: Six-frame translation table with accessible column headers and clear copy controls.
4. **File Tools**: Accessible drag-and-drop file upload zones with fallbacks to native desktop file dialogs.
