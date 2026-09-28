import { AttendanceState } from '@/types/attendance';
const config = {
  safe:{label:'Safe', cls:'bg-emerald-50 text-emerald-700 ring-emerald-200'},
  warning:{label:'Warning', cls:'bg-amber-50 text-amber-700 ring-amber-200'},
  risk:{label:'Detention risk', cls:'bg-red-50 text-red-700 ring-red-200'},
  irreversible:{label:'Irreversible detention', cls:'bg-red-950 text-white ring-red-900'}
} as const;
export function StatusBadge({ state }: { state: AttendanceState }) { const c=config[state]; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${c.cls}`}>{c.label}</span>; }
