'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Subject } from '@/types/attendance';
export function OverallHealthChart({ subjects }: { subjects: Subject[] }) {
  const attended = subjects.reduce((n,s)=>n+s.attended,0);
  const missed = subjects.reduce((n,s)=>n+Math.max(0,s.conducted-s.attended),0);
  const total = attended + missed;
  const pct = total ? attended / total * 100 : 0;
  const data = [{name:'Attended',value:attended},{name:'Missed',value:missed}];
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-soft"><h2 className="font-bold">Overall attendance health</h2><p className="text-sm text-slate-500">Weighted by total classes, not an average of subject percentages.</p><div className="mt-3 flex items-center gap-3"><div className="h-44 min-w-0 flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3}>{data.map((entry,i)=><Cell key={entry.name} fill={i===0?'#15956b':'#e2e8f0'}/>)}</Pie><Tooltip formatter={(v)=>[v,'Classes']}/></PieChart></ResponsiveContainer></div><div className="min-w-0"><p className="text-3xl font-black text-ink">{pct.toFixed(1)}%</p><p className="mt-1 text-xs text-slate-500">{attended} attended of {total} conducted</p><div className="mt-3 flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full bg-emerald-600"/> Attended</div><div className="mt-1 flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full bg-slate-200"/> Not attended</div></div></div></div>;
}
