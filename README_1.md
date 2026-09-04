# MHE Scheduler - Latest Best (StackBlitz)

## What's in this version (fixed)
- Sat/Sun/Hols calendar (was Fri/Sat/Hols)
- Phase editable inline + Bulk Set Phase
- Duration 5d / 1w support
- Parent rollup fix
- PDF export no overlap
- No duplicate isWeekendSatSun - builds on Netlify

## StackBlitz Import
1. Go to https://stackblitz.com/ -> New Project -> Import from file / Drag & Drop
2. Drag this zip
3. npm install runs automatically, then npm run dev

## Dev
- main.jsx = scheduler + holidays
- Gantt.jsx = timeline
- QuoteParser.jsx = vendor quotes
