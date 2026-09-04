import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Trash2, List, BarChart3, Save, Trash, Download, FileImage, FileDown, Link as LinkIcon, ChevronUp, ChevronDown, Search, Undo2, Redo2, Sparkles, Filter, GripVertical, CheckSquare, X, Settings2, Upload, FileJson, Info, Eye, EyeOff, CalendarOff, CalendarCheck, RotateCcw, FileText, Package, Calendar, GitMerge } from 'lucide-react';
import Gantt from './Gantt.jsx';
import QuoteParser from './QuoteParser.jsx';
import './styles.css';

const PHASES = ['Phase 1: Project Kickoff & Baseline Planning','Phase 2: Detailed Engineering & Design','Phase 3: Procurement & Fabrication','Phase 4: Site Readiness & Logistics','Phase 5A: Mechanical Installation','Phase 5B: Electrical Installation','Phase 6: Controls & Software Integration','Phase 7: Testing, Commissioning & Startup','Phase 8: Training, Handover & Closeout'];
const PHASE_COLORS = {
  'Phase 1: Project Kickoff & Baseline Planning': '#dbeafe',
  'Phase 2: Detailed Engineering & Design': '#e0e7ff',
  'Phase 3: Procurement & Fabrication': '#fef3c7',
  'Phase 4: Site Readiness & Logistics': '#dcfce7',
  'Phase 5A: Mechanical Installation': '#ffe4e6',
  'Phase 5B: Electrical Installation': '#ffedd5',
  'Phase 6: Controls & Software Integration': '#e0f2fe',
  'Phase 7: Testing, Commissioning & Startup': '#f3e8ff',
  'Phase 8: Training, Handover & Closeout': '#ecfdf5',
};
const RAW = [
[0,'Internal Kickoff Meeting',1],[0,'Customer Kickoff Meeting',1],[0,'Collect Customer Standards',3],[0,'Confirm Contract Milestones',2],[0,'Create WBS And Baseline Schedule',5],[0,'Identify Long-Lead Items',3],
[1,'Final Field Verification / As-Built Survey',3],[1,'System Layout And Flow Analysis',5],[1,'Mechanical Design',15],[1,'Electrical Design',10],[1,'Controls Design',10],[1,'IFC Drawings',2],[1,'BOM Release',3],[1,'Customer Signed Approvals',2],
[2,'Conveyor Manufacturing',60],[2,'Controls Manufacturing',50],[2,'Robotics Manufacturing',80],[2,'Platform Manufacturing',40],[2,'Rack Manufacturing',30],[2,'Pick Module Manufacturing',50],[2,'Custom Fabrication',20],[2,'Factory Acceptance Test',3],[2,'Freight Coordination',5],[2,'Receiving Inspection',3],
[3,'Site Readiness Checklist',3],[3,'Permits',10],[3,'Safety Plan',5],[3,'Storage Plan',3],[3,'Manpower Plan',5],[3,'Pre-Install Meeting',1],
[4,'Mobilization',2],[4,'Layout And Anchor',4],[4,'Racking / Mezzanine / Steel Erection',15],[4,'Conveyor / Equipment Set In Place',15],[4,'Mechanical Completion',7],
[5,'Power Distribution',10],[5,'Motor And Device Wiring',10],[4,'Pneumatics / Air Piping',5],
[6,'Panel Set And Power-Up',3],[6,'I/O Checkout',7],[6,'Network Commissioning',4],[6,'PLC Code Download',7],[6,'HMI / WCS / WES Integration',7],[6,'WMS/ERP Integration',7],[6,'Safety System Validation',4],
[7,'No-Load Testing',3],[7,'Load Testing',3],[7,'Throughput Testing',3],[7,'Sortation Accuracy Testing',3],[7,'Exception Handling Testing',3],[7,'End-To-End Integration Testing',5],[7,'SAT / Site Acceptance',3],[7,'Punchlist Resolution',5],
[8,'Operator Training',2],[8,'Maintenance Training',2],[8,'Spare Parts Handover',2],[8,'As-Built Documentation',5],[8,'Final Punchlist Closeout',5],[8,'Go-Live Support',3],[8,'Lessons Learned',2],[8,'Final Invoicing',3]
];
const LIB = RAW.map(([p,name,duration])=>({phase:PHASES[p],name,duration}));
const TEMPLATES = {
  conveyor:{name:'Conveyor Project',icon:'📦',tasks:[{phase:0,name:'Internal Kickoff Meeting',duration:1,preds:[]},{phase:0,name:'Customer Kickoff Meeting',duration:1,preds:[0]},{phase:0,name:'Create WBS And Baseline Schedule',duration:5,preds:[1]},{phase:1,name:'System Layout And Flow Analysis',duration:5,preds:[2]},{phase:1,name:'Mechanical Design',duration:15,preds:[3]},{phase:1,name:'Electrical Design',duration:10,preds:[3]},{phase:2,name:'Conveyor Manufacturing',duration:60,preds:[4]},{phase:2,name:'Controls Manufacturing',duration:50,preds:[5]},{phase:3,name:'Site Readiness Checklist',duration:3,preds:[6,7]},{phase:4,name:'Layout And Anchor',duration:4,preds:[8]},{phase:4,name:'Conveyor / Equipment Set In Place',duration:15,preds:[9]},{phase:5,name:'Power Distribution',duration:10,preds:[10]},{phase:6,name:'I/O Checkout',duration:7,preds:[11]},{phase:7,name:'No-Load Testing',duration:3,preds:[12]},{phase:8,name:'Go-Live Support',duration:3,preds:[13]}]},
  sortation:{name:'Sortation System',icon:'⚡',tasks:[{phase:0,name:'Internal Kickoff Meeting',duration:1,preds:[]},{phase:1,name:'Final Field Verification',duration:3,preds:[0]},{phase:1,name:'System Layout And Flow Analysis',duration:5,preds:[1]},{phase:2,name:'Sortation Equipment Manufacturing',duration:60,preds:[2]},{phase:4,name:'Racking / Mezzanine / Steel Erection',duration:15,preds:[3]},{phase:6,name:'HMI / WCS / WES Integration',duration:7,preds:[4]},{phase:7,name:'Sortation Accuracy Testing',duration:3,preds:[5]},{phase:7,name:'Throughput Testing',duration:3,preds:[6]},{phase:8,name:'Operator Training',duration:2,preds:[7]}]},
  controls:{name:'Controls Integration',icon:'🔧',tasks:[{phase:0,name:'Collect Customer Standards',duration:3,preds:[]},{phase:1,name:'Controls Design',duration:10,preds:[0]},{phase:2,name:'Controls Manufacturing',duration:50,preds:[1]},{phase:6,name:'Panel Set And Power-Up',duration:3,preds:[2]},{phase:6,name:'Network Commissioning',duration:4,preds:[3]},{phase:6,name:'PLC Code Download',duration:7,preds:[4]},{phase:6,name:'Safety System Validation',duration:4,preds:[5]},{phase:7,name:'End-To-End Integration Testing',duration:5,preds:[6]}]}
};

const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const date = s=>new Date(`${s}T12:00:00`);
const add = (s,n)=>{let d=date(s); d.setDate(d.getDate()+Number(n)); return iso(d)};
const diff = (a,b)=>Math.round((date(b)-date(a))/86400000);
const esc = v=>`"${String(v??'').replaceAll('"','""')}"`;
const safeUid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2,10);
function parseDurationInput(input){
  if(input==null) return null;
  const raw = String(input).trim().toLowerCase();
  if(!raw) return null;
  // Match patterns like "5", "5d", "5 days", "1w", "1 week", "1.5w", "2 w", "0.5 weeks"
  const weekMatch = raw.match(/^(\d+(\.\d+)?)\s*w(eek|eeks)?$/);
  if(weekMatch){
    const weeks = parseFloat(weekMatch[1]);
    if(isNaN(weeks)) return null;
    return Math.max(1, Math.round(weeks * 5));
  }
  const dayMatch = raw.match(/^(\d+(\.\d+)?)\s*d(ay|ays)?$/);
  if(dayMatch){
    const days = parseFloat(dayMatch[1]);
    if(isNaN(days)) return null;
    return Math.max(1, Math.round(days));
  }
  // Plain number = days
  const num = Number(raw);
  if(!isNaN(num) && raw !== ''){
    return Math.max(1, Math.round(num));
  }
  // Fallback: extract first number and unit
  const numUnit = raw.match(/(\d+(\.\d+)?)/);
  if(numUnit){
    const val = parseFloat(numUnit[1]);
    if(raw.includes('w')) return Math.max(1, Math.round(val*5));
    return Math.max(1, Math.round(val));
  }
  return null;
}
function formatDurationDays(days){
  if(!days) return '';
  if(days % 5 === 0){
    const w = days/5;
    // Show as "1w" for clean weeks, but keep days tooltip? We'll show "1w" if >=5 and divisible
    if(w>=1) return `${w}w`;
  }
  return `${days}d`;
}

// ===== Federal Holidays =====
function getNthWeekday(year, month, weekday, n){ // month 0-11, weekday 0-6 Sun-Sat, n 1-indexed
  let d = new Date(year, month, 1);
  let count=0;
  while(d.getMonth()===month){
    if(d.getDay()===weekday){
      count++;
      if(count===n) return new Date(d);
    }
    d.setDate(d.getDate()+1);
  }
  return null;
}
function getLastWeekday(year, month, weekday){
  let d = new Date(year, month+1, 0);
  while(d.getDay()!==weekday) d.setDate(d.getDate()-1);
  return d;
}
function buildHolidaySet(year){
  const set = new Set();
  const addIso = (d)=>{ if(d) set.add(iso(d)); };
  // Fixed
  const fixed = [
    new Date(year,0,1), // New Year
    new Date(year,5,19), // Juneteenth
    new Date(year,6,4), // Independence
    new Date(year,10,11), // Veterans
    new Date(year,11,25), // Christmas
  ];
  fixed.forEach(d=>{
    addIso(d);
    const dow = d.getDay();
    if(dow===6){ // Sat -> Fri before
      const obs = new Date(d); obs.setDate(obs.getDate()-1); if(obs.getFullYear()===year) addIso(obs);
    } else if(dow===0){ // Sun -> Mon after
      const obs = new Date(d); obs.setDate(obs.getDate()+1); if(obs.getFullYear()===year) addIso(obs);
    }
  });
  // Floating
  const mlk = getNthWeekday(year,0,1,3); addIso(mlk);
  const pres = getNthWeekday(year,1,1,3); addIso(pres);
  const mem = getLastWeekday(year,4,1); addIso(mem);
  const labor = getNthWeekday(year,8,1,1); addIso(labor);
  const columbus = getNthWeekday(year,9,1,2); addIso(columbus);
  const thanks = getNthWeekday(year,10,4,4); addIso(thanks);
  // Also handle Dec31 observed for Jan1 next year Saturday
  const jan1Next = new Date(year+1,0,1);
  if(jan1Next.getDay()===6){ // Sat -> Fri Dec31 this year
    addIso(new Date(year,11,31));
  }
  return set;
}
const holidayCache = new Map();
function getHolidaySetCached(year){
  if(!holidayCache.has(year)) holidayCache.set(year, buildHolidaySet(year));
  return holidayCache.get(year);
}
function isFederalHoliday(isoStr){
  if(!isoStr) return false;
  const d = date(isoStr);
  const y = d.getFullYear();
  // check this year and adjacent years for cross-year observed
  for(let yy=y-1; yy<=y+1; yy++){
    const set = getHolidaySetCached(yy);
    if(set.has(isoStr)) return true;
  }
  return false;
}
function isWeekendSatSun(isoStr){
  const dow = date(isoStr).getDay();
  return dow===0 || dow===6;
}
// Legacy alias - keep for any old calls
function isWeekendFridaySaturday(isoStr){ return isWeekendSatSun(isoStr); }
function isWorkDay(isoStr, cfg){
  if(!cfg) return true;
  if(!cfg.enabled) return true;
  const dow = date(isoStr).getDay();
  // New logic: skip Sat/Sun/Hols
  // Support both new flags (skipWeekends, skipSat, skipSun) and old flags (skipFriSat, skipFri) for migration
  const skipWeekends = cfg.skipWeekends || cfg.skipFriSat;
  if(skipWeekends){
    if(dow===0 || dow===6) return false;
  } else {
    if(cfg.skipSat && dow===6) return false;
    if(cfg.skipSun && dow===0) return false;
    // legacy: if old config had skipFri, treat it as skipSun for migration
    if(cfg.skipFri && dow===0) return false;
  }
  if(cfg.skipHolidays && isFederalHoliday(isoStr)) return false;
  return true;
}
function nextWorkDay(isoStr, cfg){
  if(!cfg || !cfg.enabled) return isoStr;
  let cur = isoStr;
  let guard=0;
  while(!isWorkDay(cur, cfg) && guard<20){
    cur = add(cur,1);
    guard++;
  }
  return cur;
}
function prevWorkDay(isoStr, cfg){
  if(!cfg || !cfg.enabled) return isoStr;
  let cur = isoStr;
  let guard=0;
  while(!isWorkDay(cur, cfg) && guard<20){
    cur = add(cur,-1);
    guard++;
  }
  return cur;
}
function addWorkDays(startIso, n, cfg, allowNonWork){
  if(!cfg || !cfg.enabled || allowNonWork) return add(startIso, n);
  if(n===0) return nextWorkDay(startIso, cfg);
  let cur = nextWorkDay(startIso, cfg);
  let remaining = n;
  // if start itself was counted as day 0, we need to move forward n days
  // Our loop for duration-1: addWorkDays(start, duration-1) => start is day 1, so 0 extra = start, 1 extra = next workday
  for(let i=0;i<n;i++){
    cur = add(cur,1);
    cur = nextWorkDay(cur, cfg);
  }
  return cur;
}
function countWorkDaysBetween(startIso, finishIso, cfg, allowNonWork){
  if(!startIso || !finishIso) return 1;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(finishIso)) return 1;
  const s = date(startIso);
  const f = date(finishIso);
  if(isNaN(s.getTime()) || isNaN(f.getTime())) return 1;
  if(f < s) return 1;
  let count = 0;
  let cur = iso(s);
  const end = iso(f);
  let guard = 0;
  while(cur <= end && guard < 1000){
    if(allowNonWork || !cfg || !cfg.enabled || isWorkDay(cur, cfg)){
      count++;
    }
    cur = add(cur,1);
    guard++;
  }
  return Math.max(1, count);
}
function subtractWorkDays(finishIso, n, cfg, allowNonWork){
  if(!cfg || !cfg.enabled || allowNonWork) return add(finishIso, -n);
  if(n===0) return prevWorkDay(finishIso, cfg);
  let cur = prevWorkDay(finishIso, cfg);
  for(let i=0;i<n;i++){
    cur = add(cur,-1);
    cur = prevWorkDay(cur, cfg);
  }
  return cur;
}

function cycles(rows, rowsMap){ let m=rowsMap||new Map(rows.map(x=>[x.uid,x])), v=new Set(), done=new Set(), bad=false; function go(u){ if(v.has(u)){bad=true;return} if(done.has(u))return; v.add(u); (m.get(u)?.preds||[]).forEach(p=>go(p.uid)); v.delete(u); done.add(u);} rows.forEach(x=>go(x.uid)); return bad; }
function maxDate(a,b){
  if(!a) return b;
  if(!b) return a;
  return date(b) > date(a) ? b : a;
}
function schedule(rows, calendarCfg){
  const cfg = calendarCfg || {enabled:true, skipFriSat:true, skipFri:true, skipSat:true, skipHolidays:true};
  const rowsMap = new Map(rows.map(x=>[x.uid,x]));
  if(cycles(rows, rowsMap)) return rows;
  const isValidDateStr = (s) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(date(s).getTime());
  let a=rows.map(x=>({...x,preds:[...(x.preds||[])]}));
  let map = new Map(a.map(x=>[x.uid,x]));
  for(let z=0;z<Math.min(a.length*2+5,80);z++){
    let changed=false;
    a=a.map(t=>{
      const allow = t.allowNonWork;
      let s = null;
      let fConstraint = null;

      // Gather constraints from predecessors using the latest map values - skip if pred dates blank/invalid
      for(const p of t.preds||[]){
        const q=map.get(p.uid); if(!q) continue;
        const l=+p.lag||0;
        if(p.type==='FS'){
          if(!isValidDateStr(q.finish)) continue;
          const ns = addWorkDays(q.finish, l+1, cfg, allow);
          if(!isValidDateStr(ns)) continue;
          s = maxDate(s, ns);
        } else if(p.type==='SS'){
          if(!isValidDateStr(q.start)) continue;
          const ns = addWorkDays(q.start, l, cfg, allow);
          if(!isValidDateStr(ns)) continue;
          s = maxDate(s, ns);
        } else if(p.type==='FF'){
          if(!isValidDateStr(q.finish)) continue;
          const nf = addWorkDays(q.finish, l, cfg, allow);
          if(!isValidDateStr(nf)) continue;
          fConstraint = maxDate(fConstraint, nf);
        } else if(p.type==='SF'){
          if(!isValidDateStr(q.start)) continue;
          const nf = addWorkDays(q.start, l, cfg, allow);
          if(!isValidDateStr(nf)) continue;
          fConstraint = maxDate(fConstraint, nf);
        }
      }

      // If we have a finish constraint (FF/SF), convert it to a start constraint
      if(fConstraint){
        const minStartFromFinish = subtractWorkDays(fConstraint, (t.duration||1)-1, cfg, allow);
        if(isValidDateStr(minStartFromFinish)) s = maxDate(s, minStartFromFinish);
      }

      // If no predecessor drove start, keep the task's own start (respect calendar) - but allow blank to stay blank
      if(!s){
        if(isValidDateStr(t.start)){
          s = nextWorkDay(t.start, allow? {enabled:false}: cfg);
        } else {
          // keep blank if task has no valid start and no pred drove it
          s = t.start || '';
        }
      } else {
        // Ensure the derived start respects work-day calendar if it's valid
        if(isValidDateStr(s)) s = nextWorkDay(s, allow? {enabled:false}: cfg);
      }

      // Recalc finish from start + duration-1 workdays - only if start is valid
      let f = '';
      if(isValidDateStr(s)){
        f = addWorkDays(s, (t.duration||1)-1, cfg, allow);
      } else {
        // If start blank but we have a finish constraint, use that as finish
        if(fConstraint && isValidDateStr(fConstraint)){
          f = fConstraint;
        } else {
          f = t.finish || '';
        }
      }
      // FF/SF may push finish even later
      if(fConstraint && isValidDateStr(fConstraint) && isValidDateStr(f)){
        if(date(fConstraint) > date(f)){
          f = fConstraint;
          if(isValidDateStr(f)){
            s = subtractWorkDays(f, (t.duration||1)-1, cfg, allow);
            if(isValidDateStr(s)) s = nextWorkDay(s, allow? {enabled:false}: cfg);
            f = isValidDateStr(s) ? addWorkDays(s, (t.duration||1)-1, cfg, allow) : f;
            if(fConstraint && isValidDateStr(fConstraint) && isValidDateStr(f) && date(fConstraint) > date(f)) f = fConstraint;
          }
        }
      }

      if(s!==t.start||f!==t.finish) changed=true;
      const nt={...t,start:s,finish:f}; map.set(t.uid, nt); return nt;
    });
    if(!changed) break;
  }
  // Parent rollup: summary tasks get dates from children BUT parent's own predecessor link supersedes
  // Per user: 110's link to 111 should dictate 110's start, and that start dictates children's start
  try {
    const childrenMap = new Map();
    a.forEach(r=>{ if(r.parentUid){ if(!childrenMap.has(r.parentUid)) childrenMap.set(r.parentUid, []); childrenMap.get(r.parentUid).push(r.uid); } });
    const levelMemo = new Map();
    const getLevel = (uid, visited=new Set())=>{
      if(levelMemo.has(uid)) return levelMemo.get(uid);
      if(visited.has(uid)) return 0;
      visited.add(uid);
      const row = a.find(x=>x.uid===uid);
      if(!row || !row.parentUid) { levelMemo.set(uid,0); return 0; }
      const l = getLevel(row.parentUid, visited)+1;
      levelMemo.set(uid,l);
      return l;
    };
    a.forEach(r=>getLevel(r.uid));
    // deepest parents first so children already pushed before their own parent rolls up
    const sortedParents = [...a].filter(r=>childrenMap.has(r.uid)).sort((x,y)=>(levelMemo.get(y.uid)||0)-(levelMemo.get(x.uid)||0));
    sortedParents.forEach(parent=>{
      const parentIdx = a.findIndex(x=>x.uid===parent.uid);
      if(parentIdx<0) return;
      const parentRow = a[parentIdx];
      // parent start is already from its own preds (e.g., 111 -> 110), do NOT overwrite with min child start
      const parentStart = parentRow.start;
      if(!parentStart || !/^\d{4}-\d{2}-\d{2}$/.test(parentStart)) return;
      const childUids = childrenMap.get(parent.uid) || [];
      // Push children to start no earlier than parent start (if they have FS to parent, treat as SS for summary)
      childUids.forEach(cUid=>{
        const cIdx = a.findIndex(x=>x.uid===cUid);
        if(cIdx<0) return;
        const child = a[cIdx];
        if(!child.start) return;
        // If child has a pred to parent with FS, interpret as SS for summary tasks so it starts with parent
        // Otherwise enforce child start >= parent start
        const hasPredToParent = (child.preds||[]).some(p=>p.uid===parent.uid);
        if(child.start < parentStart || hasPredToParent){
          // keep duration, move start to parent start
          const newFinish = addWorkDays(parentStart, (child.duration||1)-1, cfg, child.allowNonWork);
          a[cIdx] = {...child, start: parentStart, finish: newFinish};
          map.set(cUid, a[cIdx]);
        }
      });
      // After pushing children, parent finish = latest child finish
      const kids = childUids.map(uid=>a.find(x=>x.uid===uid)).filter(Boolean).filter(k=>k.finish && /^\d{4}-\d{2}-\d{2}$/.test(k.finish));
      if(kids.length===0) return;
      let maxFinish = kids[0].finish;
      kids.forEach(k=>{ if(k.finish > maxFinish) maxFinish = k.finish; });
      // If maxFinish < parentStart, keep at least parent's own duration
      if(maxFinish < parentStart){
        maxFinish = addWorkDays(parentStart, (parentRow.duration||1)-1, cfg, parentRow.allowNonWork);
      }
      const newDur = countWorkDaysBetween(parentStart, maxFinish, cfg, parentRow.allowNonWork);
      a[parentIdx] = {...parentRow, start: parentStart, finish: maxFinish, duration: newDur};
      map.set(parent.uid, a[parentIdx]);
    });
  } catch(e){ /* ignore rollup errors */ }
  return a;
}
function criticalPath(rows){
  if(!rows.length) return new Set();
  const rowsMap = new Map(rows.map(x=>[x.uid,x]));
  let succ=new Map(rows.map(x=>[x.uid,[]]));
  rows.forEach(x=>(x.preds||[]).forEach(p=>succ.get(p.uid)?.push(x.uid)));
  let memo=new Map();
  const len=u=>{ if(memo.has(u)) return memo.get(u); let t=rowsMap.get(u); let n=Math.max(0,...(succ.get(u)||[]).map(len)); const v=(t?.duration||0)+n; memo.set(u,v); return v; };
  let sorted=[...rows].sort((a,b)=>len(b.uid)-len(a.uid));
  let start=sorted[0], set=new Set();
  while(start){ set.add(start.uid); let nextIds=succ.get(start.uid)||[]; if(!nextIds.length) break; let best=nextIds.map(u=>rowsMap.get(u)).filter(Boolean).sort((a,b)=>len(b.uid)-len(a.uid))[0]; start=best; }
  rows.forEach(r=>{
    if(r.criticalOverride==='critical') set.add(r.uid);
    if(r.criticalOverride==='non-critical') set.delete(r.uid);
  });
  return set;
}

function App(){
  const [rows,setRows]=useState(()=>{
    try{ const saved = JSON.parse(localStorage.getItem('mhe6'))?.rows||[]; return saved.map(r=>({...r, area: r.area || r.zone || 'Area 1', parentUid: r.parentUid||null, collapsed: r.collapsed||false, criticalOverride: r.criticalOverride||'auto', allowNonWork: r.allowNonWork||false})); }catch{return []}
  });
  const [view,setView]=useState('gantt');
  const [start,setStart]=useState(()=>{try{return JSON.parse(localStorage.getItem('mhe6'))?.start||iso(new Date())}catch{return iso(new Date())}});
  const [customerName,setCustomerName]=useState(()=>{try{return JSON.parse(localStorage.getItem('mhe6'))?.customerName||''}catch{return ''}});
  const [projectNumber,setProjectNumber]=useState(()=>{try{return JSON.parse(localStorage.getItem('mhe6'))?.projectNumber||''}catch{return ''}});
  const [showCustomModal,setShowCustomModal]=useState(false);
  const [customForm,setCustomForm]=useState({name:'', phase:PHASES[0], duration:5, area:'Area 1', resource:'', supplier:'', parentUid:null, criticalOverride:'auto', allowNonWork:false});
  const [searchQuery,setSearchQuery]=useState('');
  const [zoomLevel,setZoomLevel]=useState('days');
  const [showCriticalOnly,setShowCriticalOnly]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [showLegend,setShowLegend]=useState(false);
  const [showColumns,setShowColumns]=useState(false);
  const [showProjects,setShowProjects]=useState(false);
  const [savedProjects,setSavedProjects]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('mhe_saved_projects')||'[]'); }catch{ return []; } });
  const [projectSearch,setProjectSearch]=useState('');
  const [showQuoteParser,setShowQuoteParser]=useState(false);
  const [visibleCols,setVisibleCols]=useState({id:true, task:true, phase:true, preds:true, start:true, dur:true, finish:true, progress:true, baseline:false, variance:false, area:true, resource:true, supplier:false, allow:false});
  const [colWidths,setColWidths]=useState({id:60, task:320, phase:110, preds:200, start:165, dur:110, finish:125, progress:90, baseline:160, variance:110, area:140, resource:140, supplier:140, allow:90});
  const [selected,setSelected]=useState(new Set());
  const [bulkParentUid,setBulkParentUid]=useState('');
  const [bulkStart,setBulkStart]=useState('');
  const [bulkDur,setBulkDur]=useState('');
  const [bulkPredUid,setBulkPredUid]=useState('');
  const [bulkPredType,setBulkPredType]=useState('FS');
  const [bulkPredLag,setBulkPredLag]=useState('0');
  const [expandedPhases,setExpandedPhases]=useState(()=>{ const m={}; PHASES.forEach(p=>m[p]=true); return m; });
  const [calendarCfg,setCalendarCfg]=useState(()=>{
    try{
      const saved = JSON.parse(localStorage.getItem('mhe6_calendar')||'null');
      if(saved) return saved;
    }catch{}
    return {enabled:true, skipFriSat:true, skipFri:true, skipSat:true, skipHolidays:true, showWeekendShading:true};
  });
  const ganttRef=useRef(null);
  const listRef=useRef(null);
  const fileInputRef=useRef(null);
  const [toast,setToast]=useState(null);
  const [saveStatus,setSaveStatus]=useState('saved');
  const historyRef=useRef({past:[], future:[]});
  const isUndoingRef=useRef(false);

  const rowsMap = useMemo(()=>new Map(rows.map(r=>[r.uid,r])), [rows]);
  const {levelMap, childrenMap} = useMemo(()=>{
    const children = new Map(); const level = new Map();
    rows.forEach(r=>{ if(r.parentUid){ if(!children.has(r.parentUid)) children.set(r.parentUid, []); children.get(r.parentUid).push(r.uid); } });
    const calcLevel = (uid, visited=new Set())=>{
      if(level.has(uid)) return level.get(uid);
      if(visited.has(uid)) return 0; visited.add(uid);
      const row = rowsMap.get(uid);
      if(!row || !row.parentUid) { level.set(uid,0); return 0; }
      const pLevel = calcLevel(row.parentUid, visited);
      const l = pLevel+1; level.set(uid,l); return l;
    };
    rows.forEach(r=>calcLevel(r.uid));
    return {levelMap:level, childrenMap:children};
  }, [rows, rowsMap]);

  const filteredLib = useMemo(()=>{ if(!searchQuery.trim()) return LIB; const q=searchQuery.toLowerCase(); return LIB.filter(x=> x.name.toLowerCase().includes(q) || x.phase.toLowerCase().includes(q)); }, [searchQuery]);
  const groupedLib = useMemo(()=>{ const groups={}; filteredLib.forEach(item=>{ if(!groups[item.phase]) groups[item.phase]=[]; groups[item.phase].push(item); }); return groups; }, [filteredLib]);

  const visibleRowsRaw = useMemo(()=>{
    const collapsedSet = new Set(rows.filter(r=>r.collapsed).map(r=>r.uid));
    const isHidden = (row) => { let p = row.parentUid; let depth=0; while(p && depth<20){ if(collapsedSet.has(p)) return true; const par=rowsMap.get(p); p=par?.parentUid||null; depth++; } return false; };
    return rows.filter(r=>!isHidden(r));
  },[rows, rowsMap]);

  const visibleRows = useMemo(()=>{ if(!showCriticalOnly) return visibleRowsRaw; const cpSet=criticalPath(rows); return visibleRowsRaw.filter(r=>cpSet.has(r.uid) || (r.parentUid && cpSet.has(r.parentUid))); }, [visibleRowsRaw, rows, showCriticalOnly]);

  const dateRange = useMemo(()=>{ if(!rows.length) return {min:'', max:''}; const starts=rows.map(r=>r.start).filter(Boolean).sort(); const ends=rows.map(r=>r.finish).filter(Boolean).sort(); return {min:starts[0]||'', max:ends.at(-1)||''}; }, [rows]);

  useEffect(()=>{ document.title='Hy-Tek Project Scheduler'; },[]);
  const cp=useMemo(()=>criticalPath(rows),[rows]);
  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(null),3500); return()=>clearTimeout(t); },[toast]);
  useEffect(()=>{ if(rows.length===0) setShowOnboarding(true); }, []);

  useEffect(()=>{
    const h=(e)=>{
      if(e.key==='Escape'){ setShowCustomModal(false); setShowOnboarding(false); setShowLegend(false); setShowColumns(false); setShowProjects(false); }
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey){ e.preventDefault(); undo(); }
      if((e.ctrlKey||e.metaKey) && (e.key.toLowerCase()==='y' || (e.shiftKey && e.key.toLowerCase()==='z'))){ e.preventDefault(); redo(); }
      if(e.key==='Delete' && selected.size>0 && !showCustomModal){ e.preventDefault(); bulkDelete(); }
    };
    window.addEventListener('keydown', h);
    return()=>window.removeEventListener('keydown', h);
  }, [rows, selected, showCustomModal]);

  const pushHistory = useCallback((oldRows)=>{ if(isUndoingRef.current) return; if(!oldRows || oldRows.length===0) return; const hist=historyRef.current; hist.past.push(JSON.parse(JSON.stringify(oldRows))); if(hist.past.length>30) hist.past.shift(); hist.future=[]; }, []);
  const undo = useCallback(()=>{ const hist=historyRef.current; if(hist.past.length===0) return; const prev=hist.past.pop(); hist.future.push(JSON.parse(JSON.stringify(rows))); isUndoingRef.current=true; setRows(prev); setTimeout(()=>{ isUndoingRef.current=false; }, 100); setToast({type:'info', msg:'Undid last change (Ctrl+Z)'}); }, [rows]);
  const redo = useCallback(()=>{ const hist=historyRef.current; if(hist.future.length===0) return; const next=hist.future.pop(); hist.past.push(JSON.parse(JSON.stringify(rows))); isUndoingRef.current=true; setRows(next); setTimeout(()=>{ isUndoingRef.current=false; }, 100); setToast({type:'info', msg:'Redid (Ctrl+Y)'}); }, [rows]);

  useEffect(()=>{ setSaveStatus('saving'); const t=setTimeout(()=>{ try{ const prev=JSON.parse(localStorage.getItem('mhe6')||'{}'); localStorage.setItem('mhe6', JSON.stringify({...prev, rows, start, customerName, projectNumber})); localStorage.setItem('mhe6_calendar', JSON.stringify(calendarCfg)); setSaveStatus('saved'); }catch{ setSaveStatus('error'); } }, 800); return()=>clearTimeout(t); }, [rows, start, customerName, projectNumber, calendarCfg]);

  const rowsRef=useRef(rows); useEffect(()=>{ rowsRef.current=rows; },[rows]);
  useEffect(()=>{
    const h=(e)=>{
      const movedUid = e?.detail?.uid;
      const beforeMap = new Map(rowsRef.current.map(r=>[r.uid, {start:r.start, dur:r.duration}]));
      setRows(r=>{
        const scheduled = schedule(r, calendarCfg);
        if(movedUid){
          let changed = 0;
          scheduled.forEach(s=>{ if(s.uid!==movedUid && beforeMap.get(s.uid)?.start!==s.start) changed++; });
          const moved = scheduled.find(s=>s.uid===movedUid);
          const before = beforeMap.get(movedUid);
          const name = moved?.name||'Task';
          if(before && before.dur!==moved?.duration) setToast({type:'success', msg:`Duration ${name} → ${moved.duration}d • ${changed} successors`});
          else if(changed>0) setToast({type:'success', msg:`Moved ${name} + ${changed} successor${changed>1?'s':''}`});
          else if(moved) setToast({type:'info', msg:`Moved ${name}`});
        }
        return scheduled;
      });
    };
    window.addEventListener('gantt-reschedule',h);
    return()=>window.removeEventListener('gantt-reschedule',h);
  },[calendarCfg]);

  const addTask=useCallback(t=>{ pushHistory(rowsRef.current); setRows(r=>schedule([...r,{...t,uid:safeUid(),id:r.length?Math.max(...r.map(x=>+x.id||100))+1:101,start,finish:addWorkDays(start,t.duration-1,calendarCfg,false),preds:[],baseline:'',baselineStart:'',baselineFinish:'',resource:'',supplier:'',area:'Area 1',status:'Not Started', parentUid: null, collapsed:false, criticalOverride:'auto', allowNonWork:false}], calendarCfg)); setToast({type:'success', msg:`Added ${t.name}`}); },[start, pushHistory, calendarCfg]);

  const applyTemplate = useCallback((templateKey)=>{
    const tpl=TEMPLATES[templateKey]; if(!tpl) return;
    if(rows.length>0 && !window.confirm(`Replace current ${rows.length} tasks with "${tpl.name}" template?`)) return;
    pushHistory(rowsRef.current);
    const uidMap=[]; let newRows = tpl.tasks.map((t, idx)=>{ const uid=safeUid(); uidMap[idx]=uid; return {phase:PHASES[t.phase], name:t.name, duration:t.duration, uid, id:101+idx, start:add(start, idx*2), finish:add(start, idx*2 + t.duration -1), preds:[], baseline:'',baselineStart:'',baselineFinish:'',resource:'',supplier:'',area:'Area 1',status:'Not Started', parentUid:null, collapsed:false, isCustom:false, criticalOverride:'auto', allowNonWork:false, _templatePreds:t.preds}; });
    newRows = newRows.map(r=>{ const preds = (r._templatePreds||[]).map(pIdx=> ({uid: uidMap[pIdx], type:'FS', lag:0})); const { _templatePreds, ...rest } = r; return {...rest, preds}; });
    const scheduled = schedule(newRows, calendarCfg);
    setRows(scheduled); setShowOnboarding(false); setToast({type:'success', msg:`Loaded template: ${tpl.name} (${scheduled.length} tasks)`});
  }, [start, rows.length, pushHistory, calendarCfg]);

  const addCustomTask = useCallback(() => {
    if(!customForm.name.trim()){ alert('Enter task name'); return; }
    const parsedDur = parseDurationInput(customForm.duration);
    if(parsedDur==null){ alert(`Invalid duration "${customForm.duration}" - use e.g. 5d or 1w`); return; }
    pushHistory(rowsRef.current);
    const newUid = safeUid();
    const newRow = { phase: customForm.phase, name: customForm.name.trim(), duration: parsedDur, uid: newUid, id: rows.length?Math.max(...rows.map(x=>+x.id||100))+1:101, start, finish: addWorkDays(start, parsedDur-1, calendarCfg, customForm.allowNonWork), preds: customForm.parentUid ? [{uid: customForm.parentUid, type:'SS', lag:0}] : [], baseline:'', baselineStart:'', baselineFinish:'', resource: customForm.resource||'', supplier: customForm.supplier||'', area: customForm.area||'Area 1', status:'Not Started', percentComplete: 0, parentUid: customForm.parentUid||null, collapsed:false, isCustom:true, criticalOverride: customForm.criticalOverride||'auto', allowNonWork: customForm.allowNonWork||false };
    setRows(r=>{
      // If subtask, insert right after parent and its existing children, not at bottom
      if(newRow.parentUid){
        const parentIdx = r.findIndex(x=>x.uid===newRow.parentUid);
        if(parentIdx>=0){
          // Find end of parent's subtree: walk forward while level > parent level
          // Build temporary level map for current rows
          const getLevel = (uid, memo=new Map(), visited=new Set())=>{
            if(memo.has(uid)) return memo.get(uid);
            if(visited.has(uid)) return 0;
            visited.add(uid);
            const row = r.find(x=>x.uid===uid);
            if(!row || !row.parentUid) { memo.set(uid,0); return 0; }
            const pl = getLevel(row.parentUid, memo, visited);
            const l = pl+1; memo.set(uid,l); return l;
          };
          const parentLevel = getLevel(newRow.parentUid);
          let insertAt = parentIdx+1;
          // Collect all descendants of parent in current list
          const levelMemo = new Map();
          for(let i=parentIdx+1;i<r.length;i++){
            const lvl = getLevel(r[i].uid, levelMemo);
            if(lvl <= parentLevel) break; // exited parent's subtree
            insertAt = i+1;
          }
          const newArr = [...r.slice(0, insertAt), newRow, ...r.slice(insertAt)];
          return schedule(newArr, calendarCfg);
        }
      }
      return schedule([...r, newRow], calendarCfg);
    }); 
    setShowCustomModal(false); setCustomForm({name:'', phase:PHASES[0], duration:5, area:'Area 1', resource:'', supplier:'', parentUid:null, criticalOverride:'auto', allowNonWork:false}); setToast({type:'success', msg:`Added ${newRow.parentUid?'sub-task':'task'}: ${newRow.name}`});
  },[customForm, rows, start, pushHistory, calendarCfg]);

  const addSubTask = useCallback((parentUid) => { const parent = rowsMap.get(parentUid); if(!parent){ alert('Parent not found'); return; } setCustomForm({name:'', phase:parent.phase, duration:3, area:parent.area||'Area 1', resource:parent.resource||'', supplier:parent.supplier||'', parentUid, criticalOverride:'auto', allowNonWork:false}); setShowCustomModal(true); },[rowsMap]);
  const insertProcurementTasks = useCallback((tasks) => {
    if(!tasks || tasks.length===0) return;
    pushHistory(rowsRef.current);
    const newRows = tasks.map((t, idx) => {
      const uid = safeUid();
      const id = rows.length ? Math.max(...rows.map(x=>+x.id||100)) + 1 + idx : 101 + idx;
      const dur = Math.max(1, Number(t.duration)||1);
      return {
        phase: t.phase || 'Phase 3: Procurement & Fabrication',
        name: t.name,
        duration: dur,
        uid,
        id,
        start: t.start || start,
        finish: addWorkDays(t.start || start, dur-1, calendarCfg, false),
        preds: [],
        baseline:'', baselineStart:'', baselineFinish:'',
        resource: t.resource || t.vendor || '',
        supplier: t.supplier || t.vendor || '',
        area: t.area || t.vendor || 'Procurement',
        status:'Not Started',
        percentComplete: 0,
        parentUid: null,
        collapsed: false,
        isCustom: true,
        isProcurement: true,
        criticalOverride:'auto',
        allowNonWork:false,
        sourceFile: t.sourceFile || '',
        leadTimeRaw: t.leadTimeRaw || '',
      };
    });
    setRows(r=>schedule([...r, ...newRows], calendarCfg));
    setToast({type:'success', msg:`Added ${newRows.length} procurement tasks from quotes`});
  }, [rows, start, pushHistory, calendarCfg]);
  const toggleCollapse = useCallback((uid) => { setRows(r=>r.map(x=> x.uid===uid ? {...x, collapsed: !x.collapsed} : x)); },[]);
  const toggleSelect = useCallback((uid)=>{ setSelected(prev=>{ const n=new Set(prev); if(n.has(uid)) n.delete(uid); else n.add(uid); return n; }); },[]);
  const toggleSelectAll = useCallback(()=>{ if(selected.size===visibleRows.length) setSelected(new Set()); else setSelected(new Set(visibleRows.map(r=>r.uid))); },[selected, visibleRows]);
  const bulkDelete = useCallback(()=>{ if(selected.size===0) return; if(!window.confirm(`Delete ${selected.size} selected tasks?`)) return; pushHistory(rowsRef.current); setRows(r=>{ const delSet=selected; return schedule(r.filter(y=>!delSet.has(y.uid)).map(y=>({...y,preds:(y.preds||[]).filter(p=>!delSet.has(p.uid)), parentUid: delSet.has(y.parentUid) ? null : y.parentUid})), calendarCfg); }); setSelected(new Set()); setToast({type:'success', msg:`Deleted ${selected.size} tasks`}); },[selected, pushHistory, calendarCfg]);
  const bulkBaseline = useCallback(()=>{ if(selected.size===0) return; pushHistory(rowsRef.current); setRows(r=>r.map(x=> selected.has(x.uid) ? {...x, baselineStart:x.start, baselineFinish:x.finish, baseline:x.start} : x)); setToast({type:'success', msg:`Baselined ${selected.size} tasks`}); },[selected, pushHistory]);
  const bulkMakeSubtask = useCallback((parentUid)=>{
    if(selected.size===0) return;
    if(!parentUid){ alert('Select a parent task'); return; }
    if(selected.has(parentUid)){ alert('Parent cannot be in selected tasks'); return; }
    const isDescendant = (potentialParentUid, childUid, visited=new Set())=>{
      if(visited.has(potentialParentUid)) return false;
      visited.add(potentialParentUid);
      const row = rowsMap.get(potentialParentUid);
      if(!row || !row.parentUid) return false;
      if(row.parentUid===childUid) return true;
      return isDescendant(row.parentUid, childUid, visited);
    };
    for(const selUid of selected){
      if(isDescendant(parentUid, selUid)){ alert('Cannot nest: parent is a descendant of a selected task'); return; }
    }
    pushHistory(rowsRef.current);
    setRows(prev=>{
      const selectedRows = prev.filter(r=>selected.has(r.uid));
      const remaining = prev.filter(r=>!selected.has(r.uid));
      const parentIdx = remaining.findIndex(r=>r.uid===parentUid);
      if(parentIdx<0){ alert('Parent not found'); return prev; }
      const getLevel = (uid, memo=new Map(), visited=new Set())=>{
        if(memo.has(uid)) return memo.get(uid);
        if(visited.has(uid)) return 0; visited.add(uid);
        const row = [...remaining, ...selectedRows].find(x=>x.uid===uid) || rowsMap.get(uid);
        if(!row || !row.parentUid) { memo.set(uid,0); return 0; }
        const pl = getLevel(row.parentUid, memo, visited);
        const l = pl+1; memo.set(uid,l); return l;
      };
      const parentLevel = getLevel(parentUid);
      let insertAt = parentIdx+1;
      const memo = new Map();
      for(let i=parentIdx+1;i<remaining.length;i++){
        const lvl = getLevel(remaining[i].uid, memo);
        if(lvl <= parentLevel) break;
        insertAt = i+1;
      }
      const updatedSelected = selectedRows.map(r=>({
        ...r,
        parentUid: parentUid,
        preds: r.preds?.some(p=>p.uid===parentUid) ? r.preds : [...(r.preds||[]), {uid: parentUid, type:'SS', lag:0}]
      }));
      const newArr = [...remaining.slice(0, insertAt), ...updatedSelected, ...remaining.slice(insertAt)];
      return schedule(newArr, calendarCfg);
    });
    setToast({type:'success', msg:`Nested ${selected.size} tasks under ${rowsMap.get(parentUid)?.name||parentUid}`});
    setSelected(new Set());
  },[selected, pushHistory, calendarCfg, rowsMap]);
  const bulkUpdateDates = useCallback(()=>{
    if(selected.size===0) return;
    if(!bulkStart && !bulkDur) { alert('Enter a start date or duration'); return; }
    const parsedBulkDur = bulkDur ? parseDurationInput(bulkDur) : null;
    if(bulkDur && parsedBulkDur==null){ alert(`Invalid duration "${bulkDur}" - use e.g. 5d or 1w`); return; }
    pushHistory(rowsRef.current);
    setRows(prev=>{
      const newRows = prev.map(r=>{
        if(!selected.has(r.uid)) return r;
        const n = {...r};
        if(bulkStart) n.start = bulkStart;
        if(parsedBulkDur) n.duration = parsedBulkDur;
        if(n.start && /^\d{4}-\d{2}-\d{2}$/.test(n.start)){
          n.finish = addWorkDays(n.start, (Number(n.duration)||1)-1, calendarCfg, n.allowNonWork);
        }
        return n;
      });
      return schedule(newRows, calendarCfg);
    });
    setToast({type:'success', msg:`Updated ${selected.size} tasks`});
  },[selected, bulkStart, bulkDur, pushHistory, calendarCfg]);
  const bulkAddPred = useCallback(()=>{
    if(selected.size===0) return;
    if(!bulkPredUid){ alert('Select a predecessor'); return; }
    if(selected.has(bulkPredUid)){ alert('Cannot be predecessor of itself'); return; }
    pushHistory(rowsRef.current);
    setRows(prev=>{
      const newRows = prev.map(r=>{
        if(!selected.has(r.uid)) return r;
        if((r.preds||[]).some(p=>p.uid===bulkPredUid)) return r;
        return {...r, preds:[...(r.preds||[]), {uid:bulkPredUid, type:bulkPredType, lag:Number(bulkPredLag)||0}]};
      });
      const m=new Map(newRows.map(x=>[x.uid,x]));
      if(cycles(newRows,m)){ setToast({type:'error', msg:'Circular dependency blocked'}); return prev; }
      return schedule(newRows, calendarCfg);
    });
    setToast({type:'success', msg:`Added pred to ${selected.size} tasks`});
  },[selected, bulkPredUid, bulkPredType, bulkPredLag, pushHistory, calendarCfg]);
  const bulkRemoveAllPreds = useCallback(()=>{
    if(selected.size===0) return;
    if(!window.confirm(`Remove ALL preds from ${selected.size} tasks?`)) return;
    pushHistory(rowsRef.current);
    setRows(prev=> schedule(prev.map(r=> selected.has(r.uid) ? {...r, preds:[]} : r), calendarCfg));
    setToast({type:'success', msg:`Cleared preds from ${selected.size} tasks`});
  },[selected, pushHistory, calendarCfg]);
  const bulkRemoveSpecificPred = useCallback(()=>{
    if(!bulkPredUid) return;
    pushHistory(rowsRef.current);
    setRows(prev=> schedule(prev.map(r=> selected.has(r.uid) ? {...r, preds:(r.preds||[]).filter(p=>p.uid!==bulkPredUid)} : r), calendarCfg));
    setToast({type:'success', msg:`Removed pred from ${selected.size} tasks`});
  },[selected, bulkPredUid, pushHistory, calendarCfg]);

    const patch=useCallback((uid,c)=>{
    if(c.name!=null && c.start==null && c.duration==null && c.area==null && c.resource==null && c.supplier==null && c.criticalOverride==null && c.allowNonWork==null && c.percentComplete==null){ setRows(r=> r.map(x=> x.uid===uid ? {...x, ...c} : x)); return; }
    if(c.percentComplete!=null && c.start==null && c.duration==null && c.name==null){
      setRows(r=> r.map(x=> x.uid===uid ? {...x, percentComplete: Math.max(0, Math.min(100, Number(c.percentComplete)||0))} : x)); return;
    }
    pushHistory(rowsRef.current);
    setRows(r=>{ 
      const newRows=r.map(x=>{ 
        if(x.uid!==uid) return x; 
        const n={...x,...c}; 
        if(c.start!=null||c.duration!=null||c.allowNonWork!=null) {
          if(c.start==='' && c.start!==undefined){ n.start=''; n.finish=''; }
          else {
            const allow = c.allowNonWork!=null ? c.allowNonWork : n.allowNonWork;
            if(n.start && /^\d{4}-\d{2}-\d{2}$/.test(n.start)){
              n.finish=addWorkDays(n.start, (Number(n.duration)||1)-1, calendarCfg, allow);
            } else { n.finish = n.finish || ''; }
          }
        }
        return n; 
      }); 
      return schedule(newRows, calendarCfg); 
    });
  },[pushHistory, calendarCfg]);
  const addPred=useCallback((uid,puid,type,lag)=>{ pushHistory(rowsRef.current); setRows(r=>{ const n=r.map(x=>x.uid===uid?{...x,preds:[...(x.preds||[]),{uid:puid,type,lag:+lag||0}]}:x); const m=new Map(n.map(x=>[x.uid,x])); if(cycles(n,m)){ setToast({type:'error', msg:'Circular dependency blocked'}); return r; } return schedule(n, calendarCfg); }); },[pushHistory, calendarCfg]);
  const updatePred=useCallback((uid,puid,field,val)=>{
    pushHistory(rowsRef.current);
    setRows(r=>{
      const n=r.map(x=>{ if(x.uid!==uid) return x; const preds=(x.preds||[]).map(p=> p.uid===puid ? {...p, [field]: field==='lag' ? Number(val)||0 : val } : p); return {...x, preds}; });
      const m=new Map(n.map(x=>[x.uid,x])); if(cycles(n,m)){ setToast({type:'error', msg:'Circular dependency blocked'}); return r; } return schedule(n, calendarCfg);
    });
  },[pushHistory, calendarCfg]);

  const reorderRows = useCallback((fromUid, toUid)=>{
    if(fromUid===toUid) return;
    pushHistory(rowsRef.current);
    setRows(prev=>{
      const fromIdx=prev.findIndex(r=>r.uid===fromUid);
      const toIdx=prev.findIndex(r=>r.uid===toUid);
      if(fromIdx<0 || toIdx<0) return prev;
      const arr=[...prev]; const [moved]=arr.splice(fromIdx,1); arr.splice(toIdx,0,moved); return arr;
    });
  },[pushHistory]);

  const hasBaseline = rows.some(r=>r.baselineStart);
  const setBaseline = useCallback(() => { if(hasBaseline){ if(!window.confirm('Baseline already exists. OVERWRITE with current dates?')) return; } pushHistory(rowsRef.current); setRows(r=>r.map(x=>({...x,baselineStart:x.start,baselineFinish:x.finish,baseline:x.start}))); setToast({type:'success', msg:'Baseline set'}); },[hasBaseline, pushHistory]);
  const clearBaseline = useCallback(() => { if(!hasBaseline) return; if(!window.confirm('Clear baseline?')) return; pushHistory(rowsRef.current); setRows(r=>r.map(x=>({...x,baseline:'',baselineStart:'',baselineFinish:''}))); },[hasBaseline, pushHistory]);

  const todayStr = iso(new Date());
  const filePrefix = `${(customerName||'Customer').replace(/\W+/g,'_')}_${(projectNumber||'Project').replace(/\W+/g,'_')}_${todayStr}`.replace(/_+/g,'_');

  const exportCSV = useCallback(() => {
    const header = ['ID','Task','Phase','Predecessors','Start','Duration','Finish','Progress','Baseline Start','Baseline Finish','Variance Days','Critical','Allow Non-Work','Area','Resource','Supplier','Status'].join(',');
    const lines = rows.map(x=>{ const preds=(x.preds||[]).map(p=>{ const t=rowsMap.get(p.uid); return `${t?.id||'?'}${p.type}${p.lag?`+${p.lag}`:''}`; }).join(';'); const variance=x.baselineStart?diff(x.baselineStart,x.start):''; return [x.id,x.name,x.phase,preds,x.start,x.duration,x.finish,`${x.percentComplete||0}%`,x.baselineStart||'',x.baselineFinish||'',variance,cp.has(x.uid)?'Yes':'No',x.allowNonWork?'Yes':'No',x.area||'',x.resource||'',x.supplier||'',x.status||''].map(esc).join(','); });
    const meta = [`Customer,${esc(customerName||'N/A')}`,`Project Number,${esc(projectNumber||'N/A')}`,`Project Start,${esc(start)}`,`Export Date (Today),${esc(todayStr)}`,`Total Tasks,${rows.length}`,`Critical Path Tasks,${cp.size}`,`Calendar,${esc(calendarCfg.enabled?'Skip Fri/Sat/Holidays':'All days')}`,''].join('\n');
    const blob = meta + '\n' + [header,...lines].join('\n');
    const url=URL.createObjectURL(new Blob([blob],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download=`${filePrefix}_Schedule.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
  },[rows, rowsMap, cp, customerName, projectNumber, start, todayStr, filePrefix, calendarCfg]);

  const exportProjectXML = useCallback(()=>{
    const escXml = (s) => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
    const tasksXml = rows.map(r=>{
      const predsXml = (r.preds||[]).map(p=>`      <Pred uid="${escXml(p.uid)}" type="${escXml(p.type)}" lag="${p.lag||0}" />`).join('\n');
      return `    <Task>
      <UID>${escXml(r.uid)}</UID>
      <ID>${r.id}</ID>
      <Name>${escXml(r.name)}</Name>
      <Phase>${escXml(r.phase)}</Phase>
      <Start>${escXml(r.start)}</Start>
      <Duration>${r.duration}</Duration>
      <Finish>${escXml(r.finish)}</Finish>
      <Area>${escXml(r.area||'')}</Area>
      <Resource>${escXml(r.resource||'')}</Resource>
      <Supplier>${escXml(r.supplier||'')}</Supplier>
      <PercentComplete>${r.percentComplete||0}</PercentComplete>
      <CriticalOverride>${escXml(r.criticalOverride||'auto')}</CriticalOverride>
      <AllowNonWork>${r.allowNonWork?'true':'false'}</AllowNonWork>
      <ParentUID>${escXml(r.parentUid||'')}</ParentUID>
      <Collapsed>${r.collapsed?'true':'false'}</Collapsed>
      <Preds>
${predsXml}
      </Preds>
    </Task>`;
    }).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://mhscheduler.local/project">
  <Meta>
    <Customer>${escXml(customerName)}</Customer>
    <ProjectNumber>${escXml(projectNumber)}</ProjectNumber>
    <Start>${escXml(start)}</Start>
    <ExportDate>${escXml(todayStr)}</ExportDate>
    <Version>4.0</Version>
    <TaskCount>${rows.length}</TaskCount>
    <CriticalCount>${cp.size}</CriticalCount>
  </Meta>
  <CalendarCfg>
    <Enabled>${calendarCfg.enabled?'true':'false'}</Enabled>
    <SkipFri>${calendarCfg.skipFri?'true':'false'}</SkipFri>
    <SkipSat>${calendarCfg.skipSat?'true':'false'}</SkipSat>
    <SkipHolidays>${calendarCfg.skipHolidays?'true':'false'}</SkipHolidays>
    <SkipFriSat>${calendarCfg.skipFriSat?'true':'false'}</SkipFriSat>
  </CalendarCfg>
  <Tasks>
${tasksXml}
  </Tasks>
</Project>`;
    const blob=new Blob([xml],{type:'application/xml'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${filePrefix}_Project.xml`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); setToast({type:'success', msg:'Project XML exported'});
  },[rows, start, customerName, projectNumber, todayStr, filePrefix, calendarCfg, cp]);

  
  const importProjectXML = useCallback((e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const text = reader.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');
        const parseErr = doc.querySelector('parsererror');
        if(parseErr) throw new Error('Invalid XML');
        const getText = (parent, tag) => {
          for(let i=0;i<parent.childNodes.length;i++){
            const ch = parent.childNodes[i];
            if(ch.nodeType===1 && ch.tagName===tag) return ch.textContent || '';
          }
          const el = parent.getElementsByTagName(tag)[0];
          return el?.textContent || '';
        };
        const getDirectText = (parent, tag) => {
          for(let i=0;i<parent.children.length;i++){
            if(parent.children[i].tagName===tag) return parent.children[i].textContent||'';
          }
          return '';
        };
        const extractDate = (s) => {
          if(!s) return '';
          const m = String(s).match(/(\d{4}-\d{2}-\d{2})/);
          return m ? m[1] : '';
        };
        const taskNodes = Array.from(doc.getElementsByTagName('Task')).filter(tn=>{
          const name = getDirectText(tn,'Name') || tn.getElementsByTagName('Name')[0]?.textContent;
          return !!name;
        });
        if(!taskNodes.length) throw new Error('No Tasks found in XML');

        // Build UID map + OutlineLevel + OutlineNumber for header detection
        const externalToInternal = new Map();
        const outlineNumberMap = new Map(); // OutlineNumber string -> internalUid
        const tempRows = taskNodes.map(tn=>{
          const externalUid = (getDirectText(tn,'UID') || getText(tn,'UID') || '').trim();
          const internalUid = externalUid && externalUid.length<40 && !externalUid.includes('-') ? safeUid() : (externalUid || safeUid());
          const isOurFormat = externalUid && externalUid.includes('-') && externalUid.length>20;
          const finalInternal = isOurFormat ? externalUid : internalUid;
          if(externalUid) externalToInternal.set(externalUid, finalInternal);
          const idText = getDirectText(tn,'ID') || getText(tn,'ID');
          if(idText) externalToInternal.set(idText.trim(), finalInternal);
          let outlineLevel = 0;
          const olText = (getDirectText(tn,'OutlineLevel') || getText(tn,'OutlineLevel') || '').trim();
          if(olText!==''){
            const parsed = parseInt(olText,10);
            if(!isNaN(parsed)) outlineLevel = parsed;
          }
          let outlineNumber = (getDirectText(tn,'OutlineNumber') || getText(tn,'OutlineNumber') || getText(tn,'WBS') || '').trim();
          if(outlineNumber){
            outlineNumberMap.set(outlineNumber, finalInternal);
            // Also derive level from outlineNumber dot count if OutlineLevel missing
            if(!olText){
              const parts = outlineNumber.split('.').filter(Boolean);
              outlineLevel = Math.max(0, parts.length-1);
            }
          }
          const isSummary = (getDirectText(tn,'Summary') || getText(tn,'Summary') || getText(tn,'IsSummary') || '').toLowerCase();
          const summaryFlag = isSummary==='1' || isSummary==='true';
          return {tn, externalUid, internalUid: finalInternal, outlineLevel, outlineNumber, isSummary: summaryFlag};
        });
        // Normalize levels: shift so min is 0
        const levels = tempRows.map(r=>r.outlineLevel||0);
        const minLevel = levels.length? Math.min(...levels):0;
        if(minLevel>0){
          tempRows.forEach(r=>r.outlineLevel = (r.outlineLevel||0) - minLevel);
        }
        // Build parent from OutlineNumber first (most reliable), then OutlineLevel stack with gap handling
        const levelStack = [];
        tempRows.forEach(tr=>{
          let parentFromOutline = null;
          // Try OutlineNumber parent: e.g., 1.2.1 -> parent 1.2
          if(tr.outlineNumber && tr.outlineNumber.includes('.')){
            const parentON = tr.outlineNumber.split('.').slice(0,-1).join('.');
            parentFromOutline = outlineNumberMap.get(parentON) || null;
          }
          // Fallback to level stack with gap handling (find nearest lower level)
          if(!parentFromOutline){
            const lvl = tr.outlineLevel||0;
            if(lvl>0){
              for(let l=lvl-1;l>=0;l--){
                if(levelStack[l]){ parentFromOutline = levelStack[l]; break; }
              }
            }
          }
          tr.parentFromOutline = parentFromOutline;
          // Push to stack
          const lvl = tr.outlineLevel||0;
          levelStack[lvl] = tr.internalUid;
          levelStack.length = lvl+1;
        });

        const msLagToDays = (raw)=>{
          if(!raw) return 0;
          let s = String(raw).trim();
          let sign = 1;
          if(s.startsWith('-')){ sign=-1; s=s.substring(1); }
          if(s.includes('P') || s.includes('H') || s.includes('D')){
            let days=0, hours=0, mins=0;
            let dMatch = s.match(/(\d+)D/);
            if(dMatch) days = Number(dMatch[1]||0);
            let hMatch = s.match(/(\d+)H/);
            if(hMatch) hours = Number(hMatch[1]||0);
            let mMatch = s.match(/(\d+)M/);
            if(mMatch) mins = Number(mMatch[1]||0);
            if(!dMatch && !hMatch && !mMatch){
              let num = Number(s);
              if(!isNaN(num)) return sign * num / 4800;
            }
            return sign * (days + hours/8 + mins/480);
          }
          let num = Number(s);
          if(isNaN(num)) return 0;
          return sign * num / 4800; // 4800 tenths = 1 day (8h)
        };

        const importedRows = tempRows.map(({tn, internalUid, parentFromOutline})=>{
          const uid = internalUid;
          const idRaw = getDirectText(tn,'ID') || getText(tn,'ID');
          const id = Number(idRaw) || (tempRows.findIndex(r=>r.internalUid===uid)+1);
          const name = (getDirectText(tn,'Name') || getText(tn,'Name') || 'Unnamed').trim();
          const phase = (getDirectText(tn,'Phase') || getText(tn,'Phase') || PHASES[0]).trim();
          let startVal = extractDate(getDirectText(tn,'Start') || getText(tn,'Start'));
          let finishVal = extractDate(getDirectText(tn,'Finish') || getText(tn,'Finish'));
          const durText = getDirectText(tn,'Duration') || getText(tn,'Duration') || '';
          let duration = 1;
          if(durText){
            let s = String(durText).trim();
            if(s.includes('P') || s.includes('H') || s.includes('D')){
              let days=0, hours=0;
              let dMatch = s.match(/(\d+)D/);
              if(dMatch) days = Number(dMatch[1]||0);
              let hMatch = s.match(/(\d+)H/);
              if(hMatch) hours = Number(hMatch[1]||0);
              let mMatch = s.match(/(\d+)M/);
              let mins = mMatch ? Number(mMatch[1]||0) : 0;
              let total = days + hours/8 + mins/480;
              duration = Math.max(1, Math.round(total));
            } else {
              let num = Number(s.match(/-?\d+(\.\d+)?/)?.[0]||'1');
              if(num>1000) num = num/4800;
              duration = Math.max(1, Math.round(num));
            }
          }
          const area = (getDirectText(tn,'Area') || getText(tn,'Area') || '').trim();
          const resource = (getDirectText(tn,'Resource') || getText(tn,'Resource') || getText(tn,'ResourceNames') || '').trim();
          const supplier = (getDirectText(tn,'Supplier') || getText(tn,'Supplier') || '').trim();
          const percentComplete = Number(getDirectText(tn,'PercentComplete') || getText(tn,'PercentWorkComplete') || getText(tn,'PercentComplete') || 0) || 0;
          const criticalOverride = (getDirectText(tn,'CriticalOverride') || getText(tn,'CriticalOverride') || 'auto').trim() || 'auto';
          const allowNonWork = (getDirectText(tn,'AllowNonWork') || getText(tn,'AllowNonWork') || '').toLowerCase() === 'true';
          const parentUidRaw = (getDirectText(tn,'ParentUID') || getText(tn,'ParentUID') || '').trim();
          let parentUid = parentUidRaw ? (externalToInternal.get(parentUidRaw) || parentUidRaw) : null;
          if(!parentUid && parentFromOutline) parentUid = parentFromOutline;
          const collapsed = (getDirectText(tn,'Collapsed') || getText(tn,'Collapsed') || '').toLowerCase() === 'true';
          let preds = [];
          const ourPreds = Array.from(tn.getElementsByTagName('Pred'));
          if(ourPreds.length){
            preds = ourPreds.map(pn=>{
              const rawUid = pn.getAttribute('uid') || pn.getAttribute('UID') || '';
              const mapped = externalToInternal.get(rawUid) || rawUid;
              return {uid: mapped, type: (pn.getAttribute('type')||'FS').toUpperCase(), lag: Number(pn.getAttribute('lag')||0)||0};
            }).filter(p=>p.uid);
          }
          const msPreds = Array.from(tn.getElementsByTagName('PredecessorLink'));
          if(msPreds.length){
            const msParsed = msPreds.map(pl=>{
              const predUidRaw = (pl.getElementsByTagName('PredecessorUID')[0]?.textContent || '').trim();
              const typeRaw = (pl.getElementsByTagName('Type')[0]?.textContent || '1').trim();
              const lagRaw = (pl.getElementsByTagName('LinkLag')[0]?.textContent || '0').trim();
              let type='FS';
              if(typeRaw==='0'||typeRaw==='1') type='FS';
              else if(typeRaw==='2') type='SS';
              else if(typeRaw==='3') type='FF';
              else if(typeRaw==='4') type='SF';
              else if(['FS','SS','FF','SF'].includes(typeRaw.toUpperCase())) type=typeRaw.toUpperCase();
              const mappedUid = externalToInternal.get(predUidRaw) || predUidRaw;
              let lagDays = msLagToDays(lagRaw);
              lagDays = Math.round(lagDays*2)/2;
              return {uid: mappedUid, type, lag: lagDays};
            }).filter(p=>p.uid);
            preds = [...preds, ...msParsed];
          }
          const seen=new Set(); preds=preds.filter(p=>{if(seen.has(p.uid)) return false; seen.add(p.uid); return true;});
          let finalFinish = finishVal;
          if(!finalFinish && startVal && /^\d{4}-\d{2}-\d{2}$/.test(startVal)){
            try{ finalFinish = addWorkDays(startVal, duration-1, calendarCfg, allowNonWork); }catch{ finalFinish='';}
          }
          return {uid, id, name, phase, start: startVal, duration, finish: finalFinish, area, resource, supplier, percentComplete, criticalOverride, allowNonWork, parentUid: parentUid||null, collapsed, preds, baseline:'', baselineStart:'', baselineFinish:'', isCustom:true};
        });
        if(importedRows.length>0 && rows.length>0 && !window.confirm(`Import ${importedRows.length} tasks from XML? This will replace current ${rows.length} tasks.`)) return;
        pushHistory(rowsRef.current);
        // Expand all summary tasks by default
        const fixed = importedRows.map(r=>({...r, collapsed:false}));
        setRows(schedule(fixed, calendarCfg));
        const metaStart = extractDate(doc.getElementsByTagName('StartDate')[0]?.textContent||'') || importedRows.find(r=>r.start)?.start || '';
        if(metaStart) setStart(metaStart);
        setToast({type:'success', msg:`Imported ${importedRows.length} tasks with ${importedRows.filter(r=>r.parentUid).length} subtasks, ${importedRows.reduce((s,r)=>s+(r.preds?.length||0),0)} preds`});
      }catch(err){ console.error(err); setToast({type:'error', msg:`Import failed: ${err.message}`}); }
    };
    reader.readAsText(file);
    e.target.value='';
  },[rows.length, pushHistory, calendarCfg]);


  // ===== Saved Projects (right drawer) =====
  const persistSavedProjects = useCallback((list)=>{
    try{ localStorage.setItem('mhe_saved_projects', JSON.stringify(list)); }catch{}
  },[]);
  const saveCurrentProject = useCallback((customName)=>{
    const name = (customName || `${customerName||'Project'} - ${projectNumber||todayStr} ${new Date().toLocaleTimeString()}`.trim()).slice(0,80);
    if(!name) return;
    const now = new Date().toISOString();
    const entry = {
      id: safeUid(),
      name,
      customerName, projectNumber, start,
      rows,
      taskCount: rows.length,
      criticalCount: cp.size,
      savedAt: now,
      displayDate: todayStr,
      calendarCfg,
    };
    setSavedProjects(prev=>{
      const existingIdx = prev.findIndex(p=>p.name===name);
      let next;
      if(existingIdx>=0){
        if(!window.confirm(`Project "${name}" already exists. Overwrite?`)) return prev;
        next = [...prev]; next[existingIdx]=entry;
      } else {
        next = [entry, ...prev].slice(0,50);
      }
      persistSavedProjects(next);
      return next;
    });
    setToast({type:'success', msg:`Saved "${name}"`});
  },[customerName, projectNumber, start, rows, cp, todayStr, persistSavedProjects, calendarCfg]);
  const saveCurrentPrompt = useCallback(()=>{
    const def = `${customerName||'My Project'} ${projectNumber?`#${projectNumber}`:''}`.trim();
    const name = window.prompt('Save project as:', def);
    if(name) saveCurrentProject(name);
  },[customerName, projectNumber, saveCurrentProject]);
  const loadSavedProject = useCallback((id)=>{
    const proj = savedProjects.find(p=>p.id===id);
    if(!proj) return;
    if(rows.length>0 && !window.confirm(`Load "${proj.name}"? This will replace current ${rows.length} tasks.`)) return;
    pushHistory(rowsRef.current);
    const fixed = (proj.rows||[]).map(r=>({...r, allowNonWork: r.allowNonWork||false, criticalOverride: r.criticalOverride||'auto'}));
    setRows(schedule(fixed, proj.calendarCfg||calendarCfg));
    if(proj.start) setStart(proj.start);
    if(proj.customerName) setCustomerName(proj.customerName);
    if(proj.projectNumber) setProjectNumber(proj.projectNumber);
    if(proj.calendarCfg) setCalendarCfg(proj.calendarCfg);
    setShowProjects(false);
    setToast({type:'success', msg:`Loaded "${proj.name}" (${proj.rows?.length||0} tasks)`});
  },[savedProjects, rows.length, pushHistory, calendarCfg]);
  const deleteSavedProject = useCallback((id)=>{
    const proj = savedProjects.find(p=>p.id===id);
    if(!proj) return;
    if(!window.confirm(`Delete saved project "${proj.name}"?`)) return;
    setSavedProjects(prev=>{ const next=prev.filter(p=>p.id!==id); persistSavedProjects(next); return next; });
    setToast({type:'info', msg:`Deleted "${proj.name}"`});
  },[savedProjects, persistSavedProjects]);
  const duplicateSavedProject = useCallback((id)=>{
    const proj = savedProjects.find(p=>p.id===id);
    if(!proj) return;
    const entry = {...proj, id:safeUid(), name: `${proj.name} copy`, savedAt: new Date().toISOString()};
    setSavedProjects(prev=>{ const next=[entry, ...prev].slice(0,50); persistSavedProjects(next); return next; });
  },[savedProjects, persistSavedProjects]);

  const resetCurrentSchedule = useCallback(()=>{
    if(rows.length===0){ setToast({type:'info', msg:'Schedule already empty'}); return; }
    if(!window.confirm(`Reset schedule? This will clear all ${rows.length} tasks and cannot be undone (use Undo to restore).`)) return;
    pushHistory(rowsRef.current);
    setRows([]);
    setSelected(new Set());
    setToast({type:'success', msg:`Schedule cleared - ${rows.length} tasks removed`});
  },[rows.length, pushHistory]);

  const exportList = useCallback(async (kind) => {
    const el = listRef.current; if(!el){ setToast({type:'error', msg:'Switch to List view first'}); return; }
    if(kind==='pdf'){
      const { jsPDF: JSPDF } = await import('jspdf');
      const pdf=new JSPDF({orientation:'landscape',unit:'pt',format:'a4'});
      const pageW = pdf.internal.pageSize.getWidth(); const pageH = pdf.internal.pageSize.getHeight(); const margin=20; const headerH=32;
      const drawHeader = (pageTitle) => {
        pdf.setFillColor(10,35,66); pdf.rect(0,0,pageW,headerH,'F'); pdf.setFontSize(11); pdf.setTextColor(255,255,255); pdf.setFont(undefined,'bold');
        pdf.text(pageTitle, margin, 20);
      };
      drawHeader(`MH Scheduler - List - ${customerName||'N/A'} | ${projectNumber||'N/A'} | ${todayStr} | ${rows.length} tasks`);
      let y=headerH+16; pdf.setFontSize(8); pdf.setTextColor(10,35,66);
      const cols = [
        {w:28, label:'ID', get: r=> String(r.id)},
        {w:260, label:'Task', get: r=> { 
          const lvl=levelMap.get(r.uid)||0; 
          const isHeader = rows.some(child=>child.parentUid===r.uid);
          if(isHeader && lvl===0) return r.name;
          if(isHeader) return '  '.repeat(lvl-1) + (lvl>0?'■ ':'') + r.name;
          const indent = lvl>0 ? '  '.repeat(lvl) + '- ' : ''; 
          return indent + r.name; 
        }},
        {w:45, label:'Phase', get: r=> r.phase.split(':')[0]},
        {w:50, label:'Preds', get: r=> (r.preds||[]).map(p=>{ const t=rowsMap.get(p.uid); return t?`${t.id}${p.type}${p.lag? (p.lag>0?`+${p.lag}`:p.lag):''}`:''; }).join(',')},
        {w:55, label:'Start', get: r=> r.start},
        {w:22, label:'Dur', get: r=> String(r.duration)},
        {w:55, label:'Finish', get: r=> r.finish},
        {w:30, label:'Prog', get: r=> `${r.percentComplete||0}%`},
        {w:40, label:'Area', get: r=> r.area||''},
      ];
      const totalW = cols.reduce((s,c)=>s+c.w,0);
      const renderColHeader = () => {
        let x=margin; pdf.setFont(undefined,'bold'); pdf.setFontSize(8);
        cols.forEach(c=>{ pdf.text(c.label, x, y); x+=c.w; });
        y+=10; pdf.setDrawColor(220); pdf.line(margin, y, margin+totalW, y); y+=6; pdf.setFont(undefined,'normal');
      };
      renderColHeader();
      const rowH=14; const maxY = pageH - margin - 12;
      // Fit text to column width using actual text width measurement (no unicode)
      const fitText = (txt, colW) => {
        let t = String(txt||'').replace(/[^\x20-\x7E]/g, '').replace(/  +/g,' ').trim(); // strip non-ascii like ↳
        if(pdf.getTextWidth(t) <= colW - 4) return t;
        while(t.length>0 && pdf.getTextWidth(t + '...') > colW - 4){ t = t.slice(0,-1); }
        return t.length>0 ? t + '...' : '';
      };
      // Build children map for header detection
      const pdfChildrenMap = new Map();
      rows.forEach(row=>{ if(row.parentUid){ if(!pdfChildrenMap.has(row.parentUid)) pdfChildrenMap.set(row.parentUid, []); pdfChildrenMap.get(row.parentUid).push(row.uid); } });
      rows.forEach((r, idx)=>{
        if(y+rowH>maxY){
          pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`Page ${pdf.getNumberOfPages()} - ${rows.length} tasks total`, margin, pageH-8);
          pdf.addPage(); y=headerH+16; drawHeader(`List continued - Page ${pdf.getNumberOfPages()+1} - ${customerName||'N/A'} | ${projectNumber||'N/A'}`); y=headerH+16; pdf.setTextColor(10,35,66); renderColHeader();
        }
        let x=margin;
        const isCritical = cp.has(r.uid);
        const isHeader = pdfChildrenMap.has(r.uid) && pdfChildrenMap.get(r.uid).length>0;
        const level = levelMap.get(r.uid)||0;
        // Header styling: summary tasks get colored background
        if(isHeader){
          if(level===0){
            pdf.setFillColor(10,35,66); pdf.setTextColor(255,255,255);
            pdf.rect(margin, y-9, totalW, rowH, 'F');
          } else if(level===1){
            pdf.setFillColor(220, 235, 255); // light blue for second-level headers like Engineering
            pdf.rect(margin, y-9, totalW, rowH, 'F');
          } else {
            pdf.setFillColor(235, 240, 255);
            pdf.rect(margin, y-9, totalW, rowH, 'F');
          }
        } else {
          if(isCritical){ pdf.setFillColor(255,240,235); pdf.rect(margin, y-9, totalW, rowH, 'F'); }
          if(idx%2===0 && !isHeader){ pdf.setFillColor(248,250,255); pdf.rect(margin, y-9, totalW, rowH, 'F'); }
        }
        // Font: bold for headers
        if(isHeader){
          pdf.setFont(undefined,'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(level===0?255:10, level===0?255:35, level===0?255:66);
        } else {
          pdf.setFont(undefined,'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(10,35,66);
        }
        cols.forEach((c, colIdx)=>{
          const raw = c.get(r) || '';
          let val = fitText(raw, c.w);
          pdf.text(val, x, y);
          x+=c.w;
        });
        y+=rowH;
      });
      pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`Exported ${todayStr} - Calendar: ${calendarCfg.enabled?'Skip Fri/Sat/Hols':'All days'}`, margin, pageH-8);
      pdf.save(`${filePrefix}_List.pdf`); return;
    }
    const TASKS_PER_PNG = 28;
    const totalPngChunks = Math.max(1, Math.ceil(rows.length / TASKS_PER_PNG));
    const drawListChunk = (chunkIdx) => {
      const sIdx = chunkIdx*TASKS_PER_PNG; const eIdx = Math.min(rows.length, sIdx+TASKS_PER_PNG);
      const chunkRows = rows.slice(sIdx, eIdx);
      const W = 1300; const H = 40 + 32 + chunkRows.length*36 + 20;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#0A2342'; ctx.fillRect(0,0,W,36);
      ctx.fillStyle='#fff'; ctx.font='bold 12px Inter'; ctx.fillText(`MH Scheduler - List - ${customerName||'N/A'} - ${projectNumber||'N/A'} | ${todayStr} | ${rows.length} tasks | Page ${chunkIdx+1}/${totalPngChunks}`, 12, 22);
      ctx.fillStyle='#F1F5F9'; ctx.fillRect(0,36,W,28); ctx.fillStyle='#0A2342'; ctx.font='bold 10px Inter';
      const cols = [{x:10,w:35,l:'ID'},{x:45,w:260,l:'Task'},{x:305,w:60,l:'Phase'},{x:365,w:70,l:'Preds'},{x:435,w:70,l:'Start'},{x:505,w:30,l:'Dur'},{x:535,w:70,l:'Finish'},{x:605,w:40,l:'Prog'},{x:645,w:70,l:'Area'}];
      cols.forEach(col=>{ ctx.fillText(col.l, col.x, 54); });
      ctx.strokeStyle='#DCE6F2'; ctx.beginPath(); ctx.moveTo(0,64); ctx.lineTo(W,64); ctx.stroke();
      chunkRows.forEach((r,i)=>{
        const y = 64 + i*36;
        ctx.fillStyle = i%2===0 ? '#fff' : '#F8FAFF'; ctx.fillRect(0,y,W,36);
        const level = levelMap.get(r.uid)||0;
        ctx.fillStyle='#0A2342'; ctx.font='11px Inter';
        ctx.fillText(String(r.id), cols[0].x, y+22);
        ctx.fillText((level>0?'  '.repeat(level)+'↳ ':'')+r.name.slice(0,45), cols[1].x, y+22);
        ctx.fillText(r.phase.split(':')[0], cols[2].x, y+22);
        ctx.fillText((r.preds||[]).map(p=>rowsMap.get(p.uid)?.id||'?').join(','), cols[3].x, y+22);
        ctx.fillText(r.start, cols[4].x, y+22);
        ctx.fillText(String(r.duration), cols[5].x, y+22);
        ctx.fillText(r.finish, cols[6].x, y+22);
        ctx.fillText(r.area||'', cols[7].x, y+22);
        ctx.strokeStyle='#EEF3FA'; ctx.beginPath(); ctx.moveTo(0,y+36); ctx.lineTo(W,y+36); ctx.stroke();
      });
      return c;
    };
    for(let i=0;i<totalPngChunks;i++){
      const c = drawListChunk(i);
      const url = c.toDataURL('image/png');
      const a = document.createElement('a'); a.href=url; a.download=`${filePrefix}_List${totalPngChunks>1?`_P${i+1}`:''}.png`; a.click();
      await new Promise(r=>setTimeout(r, 300));
    }
  }, [rows, levelMap, rowsMap, customerName, projectNumber, todayStr, filePrefix]);


  const exportGantt = useCallback(async (kind) => {
    const el = ganttRef.current?.querySelector?.('.ganttViewport') || ganttRef.current?.querySelector?.('.ganttShell') || ganttRef.current;
    if(!el){ setToast({type:'error', msg:'Switch to Gantt view first'}); return; }
    if(kind==='pdf'){
      try{
        const { jsPDF: JSPDF } = await import('jspdf');
        const pdf = new JSPDF({orientation:'landscape', unit:'pt', format:'a3'});
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin=24;
        const headerH=28;
        // Header on each page
        const drawHeader = (title)=>{
          pdf.setFillColor(10,35,66); pdf.rect(0,0,pageW,headerH,'F');
          pdf.setFontSize(10); pdf.setTextColor(255,255,255); pdf.setFont(undefined,'bold');
          pdf.text(title, margin, 18);
        };
        drawHeader(`MH Scheduler - Gantt - ${customerName||'N/A'} | ${projectNumber||'N/A'} | ${todayStr} | ${rows.length} tasks | Critical ${cp.size}`);

        // Calculate timeline range from actual tasks
        const validStarts = rows.map(r=>r.start).filter(s=>s && /^\d{4}-\d{2}-\d{2}$/.test(s)).sort();
        const validEnds = rows.map(r=>r.finish).filter(s=>s && /^\d{4}-\d{2}-\d{2}$/.test(s)).sort();
        let tStartStr = validStarts[0] || start;
        let tEndStr = validEnds[validEnds.length-1] || '';
        if(!tEndStr){
          const last = rows[rows.length-1];
          tEndStr = last?.finish || '';
        }
        const asDate = (s)=>{ const d=new Date(s); d.setHours(0,0,0,0); return d; };
        const toIso = (d)=> d.toISOString().slice(0,10);
        const dayDiff = (a,b)=> Math.round((asDate(b)-asDate(a))/86400000);
        const minD = asDate(tStartStr); minD.setDate(minD.getDate()-2);
        const maxD = tEndStr ? asDate(tEndStr) : new Date(minD); maxD.setDate(maxD.getDate()+90);
        if(maxD<=minD) maxD.setDate(minD.getDate()+60);
        const totalDays = dayDiff(toIso(minD), toIso(maxD))+1;

        const tableLeftW = 260;
        const usableW = pageW - margin*2;
        const usableH = pageH - headerH - 30;
        const timelineW = usableW - tableLeftW - 10;
        const pxPerDay = timelineW / totalDays;

        // Build months for timeline header
        const months = [];
        {
          let cur = new Date(minD);
          cur.setDate(1);
          while(cur <= maxD){
            const monthKey = cur.toLocaleDateString('en-US',{month:'short', year:'numeric'});
            const monthStart = new Date(cur);
            const monthEnd = new Date(cur.getFullYear(), cur.getMonth()+1, 0);
            const startDay = Math.max(0, dayDiff(toIso(minD), toIso(monthStart)));
            const endDay = Math.min(totalDays-1, dayDiff(toIso(minD), toIso(monthEnd)));
            const count = endDay - startDay + 1;
            if(count>0) months.push({key: monthKey, start: startDay, count});
            cur.setMonth(cur.getMonth()+1);
          }
        }

        // Column headers + month headers
        let y = headerH+16;
        pdf.setFontSize(7); pdf.setTextColor(10,35,66); pdf.setFont(undefined,'bold');
        pdf.text('Task', margin, y);
        // Draw months
        pdf.setFontSize(6);
        months.forEach(m=>{
          const mx = margin+tableLeftW + m.start*pxPerDay;
          const mw = m.count*pxPerDay;
          if(mw<15) return; // skip tiny
          pdf.setFillColor(240,245,255);
          pdf.rect(mx, y-8, mw, 10, 'F');
          pdf.setDrawColor(220); pdf.rect(mx, y-8, mw, 10, 'S');
          pdf.setTextColor(10,35,66);
          let label = m.key;
          if(mw<40) label = label.split(' ')[0]; // just month short if narrow
          pdf.text(label, mx+2, y);
        });
        y+=8;
        pdf.setDrawColor(220); pdf.line(margin, y, pageW-margin, y); y+=6;
        pdf.setFont(undefined,'normal');

        const rowH = 12;
        const maxY = pageH - 20;
        let pageIdx=1;

        // Precompute level for indent
        const getLevel = (uid)=>{
          try{ return levelMap.get(uid)||0; }catch{ return 0; }
        };

        for(let i=0;i<rows.length;i++){
          if(y+rowH>maxY){
            pdf.setFontSize(7); pdf.setTextColor(120);
            pdf.text(`Page ${pageIdx} - ${rows.length} tasks`, margin, pageH-8);
            pdf.addPage();
            pageIdx++;
            drawHeader(`Gantt continued - Page ${pageIdx} - ${customerName||'N/A'} | ${projectNumber||'N/A'}`);
            y=headerH+16;
            pdf.setFontSize(7); pdf.setTextColor(10,35,66); pdf.setFont(undefined,'bold');
            pdf.text('Task', margin, y);
            pdf.setFontSize(6);
            months.forEach(m=>{
              const mx = margin+tableLeftW + m.start*pxPerDay;
              const mw = m.count*pxPerDay;
              if(mw<15) return;
              pdf.setFillColor(240,245,255);
              pdf.rect(mx, y-8, mw, 10, 'F');
              pdf.setDrawColor(220); pdf.rect(mx, y-8, mw, 10, 'S');
              pdf.setTextColor(10,35,66);
              let label = m.key;
              if(mw<40) label = label.split(' ')[0];
              pdf.text(label, mx+2, y);
            });
            y+=8;
            pdf.setDrawColor(220); pdf.line(margin, y, pageW-margin, y); y+=6;
            pdf.setFont(undefined,'normal');
          }
          const r = rows[i];
          const lvl = getLevel(r.uid);
          const isCritical = cp.has(r.uid);
          // Zebra
          if(i%2===0){ pdf.setFillColor(248,250,255); pdf.rect(margin, y-8, usableW, rowH, 'F'); }
          if(isCritical){ pdf.setFillColor(255,240,235); pdf.rect(margin, y-8, usableW, rowH, 'F'); }

          // Task name truncated
          pdf.setFontSize(6.5); pdf.setTextColor(10,35,66);
          let name = r.name||'';
          if(lvl>0) name = '  '.repeat(lvl)+'- '+name;
          if(name.length>45) name = name.slice(0,42)+'...';
          pdf.text(`${r.id} ${name} (${r.percentComplete||0}%)`, margin+2, y);

          // Bar
          if(r.start && /^\d{4}-\d{2}-\d{2}$/.test(r.start) && r.finish && /^\d{4}-\d{2}-\d{2}$/.test(r.finish)){
            const x1 = margin+tableLeftW + dayDiff(toIso(minD), r.start)*pxPerDay;
            const x2 = margin+tableLeftW + (dayDiff(toIso(minD), r.finish)+1)*pxPerDay;
            const barW = Math.max(2, x2-x1);
            const barY = y-7;
            const barH = 6;
            // Bar background
            pdf.setFillColor(isCritical? 255: 200, isCritical? 106: 220, isCritical? 53: 255);
            if(!isCritical) pdf.setFillColor(186, 210, 255);
            if(r.parentUid) pdf.setFillColor(220, 230, 245); // lighter for summary children? keep
            if(r.percentComplete>=100) pdf.setFillColor(22,163,74);
            pdf.rect(x1, barY, barW, barH, 'F');
            // Progress overlay
            if(r.percentComplete>0 && r.percentComplete<100){
              pdf.setFillColor(22,163,74);
              pdf.rect(x1, barY+barH-2, barW*(r.percentComplete/100), 2, 'F');
            }
          }
          y+=rowH;
        }
        pdf.setFontSize(7); pdf.setTextColor(100,116,139);
        pdf.text(`Calendar: ${calendarCfg.enabled?'Skip Fri/Sat/Hols':'All days'} | Start ${start} | Exported ${todayStr} | Timeline ${toIso(minD)} to ${toIso(maxD)} | ${rows.length} tasks`, margin, pageH-10);
        pdf.save(`${filePrefix}_Gantt.pdf`);
        setToast({type:'success', msg:'Gantt PDF exported (~1-2 MB)'});
      }catch(err){
        console.error(err);
        setToast({type:'error', msg:`Gantt PDF export failed: ${err.message}`});
      }
      return;
    }
    // PNG export - compressed JPEG to keep size small
    try{
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale:1, 
        useCORS:true, 
        backgroundColor:'#fff', 
        scrollX: -el.scrollLeft, 
        scrollY: -el.scrollTop, 
        windowWidth: el.scrollWidth, 
        windowHeight: Math.min(el.scrollHeight, 4000), // cap height to avoid huge image
        logging:false
      });
      // Use JPEG with 0.75 quality = ~90% smaller than PNG
      const url=canvas.toDataURL('image/jpeg', 0.75);
      const a=document.createElement('a'); a.href=url; a.download=`${filePrefix}_Gantt.jpg`; a.click();
      const sizeMB = (url.length*0.75/1024/1024).toFixed(1);
      setToast({type:'success', msg:`Gantt JPG exported (~${sizeMB} MB)`});
    }catch(err){ setToast({type:'error', msg:`Gantt export failed: ${err.message}. Try PDF.`}); }
  }, [customerName, projectNumber, todayStr, rows.length, cp.size, start, filePrefix, calendarCfg, levelMap]);


  const canUndo = historyRef.current.past.length>0;
  const canRedo = historyRef.current.future.length>0;

  return (
    <div className="app soft">
      <input type="file" ref={fileInputRef} accept=".xml" accept=".xml,.mpp.xml" style={{display:'none'}} onChange={importProjectXML} />
      <header className="newHeader">
        <div className="headerTop">
          <div className="brandRow">
            <div className="logo">Hy-Tek Project Scheduler</div>
            <div className="saveStatusDot"><span className={`dot ${saveStatus}`}></span>{saveStatus==='saving'?'Saving...':saveStatus==='saved'?'✓ Saved':'Error'}</div>
            <div className="undoRedo">
              <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={14}/></button>
              <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"><Redo2 size={14}/></button>
            </div>
          </div>
          <div className="projectMeta">
            <div className="field"><label>Customer</label><input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Customer Name" /></div>
            <div className="field"><label>Project #</label><input value={projectNumber} onChange={e=>setProjectNumber(e.target.value)} placeholder="HT-2026-001" /></div>
            <div className="field"><label>Start</label><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div>
          </div>
        </div>
        <div className="headerBottom">
          <div className="headerLeft">
            <div className="viewToggle">
              <button onClick={()=>setView('list')} className={view==='list'?'on':''}><List size={14}/>List</button>
              <button onClick={()=>setView('gantt')} className={view==='gantt'?'on':''}><BarChart3 size={14}/>Gantt</button>
            </div>
            <div className="zoomGroup">
              <button className={zoomLevel==='months'?'on':''} onClick={()=>setZoomLevel('months')} title="Months view">M</button>
              <button className={zoomLevel==='weeks'?'on':''} onClick={()=>setZoomLevel('weeks')} title="Weeks view">W</button>
              <button className={zoomLevel==='days'?'on':''} onClick={()=>setZoomLevel('days')} title="Days view">D</button>
              <button className={zoomLevel==='detailed'?'on':''} onClick={()=>setZoomLevel('detailed')} title="Detailed 72px">D+</button>
            </div>
            <button onClick={()=>setShowCriticalOnly(!showCriticalOnly)} className={showCriticalOnly?'on criticalOn':''} title="Show only critical path"><Filter size={13}/>{showCriticalOnly?'Critical':'All'}</button>
            <button onClick={()=>setShowLegend(!showLegend)} className={showLegend?'on':''} title="Phase legend"><Info size={14}/>Legend</button>
            <div className="calendarToggleGroup">
              <button onClick={()=>{ const next={...calendarCfg, enabled:!calendarCfg.enabled}; setCalendarCfg(next); setRows(r=>schedule(r, next)); setToast({type:'info', msg: next.enabled?'Calendar: Skipping Fri/Sat/Holidays':'Calendar: All days allowed (override)'}); }} className={calendarCfg.enabled?'on calendarOn':'calendarOff'} title={calendarCfg.enabled?'Skipping Fri/Sat/Federal Holidays - Click to override and allow all days':'All days allowed - Click to re-enable skipping'}>
                {calendarCfg.enabled ? <><CalendarOff size={13}/>Skip Fri/Sat/Hols</> : <><CalendarCheck size={13}/>All Days</>}
              </button>
              {calendarCfg.enabled && (
                <div className="calendarDetails">
                  <label title="Skip Fridays"><input type="checkbox" checked={calendarCfg.skipFri} onChange={e=>{ const next={...calendarCfg, skipFri:e.target.checked, skipFriSat: e.target.checked || calendarCfg.skipSat}; setCalendarCfg(next); setRows(r=>schedule(r,next)); }} />Fri</label>
                  <label title="Skip Saturdays"><input type="checkbox" checked={calendarCfg.skipSat} onChange={e=>{ const next={...calendarCfg, skipSat:e.target.checked, skipFriSat: calendarCfg.skipFri || e.target.checked}; setCalendarCfg(next); setRows(r=>schedule(r,next)); }} />Sat</label>
                  <label title="Skip Federal Holidays"><input type="checkbox" checked={calendarCfg.skipHolidays} onChange={e=>{ const next={...calendarCfg, skipHolidays:e.target.checked}; setCalendarCfg(next); setRows(r=>schedule(r,next)); }} />Hols</label>
                </div>
              )}
            </div>
          </div>
          <div className="headerCenter">
            {selected.size>0 && (
              <div className="bulkBar" style={{flexWrap:'wrap', gap:6}}>
                <span><CheckSquare size={12}/>{selected.size} selected</span>
                <button onClick={bulkDelete} className="dangerSmall"><Trash2 size={12}/>Delete</button>
                <button onClick={bulkBaseline} className="small"><Save size={12}/>Baseline</button>
                <div style={{width:1,height:16,background:'#DCE6F2', margin:'0 4px'}}></div>
                <input type="date" value={bulkStart} onChange={e=>setBulkStart(e.target.value)} style={{fontSize:11, padding:'4px 6px', borderRadius:6, border:'1px solid #DCE6F2', width:125}} title="Bulk start date"/>
                <input type="text" placeholder="5d/1w" value={bulkDur} onChange={e=>setBulkDur(e.target.value)} style={{fontSize:11, padding:'4px 6px', borderRadius:6, border:'1px solid #DCE6F2', width:70}} title="Bulk duration - e.g. 5d or 1w (1w=5 work days)"/>
                <button onClick={bulkUpdateDates} className="small" style={{background:'#0A2342', color:'#fff'}}><Calendar size={12}/>Apply</button>
                <div style={{width:1,height:16,background:'#DCE6F2', margin:'0 4px'}}></div>
                <select value={bulkParentUid} onChange={e=>setBulkParentUid(e.target.value)} style={{fontSize:11, padding:'4px 6px', borderRadius:6, border:'1px solid #DCE6F2', maxWidth:140}}>
                  <option value="">Nest under...</option>
                  {rows.filter(r=>!selected.has(r.uid)).map(r=>(
                    <option key={r.uid} value={r.uid}>{r.id} - {r.name.slice(0,25)}</option>
                  ))}
                </select>
                <button onClick={()=>bulkParentUid && bulkMakeSubtask(bulkParentUid)} className="small" style={{background:'#0072CE', color:'#fff'}} disabled={!bulkParentUid}><GitMerge size={12}/>Nest</button>
                <div style={{width:1,height:16,background:'#DCE6F2', margin:'0 4px'}}></div>
                <select value={bulkPredUid} onChange={e=>setBulkPredUid(e.target.value)} style={{fontSize:11, padding:'4px 6px', borderRadius:6, border:'1px solid #DCE6F2', maxWidth:140}}>
                  <option value="">Pred...</option>
                  {rows.filter(r=>!selected.has(r.uid)).map(r=>(
                    <option key={r.uid} value={r.uid}>{r.id} - {r.name.slice(0,25)}</option>
                  ))}
                </select>
                <select value={bulkPredType} onChange={e=>setBulkPredType(e.target.value)} style={{fontSize:11, padding:'4px 4px', borderRadius:6, border:'1px solid #DCE6F2', width:50}}>
                  <option>FS</option><option>SS</option><option>FF</option><option>SF</option>
                </select>
                <input type="number" placeholder="Lag" value={bulkPredLag} onChange={e=>setBulkPredLag(e.target.value)} style={{fontSize:11, padding:'4px 6px', borderRadius:6, border:'1px solid #DCE6F2', width:45}}/>
                <button onClick={bulkAddPred} className="small" style={{background:'#059669', color:'#fff'}} disabled={!bulkPredUid}><LinkIcon size={12}/>Add Pred</button>
                <button onClick={bulkRemoveSpecificPred} className="small" disabled={!bulkPredUid}><X size={12}/>Rm Pred</button>
                <button onClick={bulkRemoveAllPreds} className="small" style={{background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA'}}>Clear Preds</button>
                <button onClick={()=>setSelected(new Set())} className="small ghost"><X size={12}/></button>
              </div>
            )}
          </div>
          <div className="headerRight">
            <button onClick={()=>setShowColumns(!showColumns)} title="Columns"><Settings2 size={14}/></button>
            <button onClick={setBaseline} className={hasBaseline?'hasBaseline':''}><Save size={14}/>Baseline {hasBaseline?'✓':''}</button>
            {hasBaseline && <button onClick={clearBaseline} className="danger"><Trash size={13}/>Clear</button>}
            <button onClick={resetCurrentSchedule} className="danger" title="Reset - Clear all tasks"><RotateCcw size={14}/>Reset</button>
            <div className="exportGroup">
              <button onClick={saveCurrentPrompt} title="Save to My Projects list" style={{background:'#0A2342', color:'#fff'}}><Save size={14}/>Save</button>
              <button onClick={()=>setShowProjects(!showProjects)} className={showProjects?'on':''} title="My saved projects"><span style={{display:'flex',alignItems:'center',gap:4}}><span>📁</span>Projects {savedProjects.length>0 && <span className="count">{savedProjects.length}</span>}</span></button>
              <div style={{width:1, height:18, background:'#DCE6F2', margin:'0 2px'}}></div>
              <button onClick={exportProjectXML} title="Export Project XML"><Download size={12}/>Export XML</button>
              <button onClick={()=>fileInputRef.current?.click()} title="Import Project XML"><Upload size={12}/>Import XML</button>
              <button onClick={()=>setShowQuoteParser(true)} title="Parse vendor quotes for lead times" style={{background:'#FF6A35', color:'#fff', fontWeight:700}}><Package size={12}/>Parse Quotes</button>
              <div style={{width:1, height:18, background:'#DCE6F2', margin:'0 2px'}}></div>
              <button onClick={exportCSV}><FileJson size={12}/>CSV</button>
              {view==='gantt' ? (<><button onClick={()=>exportGantt('png')}><FileImage size={14}/>PNG</button><button onClick={()=>exportGantt('pdf')}><FileDown size={14}/>PDF</button></>) : (<><button onClick={()=>exportList('pdf')}><FileDown size={14}/>PDF</button></>)}
            </div>
          </div>
        </div>
        {showLegend && (
          <div className="legendBar">
            {Object.entries(PHASE_COLORS).map(([phase,color])=>(
              <div key={phase} className="legendItem"><span className="legendDot" style={{background:color}}></span>{phase.split(':')[0]}<span className="legendFull">{phase.split(':')[1]}</span></div>
            ))}
            <div className="legendItem" style={{background:'#FEF2F2', borderColor:'#FECACA'}}><span className="legendDot" style={{background:'#991B1B'}}></span>Fri/Sat/Holiday skipped</div>
            <button onClick={()=>setShowLegend(false)} className="small ghost">× Close</button>
          </div>
        )}
        {showColumns && (
          <div className="columnManager">
            <h4><Settings2 size={12}/>Columns</h4>
            <div className="colGrid">
              {Object.entries({id:'ID',task:'Task',phase:'Phase',preds:'Preds',start:'Start',dur:'Duration',finish:'Finish',progress:'Progress',baseline:'Baseline',variance:'Variance',area:'Area',resource:'Resources',supplier:'Suppliers',allow:'Allow Override'}).map(([k,label])=>(
                <label key={k} className="colToggle"><input type="checkbox" checked={visibleCols[k]} onChange={e=>setVisibleCols({...visibleCols,[k]:e.target.checked})}/>{label}</label>
              ))}
            </div>
            <div className="colActions"><button onClick={()=>setVisibleCols({id:true,task:true,phase:true,preds:true,start:true,dur:true,finish:true,progress:true,baseline:false,variance:false,area:true,resource:true,supplier:false,allow:true})}>Reset</button><button onClick={()=>setShowColumns(false)}>Close</button></div>
          </div>
        )}
      </header>
      <main>
        <aside>
          <div className="searchBox"><Search size={14}/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search tasks or phases..." /></div>
          <button className="addCustomBtn" onClick={()=>{ setCustomForm({name:'', phase:PHASES[0], duration:5, area:'Area 1', resource:'', supplier:'', parentUid:null, criticalOverride:'auto', allowNonWork:false}); setShowCustomModal(true); }}><Plus size={14}/>Add Custom Task</button>
          {Object.entries(groupedLib).map(([phase,items])=>{
            const isExpanded = expandedPhases[phase];
            const phaseColor = PHASE_COLORS[phase]||'#e5e7eb';
            return (
              <section key={phase} className="phaseSection">
                <h3 onClick={()=>setExpandedPhases(m=>({...m,[phase]:!m[phase]}))} className="phaseHeader">
                  <span className="collapseIcon">{isExpanded?'▼':'▶'}</span>
                  <span className="phaseDot" style={{background:phaseColor}}></span>
                  {phase.split(':')[0]} <small style={{fontWeight:400, color:'#64748B'}}>{phase.split(':')[1]}</small> <span style={{marginLeft:'auto', background:'#F1F5F9', padding:'2px 6px', borderRadius:10, fontSize:10}}>{items.length}</span>
                </h3>
                {isExpanded && <div className="phaseItems">{items.map(t=><button key={t.name} onClick={()=>addTask(t)} className="libBtn"><Plus size={13}/>{t.name}<small>{t.duration}d</small></button>)}</div>}
              </section>
            )
          })}
          {Object.keys(groupedLib).length===0 && <div className="noResults">No tasks match "{searchQuery}"</div>}
        </aside>
        <article>
          {rows.length===0 ? (
            <div className="onboarding">
              <div className="onboardingHeader"><div className="onboardingIcon">🚀</div><h1>Start Your Project</h1><p>Choose a template or build from scratch — all templates include dependencies • Calendar skips Fri/Sat/Federal Holidays by default</p></div>
              <div className="templateGrid">
                {Object.entries(TEMPLATES).map(([key,t])=>(
                  <div key={key} className="templateCard" onClick={()=>applyTemplate(key)}>
                    <div className="templateIcon">{t.icon}</div>
                    <h3>{t.name}</h3>
                    <p>{t.tasks.length} pre-linked tasks with dependencies</p>
                    <div className="templatePreview">{t.tasks.slice(0,4).map((task,i)=><span key={i} style={{borderLeft:`3px solid ${PHASE_COLORS[PHASES[task.phase]]}`}}>{task.name}</span>)}<span>+ {t.tasks.length-4} more</span></div>
                    <button>Use Template →</button>
                  </div>
                ))}
                <div className="templateCard blankCard" onClick={()=>setShowOnboarding(false)}>
                  <div className="templateIcon">➕</div>
                  <h3>Start Blank</h3>
                  <p>Add tasks manually from the library on the left</p>
                  <div className="blankHint">Drag grip to reorder • Bulk select with checkboxes</div>
                  <button>Start Blank →</button>
                </div>
              </div>
              <div className="onboardingHint"><kbd>Ctrl+Z</kbd> undo • <kbd>Ctrl+Y</kbd> redo • <kbd>Del</kbd> delete selected • <kbd>Esc</kbd> close • Drag bars to reschedule • Toggle calendar to override Fri/Sat/Hols</div>
            </div>
          ) : view==='list'?<ListView rows={rows} visibleRows={visibleRows} levelMap={levelMap} childrenMap={childrenMap} patch={patch} setRows={setRows} addPred={addPred} updatePred={updatePred} cp={cp} listRef={listRef} addSubTask={addSubTask} toggleCollapse={toggleCollapse} rowsMap={rowsMap} showCriticalOnly={showCriticalOnly} visibleCols={visibleCols} selected={selected} toggleSelect={toggleSelect} toggleSelectAll={toggleSelectAll} reorderRows={reorderRows} colWidths={colWidths} setColWidths={setColWidths} calendarCfg={calendarCfg}/>:<Gantt rows={visibleRows} setRows={setRows} zoom={zoomLevel} cp={cp} ref={ganttRef} allRows={rows} levelMap={levelMap} childrenMap={childrenMap} rowsMap={rowsMap} addSubTask={addSubTask} toggleCollapse={toggleCollapse} showCriticalOnly={showCriticalOnly} calendarCfg={calendarCfg}/>} 
          {toast && <div className={`toast ${toast.type||'info'}`}><div className="toastIcon">{toast.type==='success'?'✓':toast.type==='error'?'✕':'ℹ'}</div><div className="toastMsg">{toast.msg}</div><button onClick={()=>setToast(null)} className="toastClose">×</button></div>} 
          {showCustomModal && (
            <div className="modalOverlay" onClick={()=>setShowCustomModal(false)}>
              <div className="modalBox" onClick={e=>e.stopPropagation()}>
                <h3>{customForm.parentUid ? 'Add Sub-Task' : 'Add Custom Task'}</h3>
                {customForm.parentUid && <div className="modalParent">Parent: {rowsMap.get(customForm.parentUid)?.name}</div>}
                <div className="modalField"><label>Task Name *</label><input value={customForm.name} onChange={e=>setCustomForm({...customForm, name:e.target.value})} placeholder="e.g. Install Safety Fencing" autoFocus/></div>
                <div className="modalRow">
                  <div className="modalField"><label>Phase</label><select value={customForm.phase} onChange={e=>setCustomForm({...customForm, phase:e.target.value})}>{PHASES.map(ph=><option key={ph} value={ph}>{ph}</option>)}</select></div>
                  <div className="modalField"><label>Duration (e.g. 5d or 1w)</label><input type="text" value={customForm.duration} onChange={e=>setCustomForm({...customForm, duration:e.target.value})} placeholder="5d or 1w"/></div>
                </div>
                <div className="modalRow">
                  <div className="modalField"><label>Critical</label><select value={customForm.criticalOverride} onChange={e=>setCustomForm({...customForm, criticalOverride:e.target.value})}><option value="auto">Auto (from dependencies)</option><option value="critical">🔥 Force Critical</option><option value="non-critical">✓ Force Non-Critical</option></select><small style={{fontSize:10,color:'#64748B'}}>Auto = longest path. Force overrides</small></div>
                  <div className="modalField"><label>Area</label><input value={customForm.area} onChange={e=>setCustomForm({...customForm, area:e.target.value})} placeholder="Area 1"/></div>
                </div>
                <div className="modalRow">
                  <div className="modalField"><label>Resource</label><input value={customForm.resource} onChange={e=>setCustomForm({...customForm, resource:e.target.value})} placeholder="PM, Crew"/></div>
                  <div className="modalField"><label>Supplier</label><input value={customForm.supplier} onChange={e=>setCustomForm({...customForm, supplier:e.target.value})} placeholder="Hy-Tek"/></div>
                </div>
                <div className="modalField" style={{background: calendarCfg.enabled ? '#FEF2F2' : '#F0FDF4', padding:8, borderRadius:8, border: `1px solid ${calendarCfg.enabled ? '#FECACA' : '#BBF7D0'}`}}>
                  <label style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={customForm.allowNonWork} onChange={e=>setCustomForm({...customForm, allowNonWork:e.target.checked})}/>Override Calendar - Allow work on Fri/Sat/Holidays for this task</label>
                  <small style={{fontSize:10,color:'#64748B', marginLeft:20}}>{calendarCfg.enabled ? 'When checked, this task can be scheduled on skipped days' : 'Calendar override active globally - all days allowed'}</small>
                </div>
                <div className="modalActions">
                  <button onClick={()=>setShowCustomModal(false)}>Cancel (Esc)</button>
                  <button className="primary" onClick={addCustomTask}>{customForm.parentUid ? 'Add Sub-Task' : 'Add Task'}</button>
                </div>
              </div>
            </div>
          )}
          {showOnboarding && rows.length>0 && (
            <div className="modalOverlay" onClick={()=>setShowOnboarding(false)}>
              <div className="modalBox wide" onClick={e=>e.stopPropagation()}>
                <h3><Sparkles size={16}/> Project Templates</h3>
                <div className="templateGrid small">
                  {Object.entries(TEMPLATES).map(([key,t])=>(
                    <div key={key} className="templateCard" onClick={()=>applyTemplate(key)}>
                      <div className="templateIcon">{t.icon}</div>
                      <h3>{t.name}</h3>
                      <p>{t.tasks.length} tasks</p>
                      <button>Use Template</button>
                    </div>
                  ))}
                </div>
                <div className="modalActions"><button onClick={()=>setShowOnboarding(false)}>Continue with current project</button></div>
              </div>
            </div>
          )}
          {showProjects && (
            <div className="projectsDrawerOverlay" onClick={()=>setShowProjects(false)}>
              <div className="projectsDrawer" onClick={e=>e.stopPropagation()}>
                <div className="projectsHeader">
                  <h3><span>📁</span> Saved Projects <span className="count">{savedProjects.length}</span></h3>
                  <div style={{display:'flex', gap:6}}>
                    <button onClick={saveCurrentPrompt} className="primarySmall"><Save size={12}/>Save Current</button>
                    <button onClick={()=>setShowProjects(false)} className="ghostSmall"><X size={14}/></button>
                  </div>
                </div>
                <div className="projectsSearch"><Search size={12}/><input value={projectSearch} onChange={e=>setProjectSearch(e.target.value)} placeholder="Search projects..." /></div>
                <div className="projectsList">
                  {savedProjects.filter(p=> !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()) || (p.customerName||'').toLowerCase().includes(projectSearch.toLowerCase())).length===0 && (
                    <div className="projectsEmpty">
                      <div style={{fontSize:32}}>📂</div>
                      <b>No saved projects</b>
                      <p>Click "Save Current" to save your current schedule. It will appear here for instant loading without JSON files.</p>
                      <button onClick={saveCurrentPrompt} className="primarySmall" style={{marginTop:8}}><Save size={12}/>Save First Project</button>
                    </div>
                  )}
                  {savedProjects.filter(p=> !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()) || (p.customerName||'').toLowerCase().includes(projectSearch.toLowerCase())).map(proj=>(
                    <div key={proj.id} className="projectCard">
                      <div className="projectCardMain" onClick={()=>loadSavedProject(proj.id)}>
                        <div className="projectCardTitle">{proj.name}</div>
                        <div className="projectCardMeta">{proj.customerName||'No customer'} {proj.projectNumber?`• ${proj.projectNumber}`:''} • {proj.taskCount||proj.rows?.length||0} tasks • 🔥 {proj.criticalCount||0} critical • {proj.calendarCfg?.enabled?'Skip Fri/Sat/Hols':'All days'}</div>
                        <div className="projectCardDate">Saved {new Date(proj.savedAt).toLocaleString()} • Start {proj.start||'-'}</div>
                      </div>
                      <div className="projectCardActions">
                        <button onClick={()=>loadSavedProject(proj.id)} title="Load project" className="loadBtn"><Download size={12}/>Load</button>
                        <button onClick={()=>duplicateSavedProject(proj.id)} title="Duplicate" className="ghostSmall">Copy</button>
                        <button onClick={()=>deleteSavedProject(proj.id)} title="Delete" className="dangerSmall"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="projectsFooter">
                  <small>{savedProjects.length} project{savedProjects.length!==1?'s':''} saved locally • Stored in browser (localStorage) • Calendar: {calendarCfg.enabled?'Skipping Fri/Sat/Holidays':'All days (override)'}</small>
                  <div style={{display:'flex', gap:6, marginTop:6}}>
                    <button onClick={exportProjectXML} className="ghostSmall"><Download size={10}/>Export XML</button>
                    <button onClick={()=>fileInputRef.current?.click()} className="ghostSmall"><Upload size={10}/>Import XML</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showQuoteParser && (
            <QuoteParser 
              onInsertTasks={insertProcurementTasks} 
              onClose={()=>setShowQuoteParser(false)}
              projectStart={start}
            />
          )}
          <footer><span>{customerName||'No customer'} {projectNumber?`• ${projectNumber}`:''} • {rows.length} tasks {showCriticalOnly?`• Critical: ${visibleRows.length} shown`:''} {selected.size>0?`• ${selected.size} selected`:''} • {dateRange.min?`${dateRange.min} → ${dateRange.max}`:''} • Critical {cp.size} • {calendarCfg.enabled?`Skip Fri/Sat/Hols`:`All days`} • {saveStatus} • {todayStr}</span><span className="footerHint">📅 Fri/Sat/Hols skipped by default • Toggle calendar button to override • Per-task Allow Override checkbox</span></footer>
        </article>
      </main>
    </div>
  )
}

const EditableName = React.memo(function EditableName({row, patch, level}){
  const [local, setLocal] = useState(row.name);
  const timeoutRef=useRef(null);
  useEffect(()=>{ setLocal(row.name); },[row.name]);
  const onChange = (e)=>{ const v=e.target.value; setLocal(v); if(timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current=setTimeout(()=>{ if(v!==row.name) patch(row.uid,{name:v}); }, 600); };
  const onBlur = ()=>{ if(local!==row.name) patch(row.uid,{name:local}); };
  return <input className="editableName" value={local} onChange={onChange} onBlur={onBlur} style={{flex:1, background: level>0 ? '#f8fafc' : undefined}}/>;
});

function ListView({rows,visibleRows,levelMap,childrenMap,patch,setRows,addPred,updatePred,cp,listRef,addSubTask,toggleCollapse,rowsMap,showCriticalOnly,visibleCols,selected,toggleSelect,toggleSelectAll,reorderRows,colWidths,setColWidths,calendarCfg}){
  const displayRows = visibleRows||rows;
  const scrollContainerRef=useRef(null);
  const [scrollTop,setScrollTop]=useState(0);
  const ROW_H=52; const VISIBLE_COUNT=26;
  const onScroll = useCallback((e)=>{ const st=e.target.scrollTop; requestAnimationFrame(()=>setScrollTop(st)); },[]);
  const startIdx = Math.max(0, Math.floor(scrollTop/ROW_H)-5);
  const endIdx = Math.min(displayRows.length, startIdx + VISIBLE_COUNT + 10);
  const slice = displayRows.slice(startIdx, endIdx);
  const predOptions = useMemo(()=> rows.map(r=>({uid:r.uid, id:r.id, name:r.name, phase:r.phase})), [rows]);
  const [dragUid,setDragUid]=useState(null);
  const handleDragStart=(e,uid)=>{ setDragUid(uid); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', uid); };
  const handleDragOver=(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; };
  const handleDrop=(e,targetUid)=>{ e.preventDefault(); const fromUid=e.dataTransfer.getData('text/plain')||dragUid; if(fromUid && fromUid!==targetUid) reorderRows(fromUid, targetUid); setDragUid(null); };
  const resizingRef=useRef({active:false,key:null,startX:0,startW:0});
  const onResizeStart = useCallback((e,key)=>{
    e.preventDefault(); e.stopPropagation();
    resizingRef.current={active:true,key,startX:e.clientX,startW:colWidths[key]||120};
    const move=(ev)=>{
      if(!resizingRef.current.active) return;
      const diff=ev.clientX - resizingRef.current.startX;
      const nw=Math.max(40, Math.min(600, resizingRef.current.startW + diff));
      setColWidths(prev=>({...prev,[resizingRef.current.key]:nw}));
    };
    const up=()=>{
      resizingRef.current.active=false;
      window.removeEventListener('mousemove',move);
      window.removeEventListener('mouseup',up);
    };
    window.addEventListener('mousemove',move);
    window.addEventListener('mouseup',up);
  },[colWidths, setColWidths]);
  const Th = ({k,label})=>{
    const w = colWidths[k]||120;
    return <th style={{width:w, minWidth:w, maxWidth:w, position:'relative'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span></div><div className="colResizeHandle" onMouseDown={e=>onResizeStart(e,k)} title="Drag to resize" /></th>;
  };
  if(!rows.length) return <div className="blank"><div className="blankIcon">📋</div><h3>No tasks yet</h3><p>Add from library or use Quick Templates</p></div>;
  const colCount = Object.values(visibleCols).filter(Boolean).length + 3;
  return (
    <div ref={listRef} className="listExportShell">
      <div className="table" ref={scrollContainerRef} onScroll={onScroll} style={{height:'calc(100vh - 240px)', overflow:'auto'}}>
        <table style={{tableLayout:'fixed'}}>
          <thead><tr>
            <th style={{width:30, minWidth:30}}><input type="checkbox" checked={selected.size===displayRows.length && displayRows.length>0} onChange={toggleSelectAll}/></th>
            <th style={{width:24, minWidth:24}}></th>
            {visibleCols.id && <Th k="id" label="ID" />}
            {visibleCols.task && <Th k="task" label="Task Name" />}
            {visibleCols.phase && <Th k="phase" label="Phase" />}
            {visibleCols.preds && <Th k="preds" label="Preds" />}
            {visibleCols.start && <Th k="start" label="Start" />}
            {visibleCols.dur && <Th k="dur" label="Dur" />}
            {visibleCols.finish && <Th k="finish" label="Finish" />}
            {visibleCols.progress && <Th k="progress" label="Progress" />}
            {visibleCols.baseline && <Th k="baseline" label="Baseline" />}
            {visibleCols.variance && <Th k="variance" label="Var" />}
            {visibleCols.area && <Th k="area" label="Area" />}
            {visibleCols.resource && <Th k="resource" label="Resources" />}
            {visibleCols.supplier && <Th k="supplier" label="Suppliers" />}
            {visibleCols.allow && <Th k="allow" label="Override" />}
            <th style={{width:50}}></th>
          </tr></thead>
          <tbody>
            <tr style={{height: startIdx*ROW_H}}><td colSpan={colCount} style={{border:0, padding:0, height: startIdx*ROW_H}}></td></tr>
            {slice.map(x=>{
              const level = levelMap.get(x.uid)||0;
              const hasChildren = childrenMap.get(x.uid)?.length>0;
              const variance = x.baselineStart? diff(x.baselineStart,x.start) : null;
              const vClass = variance==null?'':variance===0?'var-zero':variance>0?'var-late':'var-early';
              const isDimmed = showCriticalOnly && !cp.has(x.uid);
              const isSelected = selected.has(x.uid);
              const isNonWorkStart = !isWorkDay(x.start, calendarCfg);
              const isNonWorkFinish = !isWorkDay(x.finish, calendarCfg);
              return (
                <tr key={x.uid} className={`${cp.has(x.uid)?'criticalRow':''} ${isDimmed?'dimmed':''} ${isSelected?'selectedRow':''} ${dragUid===x.uid?'draggingRow':''} ${x.allowNonWork?'allowRow':''}`} style={{height:ROW_H, opacity: isDimmed?0.4:1}} draggable onDragStart={e=>handleDragStart(e,x.uid)} onDragOver={handleDragOver} onDrop={e=>handleDrop(e,x.uid)}>
                  <td style={{width:30, minWidth:30}}><input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(x.uid)}/></td>
                  <td className="dragHandle" style={{width:24, minWidth:24}} title="Drag to reorder"><GripVertical size={14}/></td>
                  {visibleCols.id && <td style={{width:colWidths.id, minWidth:colWidths.id, maxWidth:colWidths.id, overflow:'hidden'}}><div style={{display:'flex',alignItems:'center',gap:4}}><span>{x.id}{x.isCustom ? ' ★' : ''}{level>0 ? ' ↳' : ''}</span>{cp.has(x.uid) && <span title={x.criticalOverride!=='auto' ? `Forced ${x.criticalOverride}` : 'Critical (auto)'} style={{fontSize:10, cursor:'pointer'}} onClick={()=>{ const cur=x.criticalOverride||'auto'; let next='auto'; if(cur==='auto') next=cp.has(x.uid)?'non-critical':'critical'; else if(cur==='critical') next='non-critical'; else next='auto'; patch(x.uid,{criticalOverride:next}); }}>🔥</span>}{!cp.has(x.uid) && x.criticalOverride!=='auto' && <span title={`Forced ${x.criticalOverride}`} style={{fontSize:10, opacity:.5}}>📌</span>}{x.allowNonWork && <span title="Override - allowed on Fri/Sat/Holidays" style={{fontSize:10}}>⚠️</span>}</div></td>}
                  {visibleCols.task && <td style={{width:colWidths.task, minWidth:colWidths.task, maxWidth:colWidths.task, overflow:'hidden'}}><div style={{display:'flex', alignItems:'center', gap:6, paddingLeft: level*24}}>{hasChildren && <button className="collapseBtn" onClick={()=>toggleCollapse(x.uid)}>{x.collapsed?'▶':'▼'}</button>}{!hasChildren && level>0 && <span style={{width:18, display:'inline-block', color:'#94a3b8'}}>•</span>}<EditableName row={x} patch={patch} level={level}/><button className="subTaskBtn" onClick={()=>addSubTask(x.uid)}>+ Sub</button><button title={cp.has(x.uid) ? `Critical ${x.criticalOverride!=='auto'?`(forced ${x.criticalOverride})`:''} - Click to toggle` : `Non-critical ${x.criticalOverride!=='auto'?`(forced ${x.criticalOverride})`:''} - Click to make critical`} onClick={()=>{ const cur=x.criticalOverride||'auto'; let next='auto'; if(cur==='auto') next=cp.has(x.uid)?'non-critical':'critical'; else if(cur==='critical') next='non-critical'; else next='auto'; patch(x.uid,{criticalOverride:next}); }} style={{border: cp.has(x.uid) ? '1px solid #FF6A35' : '1px solid #E2E8F0', background: cp.has(x.uid) ? '#FFF1F2' : '#fff', borderRadius:6, padding:'2px 6px', fontSize:10, fontWeight:700, cursor:'pointer', color: cp.has(x.uid) ? '#DC2626' : '#64748B'}}>{cp.has(x.uid)?'🔥 Critical':'○ Normal'}</button></div></td>}
                  {visibleCols.phase && <td style={{width:colWidths.phase, minWidth:colWidths.phase, maxWidth:colWidths.phase, overflow:'hidden'}}><span className="phasePill" style={{borderLeft:`4px solid ${PHASE_COLORS[x.phase]||'#e5e7eb'}`}}>{x.phase.split(':')[0]}</span>{x.parentUid && <span className="subPill">Sub</span>}</td>}
                  {visibleCols.preds && <td style={{width:colWidths.preds, minWidth:colWidths.preds, maxWidth:colWidths.preds, overflow:'hidden'}}><PredCell row={x} predOptions={predOptions} addPred={addPred} updatePred={updatePred} setRows={setRows} rowsMap={rowsMap} calendarCfg={calendarCfg}/></td>}
                  {visibleCols.start && <td style={{width:colWidths.start, minWidth:colWidths.start, overflow:'hidden'}}><div style={{display:'flex',alignItems:'center',gap:4, width:'100%'}}><input type="date" value={x.start} onChange={e=>patch(x.uid,{start:e.target.value})} style={{flex:1, minWidth:0, ...(isNonWorkStart && !x.allowNonWork && x.start ? {borderColor:'#FECACA', background:'#FEF2F2'} : {})}}/><span title={isFederalHoliday(x.start)?'Federal Holiday': isWeekendFridaySaturday(x.start)?'Fri/Sat - skipped by calendar':''} style={{fontSize:10, flexShrink:0}}>{isFederalHoliday(x.start)?'🎉': isNonWorkStart && !x.allowNonWork && x.start?'🚫':''}</span></div></td>}
                  {visibleCols.dur && <td style={{width:colWidths.dur, minWidth:colWidths.dur, overflow:'hidden'}}><DurationCell row={x} patch={patch}/></td>}
                  {visibleCols.finish && <td style={{width:colWidths.finish, minWidth:colWidths.finish, whiteSpace:'nowrap',fontWeight:600, overflow:'hidden'}}><div style={{display:'flex',alignItems:'center',gap:4}}><span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{x.finish || '-'}</span><span style={{fontSize:10, flexShrink:0}}>{isFederalHoliday(x.finish)?'🎉': isNonWorkFinish && !x.allowNonWork && calendarCfg.enabled && x.finish?'🚫':''}</span></div></td>}
                  {visibleCols.progress && <td style={{width:colWidths.progress, minWidth:colWidths.progress, overflow:'hidden'}}><div style={{display:'flex',alignItems:'center',gap:6}}><input type="range" min="0" max="100" value={x.percentComplete||0} onChange={e=>patch(x.uid,{percentComplete: Number(e.target.value)})} style={{flex:1, minWidth:40, height:6}} title={`${x.percentComplete||0}%`}/><input type="number" min="0" max="100" value={x.percentComplete||0} onChange={e=>patch(x.uid,{percentComplete: Number(e.target.value)})} style={{width:42, fontSize:11, border:'1px solid #E2E8F0', borderRadius:6, padding:'2px 4px', textAlign:'center', fontWeight:600}}/><span style={{fontSize:10}}>%</span></div><div style={{height:4, background:'#E2E8F0', borderRadius:2, overflow:'hidden', marginTop:2}}><div style={{width:`${x.percentComplete||0}%`, height:'100%', background: (x.percentComplete||0)>=100?'#16A34A':(x.percentComplete||0)>=50?'#0A2342':'#FF6A35', transition:'width 0.2s'}}></div></div></td>}
                  {visibleCols.baseline && <td style={{width:colWidths.baseline, minWidth:colWidths.baseline, whiteSpace:'nowrap',fontSize:11,color:'#64748B', overflow:'hidden'}}>{x.baselineStart?`${x.baselineStart} → ${x.baselineFinish}`:'-'}</td>}
                  {visibleCols.variance && <td style={{width:colWidths.variance, minWidth:colWidths.variance}}><span className={`variance ${vClass}`}>{variance==null?'-':variance===0?'On time':variance>0?`+${variance}d late`:`${variance}d early`}</span></td>}
                  {visibleCols.area && <td style={{width:colWidths.area, minWidth:colWidths.area}}><input className="textBox" defaultValue={x.area || ''} onBlur={e=>{ if(e.target.value!==x.area) patch(x.uid,{area:e.target.value}); }} placeholder="Area" /></td>}
                  {visibleCols.resource && <td style={{width:colWidths.resource, minWidth:colWidths.resource}}><input className="textBox" defaultValue={x.resource||''} onBlur={e=>{ if(e.target.value!==x.resource) patch(x.uid,{resource:e.target.value}); }} placeholder="PM" /></td>}
                  {visibleCols.supplier && <td style={{width:colWidths.supplier, minWidth:colWidths.supplier}}><input className="textBox" defaultValue={x.supplier||''} onBlur={e=>{ if(e.target.value!==x.supplier) patch(x.uid,{supplier:e.target.value}); }} placeholder="Hy-Tek" /></td>}
                  {visibleCols.allow && <td style={{width:colWidths.allow, minWidth:colWidths.allow}}><label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}><input type="checkbox" checked={!!x.allowNonWork} onChange={e=>patch(x.uid,{allowNonWork:e.target.checked})}/> {x.allowNonWork?'⚠️ Allow':'Allow'}</label></td>}
                  <td style={{width:50}}><button onClick={()=>setRows(r=>schedule(r.filter(y=>y.uid!==x.uid).map(y=>({...y,preds:(y.preds||[]).filter(p=>p.uid!==x.uid), parentUid: y.parentUid===x.uid ? null : y.parentUid})), calendarCfg))}><Trash2 size={14}/></button></td>
                </tr>
              )
            })}
            <tr style={{height: (displayRows.length - endIdx)*ROW_H}}><td colSpan={colCount} style={{border:0, padding:0, height: (displayRows.length - endIdx)*ROW_H}}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
const PredCell = React.memo(function PredCell({row,predOptions,addPred,updatePred,setRows,rowsMap,calendarCfg}){
  const [sel,setSel]=useState(''),[type,setType]=useState('FS'),[lag,setLag]=useState(0);
  const [showPicker,setShowPicker]=useState(false);
  const [pickerQuery,setPickerQuery]=useState('');
  const removePred = useCallback((predUid) => setRows(r=>schedule(r.map(x=>x.uid===row.uid?{...x,preds:(x.preds||[]).filter(p=>p.uid!==predUid)}:x), calendarCfg || {enabled:true, skipFri:true, skipSat:true, skipHolidays:true})),[row.uid, setRows, calendarCfg]);
  const filtered = useMemo(()=>{ const q=pickerQuery.toLowerCase(); return predOptions.filter(o=> o.uid!==row.uid && (o.name.toLowerCase().includes(q) || String(o.id).includes(q))); },[predOptions, pickerQuery, row.uid]);
  return (
    <div className="pred">
      <div className="predList">
        {(row.preds||[]).map(p=>{ const t=rowsMap.get(p.uid); return (<span key={p.uid} className="predChip compact"><b>{t?.id||'?'}</b><select value={p.type} onChange={e=>updatePred(row.uid, p.uid, 'type', e.target.value)} style={{fontSize:10, padding:'1px 2px', borderRadius:4, border:'1px solid #C7DBF0'}}><option>FS</option><option>SS</option><option>FF</option><option>SF</option></select><input type="number" value={p.lag||0} onChange={e=>updatePred(row.uid, p.uid, 'lag', e.target.value)} style={{width:36, fontSize:10, padding:'1px 2px', borderRadius:4, border:'1px solid #C7DBF0'}}/><b onClick={()=>removePred(p.uid)} className="predRemove" style={{cursor:'pointer', padding:'0 3px'}}>×</b></span>)})}
      </div>
      <div className="predAdd">
        <button className="predPickerBtn" onClick={()=>setShowPicker(!showPicker)}><LinkIcon size={12}/>{row.preds?.length?`+${row.preds.length}`:'Add link'}</button>
        {showPicker && (
          <div className="predPicker">
            <div className="pickerSearch"><Search size={12}/><input autoFocus value={pickerQuery} onChange={e=>setPickerQuery(e.target.value)} placeholder="Search tasks..."/><button onClick={()=>setShowPicker(false)}>×</button></div>
            <div className="pickerList">
              {filtered.slice(0,20).map(o=>(
                <div key={o.uid} className="pickerItem" onClick={()=>{ addPred(row.uid, o.uid, type, lag); setShowPicker(false); setPickerQuery(''); }}>
                  <span className="pickerId">{o.id}</span><span className="pickerName">{o.name}</span><span className="pickerPhase" style={{background:PHASE_COLORS[o.phase]||'#eee'}}>{o.phase.split(':')[0]}</span>
                </div>
              ))}
              {filtered.length===0 && <div className="pickerEmpty">No matches</div>}
            </div>
            <div className="pickerControls">
              <select value={type} onChange={e=>setType(e.target.value)}><option>FS</option><option>SS</option><option>FF</option><option>SF</option></select>
              <input type="number" placeholder="Lag" style={{width:50}} value={lag} onChange={e=>setLag(e.target.value)}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
});
function DurationCell({row,patch}){
  const [local,setLocal]=useState(formatDurationDays(row.duration));
  const [focused,setFocused]=useState(false);
  useEffect(()=>{
    if(!focused) setLocal(formatDurationDays(row.duration));
  },[row.duration, focused]);
  const commit = useCallback((v)=>{
    const parsed = parseDurationInput(v);
    if(parsed==null){ setLocal(formatDurationDays(row.duration)); return; }
    if(parsed!==row.duration) patch(row.uid,{duration:parsed});
    setLocal(formatDurationDays(parsed));
  },[row.duration, row.uid, patch]);
  return <div className="durationCell" title={`${row.duration}d = ${row.duration/5}w work days`}>
    <input type="text" value={local}
      onFocus={()=>setFocused(true)}
      onChange={e=>{ setLocal(e.target.value); }}
      onBlur={e=>{ setFocused(false); commit(e.target.value); }}
      onKeyDown={e=>{ if(e.key==='Enter'){ e.target.blur(); }}}
      placeholder="e.g. 5d or 1w"
      style={{width:55, textAlign:'center'}}
    />
    <div className="spin">
      <button onClick={()=>{ const n=Math.max(1,Number(row.duration)+1); patch(row.uid,{duration:n}); }}><ChevronUp size={12}/></button>
      <button onClick={()=>{ const n=Math.max(1,Number(row.duration)-1); patch(row.uid,{duration:n}); }}><ChevronDown size={12}/></button>
    </div>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
