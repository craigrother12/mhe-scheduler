import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

const asDate = (v) => new Date(`${v}T12:00:00`);
const toIso = (v) => `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
const addDays = (v,a) => { const n=asDate(v); n.setDate(n.getDate()+Number(a)); return toIso(n); };
const dayDiff = (s,f) => Math.round((asDate(f)-asDate(s))/86400000);

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
const ZOOM_MAP = {months:12, weeks:20, days:36, detailed:72};

// Federal holidays - same logic as main.jsx
function getNthWeekday(year, month, weekday, n){
  let d = new Date(year, month, 1);
  let count=0;
  while(d.getMonth()===month){
    if(d.getDay()===weekday){ count++; if(count===n) return new Date(d); }
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
  const iso = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const set = new Set();
  const addIso = (d)=>{ if(d) set.add(iso(d)); };
  const fixed = [new Date(year,0,1), new Date(year,5,19), new Date(year,6,4), new Date(year,10,11), new Date(year,11,25)];
  fixed.forEach(d=>{
    addIso(d);
    const dow=d.getDay();
    if(dow===6){ const obs=new Date(d); obs.setDate(obs.getDate()-1); if(obs.getFullYear()===year) addIso(obs); }
    else if(dow===0){ const obs=new Date(d); obs.setDate(obs.getDate()+1); if(obs.getFullYear()===year) addIso(obs); }
  });
  const mlk=getNthWeekday(year,0,1,3); addIso(mlk);
  const pres=getNthWeekday(year,1,1,3); addIso(pres);
  const mem=getLastWeekday(year,4,1); addIso(mem);
  const labor=getNthWeekday(year,8,1,1); addIso(labor);
  const col=getNthWeekday(year,9,1,2); addIso(col);
  const thanks=getNthWeekday(year,10,4,4); addIso(thanks);
  const jan1Next=new Date(year+1,0,1);
  if(jan1Next.getDay()===6) addIso(new Date(year,11,31));
  return set;
}
const holidayCache=new Map();
function getHolidaySetCached(y){ if(!holidayCache.has(y)) holidayCache.set(y, buildHolidaySet(y)); return holidayCache.get(y); }
function isFederalHoliday(isoStr){
  if(!isoStr) return false;
  const d=asDate(isoStr); const y=d.getFullYear();
  for(let yy=y-1; yy<=y+1; yy++){ const set=getHolidaySetCached(yy); if(set.has(isoStr)) return true; }
  return false;
}
function isWorkDay(isoStr, cfg){
  if(!cfg || !cfg.enabled) return true;
  const dow=asDate(isoStr).getDay();
  const skipWeekends = cfg.skipWeekends || cfg.skipFriSat;
  if(skipWeekends){
    if(dow===0 || dow===6) return false;
  } else {
    if(cfg.skipSat && dow===6) return false;
    if(cfg.skipSun && dow===0) return false;
    if(cfg.skipFri && dow===0) return false;
  }
  if(cfg.skipHolidays && isFederalHoliday(isoStr)) return false;
  return true;
}
function nextWorkDay(isoStr, cfg){
  if(!cfg || !cfg.enabled) return isoStr;
  let cur=isoStr; let guard=0;
  while(!isWorkDay(cur,cfg) && guard<30){ cur=addDays(cur,1); guard++; }
  return cur;
}
function prevWorkDay(isoStr, cfg){
  if(!cfg || !cfg.enabled) return isoStr;
  let cur=isoStr; let guard=0;
  while(!isWorkDay(cur,cfg) && guard<30){ cur=addDays(cur,-1); guard++; }
  return cur;
}
function addWorkDays(startIso, n, cfg, allowNonWork){
  if(!cfg || !cfg.enabled || allowNonWork) return addDays(startIso,n);
  if(n===0) return nextWorkDay(startIso,cfg);
  let cur=nextWorkDay(startIso,cfg);
  for(let i=0;i<n;i++){ cur=addDays(cur,1); cur=nextWorkDay(cur,cfg); }
  return cur;
}

const Gantt = React.forwardRef(function Gantt({ rows, setRows, zoom='days', cp=new Set(), allRows, levelMap, childrenMap, rowsMap, addSubTask, toggleCollapse, showCriticalOnly, showDependencies=false, calendarCfg }, ref){
  const viewportRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [linkingFrom, setLinkingFrom] = useState(null);
  const [linkType, setLinkType] = useState('FS');
  const [linkLag, setLinkLag] = useState(0);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const dragRef = useRef({active:false, uid:null, startX:0, origStart:'', bubble:null, minStart:null});
  const scrollRafRef = useRef(null);
  const cfg = calendarCfg || {enabled:true, skipFriSat:true, skipFri:true, skipSat:true, skipHolidays:true};

  useEffect(()=>{
    const close=()=> setCtxMenu(null);
    window.addEventListener('click', close);
    return()=>window.removeEventListener('click', close);
  },[]);

  const W = 480; const RH=44, HH=86;

  const {tStart, totalDays, tw, pxPerDay, months, x, todayX, nonWorkDays} = useMemo(()=>{
    if(!rows?.length) return {tStart:'', totalDays:0, tw:980, pxPerDay:36, months:[], x:()=>0, todayX:null, nonWorkDays:[]};
    const starts = rows.map(r=>r.start).filter(Boolean).sort();
    const ends = rows.map(r=>r.finish).filter(Boolean).sort();
    const minD = asDate(starts[0]); minD.setDate(minD.getDate()-2);
    const maxD = asDate(ends.at(-1)); maxD.setDate(maxD.getDate()+7);
    const s = toIso(minD);
    const days = dayDiff(s, toIso(maxD))+1;
    const MAX_W = 8000;
    let px = ZOOM_MAP[zoom]||36;
    let w = Math.max(980, days*px);
    if(w > MAX_W - W){ px = (MAX_W - W)/days; w = MAX_W - W; }
    const xFn = (v) => dayDiff(s, v) * (w/days);
    const m=[]; 
    for(let i=0;i<days;i++){ const d=new Date(minD); d.setDate(minD.getDate()+i); const key=d.toLocaleDateString('en-US',{month:'long',year:'numeric'}); const last=m.at(-1); if(!last||last.key!==key) m.push({key,start:i,count:1}); else last.count++; }
    const todayIso = toIso(new Date());
    const tX = (todayIso>=s && todayIso<=toIso(maxD)) ? xFn(todayIso) : null;
    // compute non-work days within range
    const nonWork=[];
    if(cfg.enabled){
      for(let i=0;i<days;i++){
        const d=new Date(minD); d.setDate(minD.getDate()+i);
        const isoStr=toIso(d);
        if(!isWorkDay(isoStr, cfg)) nonWork.push({idx:i, iso:isoStr, isHoliday:isFederalHoliday(isoStr), dow:d.getDay()});
      }
    }
    return {tStart:s, totalDays:days, tw:w, pxPerDay:px, months:m, x:xFn, todayX:tX, nonWorkDays:nonWork};
  }, [rows, zoom, cfg]);

  const VISIBLE_COUNT=24;
  const startIdx = Math.max(0, Math.floor(scrollTop/RH)-2);
  const endIdx = Math.min(rows.length, startIdx + VISIBLE_COUNT + 6);
  const visibleSlice = rows.slice(startIdx, endIdx);
  const actualRowsMap = rowsMap || new Map(rows.map(r=>[r.uid,r]));
  const actualLevelMap = levelMap || new Map();
  const actualChildrenMap = childrenMap || new Map();

  useEffect(()=>{
    const canvas = timelineCanvasRef.current;
    if(!canvas || !totalDays) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    canvas.width = tw * dpr; canvas.height = HH * dpr;
    canvas.style.width = tw + 'px'; canvas.style.height = HH + 'px';
    ctx.scale(dpr,dpr); ctx.clearRect(0,0,tw, HH);
    ctx.fillStyle='#F8FBFF'; ctx.fillRect(0,0,tw,HH);
    ctx.font='bold 11px Inter'; 
    months.forEach(m=>{ const xx=m.start*(tw/totalDays); const ww=m.count*(tw/totalDays); ctx.fillStyle='#EAF2FB'; ctx.fillRect(xx,0,ww,28); ctx.strokeStyle='#E1EBF5'; ctx.strokeRect(xx,0,ww,28); ctx.fillStyle='#0A2342'; ctx.fillText(m.key, xx+6, 18); });
    ctx.strokeStyle='#EDF2F8'; for(let i=0;i<=totalDays;i++){ const xx=i*(tw/totalDays); ctx.beginPath(); ctx.moveTo(xx,28); ctx.lineTo(xx,HH); ctx.stroke(); }
  }, [tw, totalDays, months]);

  // overlay for non-work shading
  useEffect(()=>{
    const canvas = overlayCanvasRef.current;
    if(!canvas || !totalDays) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const h = rows.length*RH;
    canvas.width = tw * dpr; canvas.height = h * dpr;
    canvas.style.width = tw + 'px'; canvas.style.height = h + 'px';
    ctx.scale(dpr,dpr); ctx.clearRect(0,0,tw,h);
    if(!cfg.enabled) return;
    nonWorkDays.forEach(nw=>{
      const xx=nw.idx*(tw/totalDays);
      const ww=(tw/totalDays);
      if(nw.isHoliday){
        ctx.fillStyle='rgba(220,38,38,0.08)';
      } else {
        ctx.fillStyle='rgba(148,163,184,0.12)';
      }
      ctx.fillRect(xx,0,ww,h);
      // diagonal stripe for Sat/Sun
      if(nw.dow===5 || nw.dow===6){
        ctx.fillStyle='rgba(148,163,184,0.08)';
        ctx.fillRect(xx,0,ww,h);
      }
    });
  }, [tw, totalDays, rows.length, nonWorkDays, cfg]);

  const getMinStart = useCallback((row) => {
    let min = null;
    for(const p of row.preds||[]){
      const q = actualRowsMap.get(p.uid); if(!q) continue;
      let allowed = null;
      const allow = row.allowNonWork;
      if(p.type==='FS') allowed = addWorkDays(q.finish, (Number(p.lag)||0)+1, cfg, allow);
      else if(p.type==='SS') allowed = addWorkDays(q.start, Number(p.lag)||0, cfg, allow);
      if(allowed && (!min || asDate(allowed) > asDate(min))) min = allowed;
    }
    return min;
  }, [actualRowsMap, cfg]);

  const onDragStart = useCallback((e,row)=>{
    if(linkingFrom) return;
    if(e.target.closest('.resizeHandle') || e.target.closest('.ganttActions')) return;
    e.preventDefault();
    dragRef.current = {active:true, uid:row.uid, startX:e.clientX, origStart:row.start, bubble:e.currentTarget, minStart:getMinStart(row), allow: row.allowNonWork};
    e.currentTarget.classList.add('dragging');
    const move = (ev)=>{
      if(!dragRef.current.active) return;
      const delta=Math.round((ev.clientX-dragRef.current.startX)/pxPerDay);
      let ns=addDays(dragRef.current.origStart,delta);
      // snap to workday if needed
      if(cfg.enabled && !dragRef.current.allow){
        ns=nextWorkDay(ns,cfg);
      }
      if(dragRef.current.minStart && asDate(ns) < asDate(dragRef.current.minStart)){ ns = dragRef.current.minStart; dragRef.current.bubble?.classList.add('drag-blocked'); }
      else { dragRef.current.bubble?.classList.remove('drag-blocked'); }
      if(dragRef.current.bubble){ dragRef.current.bubble.style.left = x(ns) + 'px'; dragRef.current.bubble.style.opacity='0.7'; }
      dragRef.current._preview = {uid:row.uid, start:ns, finish:addWorkDays(ns,row.duration-1,cfg,row.allowNonWork)};
    };
    const up = ()=>{
      window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
      document.querySelectorAll('.ganttBubble').forEach(b=>{ b.classList.remove('dragging'); b.classList.remove('drag-blocked'); b.style.opacity=''; });
      if(dragRef.current.active && dragRef.current._preview){
        const {start, finish} = dragRef.current._preview;
        setRows(prev=>prev.map(y=>y.uid===row.uid?{...y,start,finish}:y));
        window.dispatchEvent(new CustomEvent('gantt-reschedule',{detail:{uid:row.uid}}));
      }
    };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  }, [pxPerDay, getMinStart, setRows, cfg, x]);

  const onResizeStart = useCallback((e,row,side)=>{
    e.preventDefault(); e.stopPropagation();
    const startX=e.clientX; const origStart=row.start; const origFinish=row.finish; const origDur=row.duration;
    const bubble=e.currentTarget.closest('.ganttBubble');
    bubble?.classList.add('resizing');
    const mv=(ev)=>{
      const delta=Math.round((ev.clientX-startX)/pxPerDay);
      if(side==='left'){
        let ns=addDays(origStart,delta);
        if(cfg.enabled && !row.allowNonWork) ns=nextWorkDay(ns,cfg);
        const minStart=getMinStart(row);
        if(minStart && asDate(ns) < asDate(minStart)) ns=minStart;
        let nd=dayDiff(ns, origFinish)+1;
        if(nd<1) nd=1;
        if(bubble){ bubble.style.left=x(ns)+'px'; bubble.style.width=Math.max(tw/totalDays, nd*(tw/totalDays))+'px'; }
        dragRef.current._preview={uid:row.uid, start:ns, finish:origFinish, duration:nd};
      } else {
        let nf=addDays(origFinish,delta);
        if(cfg.enabled && !row.allowNonWork) nf=nextWorkDay(nf,cfg);
        let nd=dayDiff(origStart, nf)+1;
        if(nd<1) nd=1;
        if(bubble){ bubble.style.width=Math.max(tw/totalDays, nd*(tw/totalDays))+'px'; }
        dragRef.current._preview={uid:row.uid, start:origStart, finish:nf, duration:nd};
      }
    };
    const up=()=>{
      window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up);
      bubble?.classList.remove('resizing');
      if(dragRef.current._preview){
        const {start, finish, duration}=dragRef.current._preview;
        setRows(prev=>prev.map(y=>y.uid===row.uid?{...y,start,finish,duration}:y));
        window.dispatchEvent(new CustomEvent('gantt-reschedule',{detail:{uid:row.uid}}));
      }
    };
    window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up);
  }, [pxPerDay, getMinStart, setRows, tw, totalDays, x, cfg]);

  const deleteTask=useCallback((uid)=>{ if(!window.confirm('Delete this task?')) return; setRows(prev=>prev.filter(y=>y.uid!==uid).map(y=>({...y,preds:(y.preds||[]).filter(p=>p.uid!==uid)}))); window.dispatchEvent(new CustomEvent('gantt-reschedule', {detail:{uid: 'deleted'}})); },[setRows]);
  const startLink=useCallback((row, e)=>{
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if(linkingFrom && linkingFrom!==row.uid){
      setRows(prev=>{
        const n=prev.map(x=>x.uid===row.uid?{...x,preds:[...(x.preds||[]),{uid:linkingFrom,type:linkType,lag:+linkLag||0}]}:x);
        const m=new Map(n.map(x=>[x.uid,x])); let v=new Set(), done=new Set(), bad=false; function go(u){ if(v.has(u)){bad=true;return} if(done.has(u))return; v.add(u); (m.get(u)?.preds||[]).forEach(p=>go(p.uid)); v.delete(u); done.add(u); } n.forEach(x=>go(x.uid)); if(bad){ alert('Circular dependency blocked'); return prev; } return n;
      });
      setLinkingFrom(null); window.dispatchEvent(new CustomEvent('gantt-reschedule', {detail:{uid: row.uid}}));
    } else { setLinkingFrom(row.uid); }
  },[linkingFrom, linkType, linkLag, setRows]);
  const handleContextMenu = (e,row)=>{ e.preventDefault(); e.stopPropagation(); setCtxMenu({x:e.clientX, y:e.clientY, row}); };
  const onScroll = useCallback((e)=>{ const st=e.target.scrollTop; if(scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = requestAnimationFrame(()=> setScrollTop(st)); },[]);

  if(!rows?.length) return (
    <div className="emptyGantt">
      <div className="emptyIcon">📊</div>
      <h3>No tasks yet</h3>
      <p>Add tasks from the left or choose a template to see the Gantt chart</p>
      <div className="emptyHint">Tip: Use Quick Templates for 1-click setup • Drag grip ↕ to reorder in List • {cfg.enabled?'Sat/Sun/Holidays shaded':'All days enabled'}</div>
    </div>
  );

  return (
    <div className="ganttShell clickup" ref={ref}>
      {linkingFrom && (<div className="linkingBar"><span>Linking from <b>{actualRowsMap.get(linkingFrom)?.id}</b> → click target</span><div className="linkingControls"><select value={linkType} onChange={e=>setLinkType(e.target.value)}><option>FS</option><option>SS</option><option>FF</option><option>SF</option></select><input type="number" value={linkLag} onChange={e=>setLinkLag(e.target.value)} style={{width:56}}/><button onClick={()=>setLinkingFrom(null)}>Cancel (Esc)</button></div></div>)}
      {cfg.enabled && <div className="calendarLegend"><span className="calDot weekend"></span>Sat/Sun • <span className="calDot holiday"></span>Federal Holiday • <span className="calCount">{nonWorkDays.length} non-work days in range</span></div>}
      <div className="ganttViewport" ref={viewportRef} onScroll={onScroll}>
        <div className="ganttCanvas" style={{width:W+tw, height: HH + rows.length*RH}}>
          <div className="ganttHeader" style={{width:W+tw}}>
            <div className="ganttTaskHeader" style={{width:W}}>Task • {totalDays}d • {zoom} • {Math.round(tw)}px {showCriticalOnly?'• Critical only':''} {cfg.enabled?'• Skip Sat/Sun/Hols':''}</div>
            <div className="ganttScale" style={{width:tw}}><canvas ref={timelineCanvasRef} style={{width:tw+'px', height:HH+'px'}}/><div className="monthRow">{months.map(m=><div key={m.key} style={{left:m.start*(tw/totalDays),width:m.count*(tw/totalDays)}}>{m.key}</div>)}</div></div>
          </div>
          <div className="ganttRows" style={{height: rows.length*RH, position:'relative'}}>
            {todayX!=null && <div className="todayLine" style={{left:W+todayX, height: rows.length*RH}}><div className="todayLabel">Today</div></div>}
            {/* non-work overlay */}
            <div style={{position:'absolute', left:W, top:0, width:tw, height: rows.length*RH, pointerEvents:'none', zIndex:1}}><canvas ref={overlayCanvasRef} style={{width:tw+'px', height: rows.length*RH+'px'}} /></div>
            <div style={{height: startIdx*RH}}/>
            {visibleSlice.map((r,i)=>{
              const actualIdx = startIdx + i;
              const isCritical = cp.has(r.uid);
              const phaseCol=PHASE_COLORS[r.phase]||'#e5e7eb';
              const level = actualLevelMap.get(r.uid)||0; const hasChildren = actualChildrenMap.get(r.uid)?.length>0;
              const isDimmed = showCriticalOnly && !isCritical;
              return (
                <div key={r.uid} className={`ganttRow ${isDimmed?'dimmed':''}`} style={{height:RH, top:HH+actualIdx*RH, position:'absolute', left:0, width:W+tw, opacity: isDimmed?0.35:1, zIndex:2}}>
                  <div className="ganttTaskCell" style={{width:W, paddingLeft: (level*16 + 12)+'px'}}>
                    {hasChildren ? <button className="ganttCollapseBtn" onClick={(e)=>{e.stopPropagation(); toggleCollapse && toggleCollapse(r.uid);}}>{r.collapsed ? '▶' : '▼'}</button> : r.parentUid ? <span style={{width:18, display:'inline-block', color:'#94a3b8'}}>↳</span> : null}
                    <b>{r.id}{isCritical?' 🔥':''}{r.allowNonWork?' ⚠️':''}</b><span title={r.name} style={{fontWeight: isCritical?700: r.parentUid?400:600}}>{r.name}</span>
                    <div className="ganttActions"><button className="ganttSubBtn" onClick={(e)=>{e.stopPropagation(); addSubTask && addSubTask(r.uid);}} title="Add sub-task (N)">+ Sub</button><button className="ganttLinkBtn" onClick={()=>startLink(r)} title="Link (L)">🔗</button><button className="ganttDelBtn" onClick={()=>deleteTask(r.uid)} title="Delete (D)">🗑</button></div>
                  </div>
                  <div className="ganttTimeline" style={{left:W,width:tw}}>
                    <div onContextMenu={e=>handleContextMenu(e,r)} onPointerDown={e=>onDragStart(e,r)} className={`ganttBubble ${isCritical?'critical':''} ${r.parentUid ? 'subtask-bubble' : ''} ${r.allowNonWork?'allow-bubble':''}`} style={{left:x(r.start),width:Math.max(tw/totalDays, r.duration*(tw/totalDays)), background: isCritical? '#FF6A35' : phaseCol}}>
                      <div className="resizeHandle left" onPointerDown={e=>onResizeStart(e,r,'left')}><div className="grip"><span></span><span></span><span></span></div></div>
                      <span className="bubbleName">{r.name}{r.allowNonWork?' ⚠️':''}</span><span className="bubbleDur">{r.duration}d</span>
                      <div className="resizeHandle right" onPointerDown={e=>onResizeStart(e,r,'right')}><div className="grip"><span></span><span></span><span></span></div></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {ctxMenu && (
        <div className="ganttCtxMenu" style={{left:ctxMenu.x, top:ctxMenu.y}}>
          <div className="ctxHeader">{ctxMenu.row.id} - {ctxMenu.row.name.slice(0,28)} {cp.has(ctxMenu.row.uid)?'🔥':''} {ctxMenu.row.allowNonWork?'⚠️':''}</div>
          <button onClick={()=>{ 
            const cur=ctxMenu.row.criticalOverride||'auto';
            let next='auto';
            if(cur==='auto') next=cp.has(ctxMenu.row.uid)?'non-critical':'critical';
            else if(cur==='critical') next='non-critical';
            else next='auto';
            setRows(prev=>prev.map(r=>r.uid===ctxMenu.row.uid?{...r, criticalOverride:next}:r));
            setCtxMenu(null);
          }}>{cp.has(ctxMenu.row.uid)?'○ Make Normal':'🔥 Make Critical'} <kbd>C</kbd></button>
          <button onClick={()=>{ setRows(prev=>prev.map(r=>r.uid===ctxMenu.row.uid?{...r, allowNonWork:!r.allowNonWork}:r)); setCtxMenu(null); }}>{ctxMenu.row.allowNonWork?'✅ Remove Override':'⚠️ Allow Sat/Sun/Holiday'} <kbd>O</kbd></button>
          <button onClick={()=>{ addSubTask && addSubTask(ctxMenu.row.uid); setCtxMenu(null); }}>➕ Add sub-task <kbd>N</kbd></button>
          <button onClick={()=>{ setLinkingFrom(ctxMenu.row.uid); setCtxMenu(null); }}>🔗 Start link <kbd>L</kbd></button>
          <button className="ctxDanger" onClick={()=>{ deleteTask(ctxMenu.row.uid); setCtxMenu(null); }}>🗑 Delete <kbd>D</kbd></button>
          <div className="ctxHint">Esc close • Right-click for menu • Drag bar to move • C = critical • O = override</div>
        </div>
      )}
    </div>
  );
});
export default Gantt;
