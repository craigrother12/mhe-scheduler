# MHE Scheduler v5 with Clean Gantt

This package preserves the v5-style application and changes only the Gantt presentation layer:
- month, week, and date bands share one sticky header
- task bubbles sit directly beneath their dates
- task names remain sticky during horizontal scrolling
- the date header remains sticky during vertical scrolling
- the bottom horizontal scrollbar stays synchronized
- baseline bars remain available

## Codespaces
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```
