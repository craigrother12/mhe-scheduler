import React,{useEffect,useMemo,useRef,useState}from'react';import{createRoot}from'react-dom/client';import{Plus,Trash2,List,BarChart3,Save}from'lucide-react';import'./styles.css';
const P=['Project Kickoff & Baseline Planning','Detailed Engineering & Design','Procurement & Fabrication','Site Readiness & Logistics','Mechanical Installation','Electrical Installation','Controls & Software Integration','Testing, Commissioning & Startup','Training, Handover & Closeout'];
const names=[['Internal kickoff meeting',0],['Customer kickoff meeting',0],['Collect customer standards',0],['Confirm contract milestones',0],['Create WBS and baseline schedule',0],['Identify long-lead items and critical path',0],['Final field verification / as-built survey',1],['System layout and flow analysis',1],['Mechanical design',1],['Electrical design',1],['Controls design',1],['IFC drawings',1],['BOM release',1],['Purchase major equipment',2],['Purchase controls hardware',2],['Custom fabrication',2],['Factory Acceptance Test',2],['Freight coordination',2],['Receiving inspection',2],['Site readiness checklist',3],['Permits',3],['Safety plan',3],['Storage plan',3],['Manpower plan',3],['Pre-install meeting',3],['Mobilization',4],['Layout and anchor',4],['Racking / mezzanine / steel erection',4],['Conveyor / equipment set in place',4],['Mechanical completion',4],['Pneumatics / air piping',4],['Power distribution',5],['Motor and device wiring',5],['Panel set and power-up',6],['I/O checkout',6],['Network commissioning',6],['PLC code download',6],['HMI / WCS / WES integration',6],['WMS/ERP integration',6],['Safety system validation',6],['No-load testing',7],['Load testing',7],['Throughput testing',7],['Sortation accuracy testing',7],['Exception handling testing',7],['End-to-end integration testing',7],['SAT / Site Acceptance',7],['Punchlist resolution',7],['Burn-in / soak period',7],['Operator training',8],['Maintenance training',8],['Spare parts handover',8],['As-built documentation',8],['Final punchlist closeout',8],['Go-Live support',8],['Lessons learned',8],['Final invoicing',8]].map(([name,p],i)=>({name,phase:P[p],duration:[1,1,3,2,5,3,3,5,15,10,10,2,3,5,5,20,3,5,3,3,10,5,3,5,1,2,4,15,15,7,5,10,10,3,7,4,7,7,7,4,3,3,3,3,3,5,3,5,5,2,2,2,5,5,3,2,3][i]||3}));
const iso=d=>d.toISOString().slice(0,10),D=s=>new Date(s+'T12:00:00'),add=(s,n)=>{let d=D(s);d.setDate(d.getDate()+n);return iso(d)},diff=(a,b)=>Math.round((D(b)-D(a))/864e5),lab=s=>D(s).toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
function App(){let old=JSON.parse(localStorage.getItem('mhe6')||'null');const[rows,setRows]=useState(old?.rows||[]),[view,setView]=useState('list'),[start,setStart]=useState(old?.start||iso(new Date())),[zoom,setZoom]=useState('days');useEffect(()=>localStorage.setItem('mhe6',JSON.stringify({rows,start})),[rows,start]);let addTask=t=>setRows(r=>[...r,{...t,uid:crypto.randomUUID(),id:r.length+101,start,finish:add(start,t.duration-1),baseline:'',resource:'PM',supplier:'',zone:'Zone 1'}]);return <><header><b>MH Scheduler</b><input type="date" value={start} onChange={e=>setStart(e.target.value)}/><button onClick={()=>setView('list')}><List size={15}/>List</button><button onClick={()=>setView('gantt')}><BarChart3 size={15}/>Gantt</button><button onClick={()=>setRows(r=>r.map(x=>({...x,baseline:x.start})))}><Save size={15}/>Baseline</button><select value={zoom} onChange={e=>setZoom(e.target.value)}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></header><main><aside>{P.map(p=><section key={p}><h3>{p}</h3>{names.filter(x=>x.phase===p).map(t=><button onClick={()=>addTask(t)} key={t.name}><Plus size={13}/>{t.name}</button>)}</section>)}</aside><article>{view==='list'?<Table rows={rows} setRows={setRows}/>:<Gantt rows={rows} zoom={zoom}/>}</article></main></>}
function Table({rows,setRows}){let patch=(u,c)=>setRows(r=>r.map(x=>x.uid===u?{...x,...c,finish:c.duration?add(x.start,+c.duration-1):x}:x));return <table><thead><tr><th>ID</th><th>Task</th><th>Phase</th><th>Start</th><th>Dur</th><th>Finish</th><th>Resource</th><th>Supplier</th><th/></tr></thead><tbody>{rows.map(x=><tr key={x.uid}><td>{x.id}</td><td>{x.name}</td><td>{x.phase}</td><td><input type="date" value={x.start} onChange={e=>patch(x.uid,{start:e.target.value,finish:add(e.target.value,x.duration-1)})}/></td><td><input type="number" value={x.duration} onChange={e=>patch(x.uid,{duration:e.target.value})}/></td><td>{x.finish}</td><td><select value={x.resource} onChange={e=>patch(x.uid,{resource:e.target.value})}>{['PM','Mechanical Crew','Electrical Crew','Controls Tech','Commissioning Team','Custom'].map(r=><option key={r}>{r}</option>)}</select>{x.resource==='Custom'&&<input placeholder="Custom resource" onChange={e=>patch(x.uid,{customResource:e.target.value})}/>}</td><td><input value={x.supplier} onChange={e=>patch(x.uid,{supplier:e.target.value})}/></td><td><button onClick={()=>setRows(r=>r.filter(y=>y.uid!==x.uid))}><Trash2 size={14}/></button></td></tr>)}</tbody></table>}
function Gantt({rows,zoom}){
  const sc=useRef(),bottom=useRef();
  useEffect(()=>{const a=sc.current,b=bottom.current;if(!a||!b)return;let lock=false;const fromChart=()=>{if(!lock){lock=true;b.scrollLeft=a.scrollLeft;lock=false}};const fromBottom=()=>{if(!lock){lock=true;a.scrollLeft=b.scrollLeft;lock=false}};a.addEventListener('scroll',fromChart);b.addEventListener('scroll',fromBottom);return()=>{a.removeEventListener('scroll',fromChart);b.removeEventListener('scroll',fromBottom)}},[rows,zoom]);
  if(!rows.length)return <div className="emptyGantt">Add tasks first.</div>;
  const nominal=zoom==='days'?42:zoom==='weeks'?14:6,taskW=360,rowH=46;
  let min=D(rows.map(x=>x.start).sort()[0]);min.setDate(min.getDate()-2);
  let max=D(rows.map(x=>x.finish).sort().at(-1));max.setDate(max.getDate()+7);
  const count=diff(iso(min),iso(max))+1;
  const timelineW=Math.max(980,count*nominal);
  const cell=timelineW/count;
  const days=Array.from({length:count},(_,i)=>add(iso(min),i));
  const x=d=>diff(iso(min),d)*cell;
  const months=[]; const weeks=[];
  days.forEach((d,i)=>{const key=D(d).toLocaleDateString('en-US',{month:'long',year:'numeric'});const last=months.at(-1);if(!last||last.key!==key)months.push({key,start:i,count:1});else last.count++});
  days.forEach((d,i)=>{const dt=D(d),sun=add(d,-dt.getDay()),key=`Week of ${lab(sun)}`;const last=weeks.at(-1);if(!last||last.key!==key)weeks.push({key,start:i,count:1});else last.count++});
  return <div className="ganttShell">
    <div className="ganttViewport" ref={sc}>
      <div className="ganttCanvas" style={{width:taskW+timelineW}}>
        <div className="ganttHeader">
          <div className="ganttTaskHeader" style={{width:taskW}}>Task</div>
          <div className="ganttScale" style={{width:timelineW}}>
            <div className="monthRow">{months.map(m=><div key={m.key} style={{left:m.start*cell,width:m.count*cell}}>{m.key}</div>)}</div>
            <div className="weekRow">{weeks.map(w=><div key={w.start} style={{left:w.start*cell,width:w.count*cell}}>{zoom==='months'?'':w.key}</div>)}</div>
            <div className="dateRow">{days.map((d,i)=>{const wd=D(d).getDay();return <div className={wd===0||wd===6?'weekend':''} style={{left:i*cell,width:cell}} key={d}>{zoom==='days'?<><b>{D(d).toLocaleDateString('en-US',{weekday:'short'})}</b><span>{lab(d)}</span></>:zoom==='weeks'&&wd===1?<span>{lab(d)}</span>:null}</div>})}</div>
          </div>
        </div>
        <div className="ganttRows">
          {rows.map(r=><div className="ganttRow" style={{height:rowH}} key={r.uid}>
            <div className="ganttTaskCell" style={{width:taskW}}><b>{r.id}</b><span>{r.name}</span></div>
            <div className="ganttTimeline" style={{width:timelineW,backgroundSize:`${cell}px 100%`}}>
              {r.baseline&&<div className="baselineLine" style={{left:x(r.baseline),width:Math.max(cell,r.duration*cell)}}/>}
              <div className="ganttBubble" title={`${r.start} to ${r.finish}`} style={{left:x(r.start),width:Math.max(cell,r.duration*cell)}}>{r.zone} • {r.duration}d</div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
    <div className="ganttFollower" ref={bottom}><div style={{width:taskW+timelineW,height:1}}/></div>
  </div>
}};createRoot(document.getElementById('root')).render(<App/>);
