# v5 Gantt-only syntax fix

This patch intentionally contains only the corrected Gantt component and its CSS. It does not replace the v5 task library, scheduling logic, resources, suppliers, exports, or LocalStorage.

## Apply to v5
1. Copy `Gantt.jsx` to `src/Gantt.jsx`.
2. Add this import near the top of `src/main.jsx`:
   `import Gantt from './Gantt';`
3. Delete or rename the old `function Gantt(...)` / `const Gantt...` in `src/main.jsx` to prevent a duplicate declaration.
4. Append `gantt-cleanup.css` to the bottom of `src/styles.css`.
5. Verify: `npm run build`
6. Start: `npm run dev`

The prior extra closing brace before `createRoot(...)` is not present in this component.
