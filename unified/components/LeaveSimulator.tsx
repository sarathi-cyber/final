'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, HeartPulse } from 'lucide-react';
import { Subject, TimetableEntry } from '@/types/attendance';
import { attendancePercentage } from '@/lib/attendance';

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function LeaveSimulator({ subjects, timetable, planningDate }: { subjects: Subject[]; timetable: TimetableEntry[]; planningDate: string }) {
  const [startDate, setStartDate] = useState(planningDate);
  const [days, setDays] = useState('1');
  const [kind, setKind] = useState<'OD'|'Medical Leave'>('Medical Leave');
  const [treatment, setTreatment] = useState<'attended'|'absent'>('absent');
  useEffect(() => { if (planningDate && (!startDate || startDate < planningDate)) setStartDate(planningDate); }, [planningDate, startDate]);
  const endDate = useMemo(() => shiftDate(startDate || planningDate || '2026-08-29', Math.max(0, Number(days || 1) - 1)), [startDate, planningDate, days]);
  const affected = useMemo(() => timetable.filter(e => e.date >= startDate && e.date <= endDate), [timetable, startDate, endDate]);
  const projection = useMemo(() => {
    const matches = (entryName: string, subjectName: string) => { const a=entryName.toLowerCase(), b=subjectName.toLowerCase(); return a===b || a.includes(b) || b.includes(a); };
    const projected = subjects.map(s => {
      const n = affected.filter(e => matches(e.subject, s.name)).length;
      return { ...s, affected: n, projected: attendancePercentage(s.attended + (treatment === 'attended' ? n : 0), s.conducted + n) };
    });
    const attended = projected.reduce((sum,s) => sum + s.attended + (treatment === 'attended' ? s.affected : 0), 0);
    const conducted = projected.reduce((sum,s) => sum + s.conducted + s.affected, 0);
    return { projected, overall: attendancePercentage(attended, conducted), total: affected.length };
  }, [subjects, affected, treatment]);
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><HeartPulse size={20}/></div><div><h2 className="font-bold">OD & medical-leave simulator</h2><p className="text-sm text-slate-500">Preview the impact of scheduled classes during a leave period. Nothing changes in your saved attendance.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label><span className="label">Leave type</span><select className="field" value={kind} onChange={e=>setKind(e.target.value as 'OD'|'Medical Leave')}><option>Medical Leave</option><option>OD</option></select></label>
      <label><span className="label">Start date</span><input className="field" type="date" value={startDate} min={planningDate} onChange={e=>setStartDate(e.target.value)}/></label>
      <label><span className="label">Duration (days)</span><input className="field" type="number" min="1" max="90" value={days} onChange={e=>setDays(e.target.value)}/></label>
      <label><span className="label">How your institution counts it</span><select className="field" value={treatment} onChange={e=>setTreatment(e.target.value as 'attended'|'absent')}><option value="absent">Count as absence</option><option value="attended">Credit as attended</option></select></label>
    </div>
    <div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16}/>{kind}: {startDate} to {endDate}</div><p className="mt-1 text-sm text-slate-600">{projection.total} scheduled class{projection.total===1?'':'es'} fall in this period. Projected overall attendance: <strong>{projection.overall.toFixed(2)}%</strong>.</p><p className="mt-1 text-xs text-slate-500">The projection assumes each scheduled class in this period is conducted. Confirm whether approved OD/medical leave is credited under your institution’s rules.</p></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{projection.projected.map(s=><div key={s.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><span>{s.name} <span className="text-slate-400">({s.affected} affected)</span></span><strong className={s.projected<75?'text-red-700':'text-emerald-700'}>{s.projected.toFixed(1)}%</strong></div>)}</div>
    <style jsx>{`.label{display:block;margin-bottom:6px;font-size:12px;font-weight:700;color:#475569}.field{width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:white}`}</style>
  </section>;
}
