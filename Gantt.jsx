import React, { useEffect, useRef } from 'react';

const asDate = (value) => new Date(`${value}T12:00:00`);
const toIso = (value) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const addDays = (value, amount) => {
  const next = asDate(value);
  next.setDate(next.getDate() + Number(amount));
  return toIso(next);
};
const dayDiff = (start, finish) => Math.round((asDate(finish) - asDate(start)) / 86400000);
const shortDate = (value) => asDate(value).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

export default function Gantt({ rows, zoom = 'days' }) {
  const viewportRef = useRef(null);
  const followerRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const follower = followerRef.current;
    if (!viewport || !follower) return undefined;

    let syncing = false;
    const syncFollower = () => {
      if (syncing) return;
      syncing = true;
      follower.scrollLeft = viewport.scrollLeft;
      syncing = false;
    };
    const syncViewport = () => {
      if (syncing) return;
      syncing = true;
      viewport.scrollLeft = follower.scrollLeft;
      syncing = false;
    };

    viewport.addEventListener('scroll', syncFollower);
    follower.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('scroll', syncFollower);
      follower.removeEventListener('scroll', syncViewport);
    };
  }, [rows, zoom]);

  if (!rows?.length) return <div className="emptyGantt">Add tasks first.</div>;

  const nominalCell = zoom === 'days' ? 42 : zoom === 'weeks' ? 14 : 6;
  const taskColumnWidth = 360;
  const rowHeight = 46;

  const sortedStarts = rows.map((row) => row.start).filter(Boolean).sort();
  const sortedFinishes = rows.map((row) => row.finish).filter(Boolean).sort();
  const timelineStartDate = asDate(sortedStarts[0]);
  timelineStartDate.setDate(timelineStartDate.getDate() - 2);
  const timelineEndDate = asDate(sortedFinishes.at(-1));
  timelineEndDate.setDate(timelineEndDate.getDate() + 7);
  const timelineStart = toIso(timelineStartDate);
  const timelineEnd = toIso(timelineEndDate);
  const dayCount = dayDiff(timelineStart, timelineEnd) + 1;
  const timelineWidth = Math.max(980, dayCount * nominalCell);
  const cellWidth = timelineWidth / dayCount;
  const days = Array.from({ length: dayCount }, (_, index) => addDays(timelineStart, index));
  const xPosition = (value) => dayDiff(timelineStart, value) * cellWidth;

  const months = [];
  const weeks = [];
  days.forEach((value, index) => {
    const key = asDate(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const last = months.at(-1);
    if (!last || last.key !== key) months.push({ key, start: index, count: 1 });
    else last.count += 1;
  });
  days.forEach((value, index) => {
    const current = asDate(value);
    const key = `Week of ${shortDate(addDays(value, -current.getDay()))}`;
    const last = weeks.at(-1);
    if (!last || last.key !== key) weeks.push({ key, start: index, count: 1 });
    else last.count += 1;
  });

  return (
    <div className="ganttShell">
      <div className="ganttViewport" ref={viewportRef}>
        <div className="ganttCanvas" style={{ width: taskColumnWidth + timelineWidth }}>
          <div className="ganttHeader">
            <div className="ganttTaskHeader" style={{ width: taskColumnWidth }}>Task</div>
            <div className="ganttScale" style={{ width: timelineWidth }}>
              <div className="monthRow">
                {months.map((month) => (
                  <div key={month.key} style={{ left: month.start * cellWidth, width: month.count * cellWidth }}>{month.key}</div>
                ))}
              </div>
              <div className="weekRow">
                {weeks.map((week) => (
                  <div key={week.start} style={{ left: week.start * cellWidth, width: week.count * cellWidth }}>{zoom === 'months' ? '' : week.key}</div>
                ))}
              </div>
              <div className="dateRow">
                {days.map((value, index) => {
                  const weekday = asDate(value).getDay();
                  return (
                    <div key={value} className={weekday === 0 || weekday === 6 ? 'weekend' : ''} style={{ left: index * cellWidth, width: cellWidth }}>
                      {zoom === 'days' ? <><b>{asDate(value).toLocaleDateString('en-US', { weekday: 'short' })}</b><span>{shortDate(value)}</span></> : zoom === 'weeks' && weekday === 1 ? <span>{shortDate(value)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ganttRows">
            {rows.map((row) => {
              const duration = Math.max(1, Number(row.duration) || dayDiff(row.start, row.finish) + 1);
              const baselineStart = row.baselineStart || row.baseline || '';
              const baselineFinish = row.baselineFinish || (baselineStart ? addDays(baselineStart, duration - 1) : '');
              return (
                <div className="ganttRow" style={{ height: rowHeight }} key={row.uid}>
                  <div className="ganttTaskCell" style={{ width: taskColumnWidth }}><b>{row.id}</b><span>{row.name}</span></div>
                  <div className="ganttTimeline" style={{ width: timelineWidth, backgroundSize: `${cellWidth}px 100%` }}>
                    {baselineStart && baselineFinish && <div className="baselineLine" style={{ left: xPosition(baselineStart), width: Math.max(cellWidth, (dayDiff(baselineStart, baselineFinish) + 1) * cellWidth) }} />}
                    <div className="ganttBubble" title={`${row.start} to ${row.finish}`} style={{ left: xPosition(row.start), width: Math.max(cellWidth, duration * cellWidth) }}>{row.zone || 'Zone 1'} • {duration}d</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ganttFollower" ref={followerRef}><div style={{ width: taskColumnWidth + timelineWidth, height: 1 }} /></div>
    </div>
  );
}
