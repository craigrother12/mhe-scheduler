import React, { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertCircle, Clock, Package, Trash2, Plus, Loader2 } from 'lucide-react';

const LEAD_TIME_PATTERNS = [
  // Most specific first
  { regex: /estimated\s*lead\s*time[^.]*?(\d+)\s*[-–to]+\s*(\d+)\s*(days?|weeks?|months?)/gi, type: 'Lead Time' },
  { regex: /lead\s*time[:\s]*(\d+)\s*[-–to]*\s*(\d+)?\s*(days?|weeks?|months?|d|w|m)\b/gi, type: 'Lead Time' },
  { regex: /leadtime[:\s]*(\d+)\s*[-–to]*\s*(\d+)?\s*(days?|weeks?|months?)/gi, type: 'Lead Time' },
  { regex: /lead\s*time\s*is\s*(\d+)\s*[-–to]*\s*(\d+)?\s*(weeks?|days?)/gi, type: 'Lead Time' },
  { regex: /current\s*lead\s*time[^.]{0,30}?(\d+)\s*weeks?/gi, type: 'Lead Time' },
  { regex: /current\s*lead[-\s]*time\s*is\s*([a-z]+)\s*\((\d+)\)\s*weeks?/gi, type: 'Lead Time Word' },
  { regex: /lead[-\s]*time\s*is\s*([a-z]+)\s*\((\d+)\)\s*weeks?/gi, type: 'Lead Time Word' },
  { regex: /(\d+)\s*[-–]\s*(\d+)\s*weeks?\s*(lead|delivery|shipping)?/gi, type: 'Range' },
  { regex: /(\d+)\s*to\s*(\d+)\s*weeks?/gi, type: 'Range' },
  { regex: /(\d+)\s*weeks?\s*from\s*receipt/gi, type: 'Lead Time' },
  { regex: /estimated\s*lead\s*time[^.]{0,60}?(\d+)\s*weeks?/gi, type: 'Lead Time' },
  { regex: /delivery\s*time\s*[:\s]*(\d+)\s*(weeks?|days?)/gi, type: 'Delivery' },
  { regex: /delivery\s*[:\s]*(\d+)\s*[-–to]*\s*(\d+)?\s*(days?|weeks?|months?)\b/gi, type: 'Delivery' },
  { regex: /shipping\s*lead\s*time[^.]{0,40}?(\d+)\s*weeks?/gi, type: 'Delivery' },
  { regex: /turnaround\s*time[^.]{0,30}?(\d+)[-\s]*working\s*days?/gi, type: 'Turnaround' },
  { regex: /turnaround\s*time[^.]{0,30}?(\d+)\s*(days?|weeks?)/gi, type: 'Turnaround' },
  { regex: /ARO[:\s]*(\d+)\s*[-–to]*\s*(\d+)?\s*(days?|weeks?|months?|d|w)?/gi, type: 'ARO' },
  { regex: /(\d+)\s*(days?|weeks?|months?)\s*ARO/gi, type: 'ARO' },
  { regex: /after\s*receipt\s*of\s*(?:order|drawings?)[:\s]*(\d+)\s*(days?|weeks?)/gi, type: 'ARO' },
  { regex: /(\d+)\s*weeks?\s*after\s*(?:order|receipt)/gi, type: 'ARO' },
  { regex: /(\d+)\s*weeks?\s*until[^.]{0,30}?ready\s*to\s*ship/gi, type: 'Delivery' },
  { regex: /est\.?\s*delivery[:\s]*(\d+)\s*(days?|weeks?)/gi, type: 'Est Delivery' },
  { regex: /ship\s*in\s*(\d+)\s*(days?|weeks?)/gi, type: 'Ship' },
];

const WORD_TO_NUM = {
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
  twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90
};

function parseWordNumber(str) {
  const lower = str.toLowerCase().trim();
  if (WORD_TO_NUM[lower] !== undefined) return WORD_TO_NUM[lower];
  // handle twenty, etc with possible dash
  const parts = lower.split(/[-\s]+/);
  let total = 0;
  for (const p of parts) {
    if (WORD_TO_NUM[p] !== undefined) total += WORD_TO_NUM[p];
  }
  return total || null;
}

const TASK_NAME_PATTERNS = [
  /quote\s*for[:\s]*(.+)/i,
  /proposal\s*for[:\s]*(.+)/i,
  /equipment[:\s]*(.+)/i,
  /system[:\s]*(.+)/i,
  /item[:\s]*(.+)/i,
];

function convertToDays(num1, num2, unit) {
  let n = Number(num1);
  if (num2) {
    // range like 6-8 weeks -> take max for safety
    const n2 = Number(num2);
    n = Math.max(n, n2);
  }
  const u = (unit || '').toLowerCase();
  if (u.startsWith('w')) return Math.round(n * 5); // 1 week = 5 work days
  if (u.startsWith('m')) return Math.round(n * 20); // 1 month = 20 work days
  if (u.startsWith('d') || u === 'd') return Math.round(n);
  // default assume weeks if no unit but context is procurement
  return Math.round(n);
}

function extractLeadTimes(text) {
  const results = [];
  LEAD_TIME_PATTERNS.forEach(p => {
    const regex = new RegExp(p.regex.source, p.regex.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      let num1 = null;
      let num2 = null;
      let unit = null;

      // Handle word-number patterns like "twenty (20) weeks"
      if (p.type === 'Lead Time Word') {
        const wordNum = parseWordNumber(match[1]);
        const digitNum = Number(match[2]);
        num1 = String(digitNum || wordNum || match[2] || match[1]);
        unit = 'weeks';
      } else {
        // Collect all numeric captures and unit captures
        // For patterns like (\d+)\s*to\s*(\d+)\s*weeks? -> groups: [4,5]
        // For (\d+)\s*weeks? -> groups: [number, unit?]
        const groups = match.slice(1); // remove full match
        const numericGroups = groups.filter(g => g && !isNaN(Number(g)) && /^\d+$/.test(g.trim()));
        const unitGroups = groups.filter(g => g && /days?|weeks?|months?|d|w|m/i.test(g));

        if (numericGroups.length >= 2) {
          num1 = numericGroups[0];
          num2 = numericGroups[1];
        } else if (numericGroups.length === 1) {
          num1 = numericGroups[0];
        } else {
          // fallback to first group if it's numeric or word number
          num1 = match[1];
        }

        if (unitGroups.length > 0) {
          unit = unitGroups[0];
        }

        // For range patterns, force weeks if no unit found
        if ((p.type === 'Range' || /to/.test(p.regex.source)) && numericGroups.length >= 2) {
          num1 = numericGroups[0];
          num2 = numericGroups[1];
          unit = unit || 'weeks'; // force weeks for X to Y Weeks
        }

        // For patterns like (\d+)\s*[-–]\s*(\d+)\s*weeks? -> ensure unit = weeks if missing
        if (p.type === 'Range') {
          unit = unit || 'weeks';
        }
      }

      // If num1 is a word like "twenty", convert it
      if (num1 && isNaN(Number(num1))) {
        const wn = parseWordNumber(num1);
        if (wn) num1 = String(wn);
      }
      if (num2 && isNaN(Number(num2))) {
        const wn2 = parseWordNumber(num2);
        if (wn2) num2 = String(wn2);
      }

      // Skip if still not numeric
      if (!num1 || isNaN(Number(num1))) continue;

      const days = convertToDays(num1, num2, unit);
      if (days > 0 && days < 1000) {
        results.push({
          type: p.type.includes('Word') ? 'Lead Time' : p.type,
          raw: match[0].trim().slice(0, 80),
          num1,
          num2,
          unit: unit || 'weeks',
          days,
          index: match.index,
        });
      }
    }
  });
  // Deduplicate and sort by confidence (prefer Lead Time > ARO > Delivery), then LONGER lead time for safety
  const priority = { 'Lead Time': 0, 'ARO': 1, 'Delivery': 2, 'Range': 2, 'Turnaround': 2, 'Est Delivery': 3, 'Ship': 3 };
  results.sort((a, b) => {
    const pa = priority[a.type] ?? 10;
    const pb = priority[b.type] ?? 10;
    if (pa !== pb) return pa - pb;
    return b.days - a.days; // longer first (8-10 weeks -> use 10)
  });
  // Return unique by days (keep first occurrence per days value)
  const seenDays = new Set();
  const unique = [];
  for (const r of results) {
    if (!seenDays.has(r.days)) {
      seenDays.add(r.days);
      unique.push(r);
    }
  }
  return unique;
}

function extractTaskInfo(text, fileName) {
  // Clean filename is PRIMARY source for task name - much more reliable than PDF text
  // Example: "12356 VQ ModSort.pdf" -> "ModSort", "12356_VQ_ModSort.pdf" -> "ModSort"
  let cleanName = fileName.replace(/\.[^/.]+$/, ''); // remove ext
  // Remove project prefix like "12356 VQ ", "12356_VQ_", "12356 VQ", "12356_"
  cleanName = cleanName.replace(/^\d+[_-\s]*VQ[_-\s]*/i, '').trim();
  cleanName = cleanName.replace(/^\d+[_-\s]+/, '').trim(); // remove leading numbers
  cleanName = cleanName.replace(/^VQ[_-\s]*/i, '').trim();
  cleanName = cleanName.replace(/\.pdf$/i, '').trim(); // in case double ext like .pdf.txt
  cleanName = cleanName.replace(/[_-]+/g, ' ').trim();
  cleanName = cleanName.replace(/\s{2,}/g, ' ').trim();
  // Remove common junk words but keep meaningful
  cleanName = cleanName.replace(/\b(quote|proposal|est|estimate|vquo|txt)\b/gi, '').trim().replace(/\s{2,}/g, ' ');
  if (cleanName.length > 80) cleanName = cleanName.slice(0, 80).trim();
  if (!cleanName) cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();

  // Vendor extraction - try to find company name in first 15 lines, but filter out table headers
  let vendor = '';
  const lines = text.split(/[\n\r]+/).slice(0, 15).map(l => l.trim()).filter(l => l.length >= 3 && l.length <= 60);
  const junkPatterns = /QTY|QTE|PRODUCT|NUMERO|DESCRIPTION|DISCOUNT|ESCOMPTE|COMMENT|SPECIFICATION|NET\s+30|VALID|SUBJECT|PAGE/i;
  const goodLines = lines.filter(l => !junkPatterns.test(l) && !/^\d+[\s\d]*$/.test(l) && !/^[\W_]+$/.test(l));
  if (goodLines.length > 0) {
    // Prefer lines that look like company names (Title Case, 2-4 words, not too many lowercase)
    for (const line of goodLines) {
      if (/^[A-Z][A-Za-z]+(\s+[A-Z][A-Za-z]+){0,3}$/.test(line) && line.length < 40) {
        vendor = line.slice(0, 50);
        break;
      }
    }
    // Fallback to first good line if no title case found
    if (!vendor && goodLines[0].length < 40 && !/[a-z]{20,}/.test(goodLines[0])) {
      vendor = goodLines[0].slice(0, 50);
    }
  }

  // If vendor looks like task name (same), clear vendor
  if (vendor && cleanName.toLowerCase().includes(vendor.toLowerCase().slice(0, 8))) {
    vendor = '';
  }

  return { taskName: cleanName || 'Procurement Item', vendor };
}

async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const buffer = await file.arrayBuffer();
  
  if (['xlsx', 'xls'].includes(ext)) {
    try {
      const mod = await import(/* @vite-ignore */ 'https://esm.sh/xlsx@0.18.5');
      const lib = mod.default || mod;
      const workbook = lib.read(buffer, { type: 'array' });
      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const json = lib.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        json.forEach(row => { fullText += row.join(' ') + '\n'; });
      });
      return fullText;
    } catch (e) {
      console.warn('XLSX parse fallback', e);
      try { return new TextDecoder().decode(buffer); } catch { return file.name; }
    }
  } else if (ext === 'pdf') {
    try {
      const mod = await import(/* @vite-ignore */ 'https://esm.sh/pdfjs-dist@3.11.174');
      const lib = mod.default || mod;
      if (lib.GlobalWorkerOptions) {
        try { lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`; } catch {}
      }
      const pdf = await lib.getDocument({ data: buffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(it => it.str || '');
        fullText += strings.join(' ') + '\n';
      }
      return fullText;
    } catch (e) {
      console.warn('PDF parse fallback', e);
      return file.name;
    }
  } else if (['docx', 'doc'].includes(ext)) {
    try {
      const mod = await import(/* @vite-ignore */ 'https://esm.sh/mammoth@1.6.0');
      const lib = mod.default || mod;
      const result = await lib.extractRawText({ arrayBuffer: buffer });
      return result.value;
    } catch (e) {
      console.warn('DOCX fallback', e);
      try { return new TextDecoder().decode(buffer).slice(0, 10000); } catch { return file.name; }
    }
  } else if (ext === 'txt' || ext === 'csv') {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  } else {
    // Try as text
    const decoder = new TextDecoder();
    return decoder.decode(buffer).slice(0, 20000);
  }
}

export default function QuoteParser({ onInsertTasks, onClose, projectStart }) {
  const [files, setFiles] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback(async (fileList) => {
    const fileArray = Array.from(fileList);
    setFiles(fileArray);
    setParsing(true);
    setProgress(0);
    const parsed = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress(Math.round((i / fileArray.length) * 100));
      try {
        const text = await extractTextFromFile(file);
        const leadTimes = extractLeadTimes(text);
        const { taskName, vendor } = extractTaskInfo(text, file.name);
        
        const bestLeadTime = leadTimes[0] || null;
        
        parsed.push({
          id: Math.random().toString(36).slice(2),
          fileName: file.name,
          fileSize: file.size,
          vendor,
          taskName: bestLeadTime ? `${taskName}` : taskName,
          originalTaskName: taskName,
          leadTimes,
          selectedLeadTime: bestLeadTime,
          duration: bestLeadTime ? bestLeadTime.days : 10,
          rawText: text.slice(0, 500),
          confidence: bestLeadTime ? (bestLeadTime.type === 'Lead Time' ? 'high' : bestLeadTime.type === 'ARO' ? 'high' : 'medium') : 'low',
          error: null,
        });
      } catch (err) {
        parsed.push({
          id: Math.random().toString(36).slice(2),
          fileName: file.name,
          fileSize: file.size,
          vendor: '',
          taskName: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
          originalTaskName: '',
          leadTimes: [],
          selectedLeadTime: null,
          duration: 10,
          rawText: '',
          confidence: 'low',
          error: err.message,
        });
      }
    }
    
    // Sort by confidence: high -> medium -> low
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    parsed.sort((a, b) => {
      const ca = confidenceOrder[a.confidence] ?? 2;
      const cb = confidenceOrder[b.confidence] ?? 2;
      if (ca !== cb) return ca - cb;
      // Within same confidence, longer lead time first
      return (b.duration || 0) - (a.duration || 0);
    });

    setResults(parsed);
    setParsing(false);
    setProgress(100);
  }, []);

  const updateResult = (id, field, value) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeResult = (id) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const handleInsert = () => {
    const tasks = results.map(r => ({
      name: `Procurement - ${r.taskName}${r.vendor ? ` (${r.vendor})` : ''}`,
      phase: 'Phase 4: Procurement',
      duration: Math.max(1, Number(r.duration) || 1),
      area: r.vendor || 'Procurement',
      resource: r.vendor || '',
      supplier: r.vendor || '',
      percentComplete: 0,
      start: projectStart || '',
      isProcurement: true,
      sourceFile: r.fileName,
      leadTimeRaw: r.selectedLeadTime?.raw || '',
    }));
    onInsertTasks(tasks);
    setResults([]);
    setFiles([]);
    onClose();
  };

  const totalLeadTime = results.reduce((sum, r) => sum + (Number(r.duration) || 0), 0);

  return (
    <div className="quoteParserOverlay">
      <div className="quoteParserModal">
        <div className="qpHeader">
          <div>
            <h2><Package size={20} style={{display:'inline', marginRight:8}}/>Vendor Quote Parser</h2>
            <p>Upload Excel, Word, or PDF quotes — auto-extract lead times and create procurement tasks</p>
          </div>
          <button onClick={onClose} className="closeBtn">✕</button>
        </div>

        {files.length === 0 ? (
          <div className="qpDropZone" onDragOver={e=>e.preventDefault()} onDrop={e=>{ e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
            <Upload size={48} style={{color:'#0A2342', marginBottom:12}}/>
            <h3>Drop vendor quotes here</h3>
            <p>Supports PDF, Excel (.xlsx, .xls), Word (.docx, .doc) — up to 20 files at once</p>
            <input type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc,.txt,.csv" onChange={e=>handleFiles(e.target.files)} style={{display:'none'}} id="qpFileInput"/>
            <label htmlFor="qpFileInput" className="qpUploadBtn">Choose Files</label>
            <div className="qpHints">
              <div><Clock size={14}/> Looks for: "Lead Time", "Delivery", "ARO", "weeks ARO", "X-Y weeks"</div>
              <div><FileText size={14}/> Extracts vendor name + item from document header</div>
            </div>
          </div>
        ) : (
          <>
            {parsing ? (
              <div className="qpParsing">
                <Loader2 size={24} className="spin"/>
                <p>Parsing {files.length} files... {progress}%</p>
                <div className="qpProgressBar"><div style={{width:`${progress}%`}}></div></div>
              </div>
            ) : (
              <>
                <div className="qpSummary">
                  <div className="qpStat"><strong>{results.length}</strong> quotes parsed</div>
                  <div className="qpStat"><strong>{results.filter(r=>r.selectedLeadTime).length}</strong> with lead time found</div>
                  <div className="qpStat"><strong>{(totalLeadTime/5).toFixed(1).replace(/\.0$/,'')}</strong> total weeks</div>
                  <button onClick={()=>{ setFiles([]); setResults([]); }} className="qpReset">Clear All</button>
                </div>

                <div className="qpResults">
                  {results.map(r => (
                    <div key={r.id} className={`qpCard ${r.confidence}`}>
                      <div className="qpCardHeader">
                        <div className="qpFileName"><FileText size={14}/>{r.fileName} <span style={{fontSize:10, color:'#64748B'}}>({(r.fileSize/1024).toFixed(0)} KB)</span></div>
                        <button onClick={()=>removeResult(r.id)} className="qpRemove"><Trash2 size={14}/></button>
                      </div>
                      
                      <div className="qpCardBody">
                        <div className="qpField">
                          <label>Task Name</label>
                          <input value={r.taskName} onChange={e=>updateResult(r.id, 'taskName', e.target.value)} placeholder="e.g., Conveyor Motor"/>
                        </div>
                        <div className="qpRow">
                          <div className="qpField" style={{flex:1}}>
                            <label>Vendor</label>
                            <input value={r.vendor} onChange={e=>updateResult(r.id, 'vendor', e.target.value)} placeholder="Vendor name"/>
                          </div>
                          <div className="qpField" style={{width:110}}>
                            <label>Lead (weeks)</label>
                            <input type="number" min="0.5" step="0.5" value={(Number(r.duration)/5).toFixed(1).replace(/\.0$/,'')} onChange={e=>{
                              const w = parseFloat(e.target.value)||0;
                              updateResult(r.id, 'duration', Math.max(1, Math.round(w*5)));
                            }}/>
                          </div>
                        </div>

                        {r.leadTimes.length > 0 ? (
                          <div className="qpLeadTimes">
                            <label>Detected:</label>
                            {r.leadTimes.slice(0,3).map((lt, idx) => (
                              <button key={idx} 
                                className={`ltChip ${r.selectedLeadTime?.raw===lt.raw?'selected':''}`}
                                onClick={()=>{
                                  updateResult(r.id, 'selectedLeadTime', lt);
                                  updateResult(r.id, 'duration', lt.days);
                                }}
                              >
                                <Clock size={10}/>{lt.raw} → {(lt.days/5).toFixed(1).replace(/\.0$/,'')}w
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="qpNoLead"><AlertCircle size={12}/> No lead time found — using 2w default. Edit manually in weeks.</div>
                        )}

                        {r.confidence !== 'high' && r.rawText && (
                          <details className="qpRaw"><summary>Preview text</summary><pre>{r.rawText.slice(0,400)}</pre></details>
                        )}
                        {r.error && <div className="qpError">Error: {r.error}</div>}
                      </div>

                      <div className="qpCardFooter">
                        <span className={`conf ${r.confidence}`}><Check size={10}/>{r.confidence} confidence</span>
                        {r.selectedLeadTime && <span style={{fontSize:11, color:'#64748B'}}>Source: "{r.selectedLeadTime.raw}" ({r.selectedLeadTime.type})</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="qpActions">
                  <div style={{fontSize:12, color:'#64748B'}}>
                    Will create {results.length} procurement tasks in Phase 4: Procurement
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={onClose} className="qpCancel">Cancel</button>
                    <button onClick={handleInsert} className="qpInsert"><Plus size={16}/> Insert {results.length} Procurement Tasks</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
