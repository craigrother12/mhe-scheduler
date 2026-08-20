# MHE Scheduler v5

## Run in Codespaces
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Included
- Mechanical Installation and Electrical Installation are separate phases
- Sticky Gantt date header while scrolling vertically
- Sticky task-name column while scrolling horizontally
- Synchronized horizontal scrollbar that remains available at the bottom of the visible Gantt area
- Resource dropdown with Custom option and custom resource text field
- Supplier is free text only
- LocalStorage auto-save
- Gantt day/week/month zoom, dependency arrows, drag-to-reschedule, critical path, baseline, CSV, PNG, and PDF exports

Vite is pinned at 5.4.19 to avoid the Node `styleText` error.
