# MHE Scheduler

Codespaces-ready React/Vite project for material handling project schedules.

## Run in GitHub Codespaces
```bash
npm install
npm run dev
```

Open the forwarded Vite port.

## Fixes included
- LocalStorage auto-save and auto-load in the browser
- Stable internal UID predecessor links, so editing visible task IDs does not break relationships
- Circular dependency blocking and warning display
- Smart duplicate mode: clear predecessor logic by default, with optional copy predecessor mode
- Critical path highlighting
- Resource overlap warnings
- Baseline dates, variance days, and actual start/finish fields
- CSV, MS Project XML, printable HTML, and JSON exports

## Main app file
`src/main.jsx`
