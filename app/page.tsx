import Link from 'next/link';
import { ArrowRight, Building2, ChartNoAxesCombined, Clock3, MessageCircleMore, ShieldCheck, Sparkles } from 'lucide-react';
import roomData from '@/data/roomwise.data.json';

export default function Home(){
  const active=roomData.sources.filter(s=>s.active).length;
  return <main className="min-h-[calc(100vh-65px)] bg-[radial-gradient(circle_at_top_left,_#ecfccb_0,_transparent_30%),radial-gradient(circle_at_85%_10%,_#dbeafe_0,_transparent_28%),#f5f7fb]">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-300">
        <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.15fr_.85fr] lg:p-14">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-lime-200"><Sparkles size={14}/> Unified finale build</span><h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-.04em] sm:text-5xl lg:text-6xl">Find a room. Plan attendance. Move as a squad.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">One campus command center that combines Roomwise live space discovery with the Attendance Predictor. The same timetable source now powers room occupancy and section-aware attendance planning.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-lime-200">Open live room map <ArrowRight size={17}/></Link><Link href="/attendance" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15">Open attendance planner <ArrowRight size={17}/></Link></div></div>
          <div className="grid grid-cols-2 gap-3 self-end"><Metric label="Tracked rooms" value={String(roomData.rooms.length)} icon={Building2}/><Metric label="Weekly room records" value={String(roomData.events.length)} icon={Clock3}/><Metric label="Current section PDFs" value={String(active)} icon={ShieldCheck}/><Metric label="One app" value="2 tools" icon={ChartNoAxesCombined}/></div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Feature href="/rooms" icon={Building2} kicker="Roomwise · Phase 2" title="Interactive availability map" text="See rooms change state live, inspect the next class, claim a free room, and launch a pre-filled WhatsApp invite for your squad." tags={['Live countdown','Claims','WhatsApp share','Natural-language search']}/>
        <Feature href="/attendance" icon={ChartNoAxesCombined} kicker="Attendance Predictor" title="Section-aware attendance planning" text="Enter your actual attended and conducted counts, calculate 75% and 90% targets, preview leave impact, and use the same timetable source for upcoming classes." tags={['75% safety','90% target','Leave simulator','Advisor']}/>
      </section>

      <section className="mt-8 surface p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Shared data foundation</p><h2 className="mt-2 text-2xl font-black tracking-tight">One timetable model, two student decisions.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">The extra timetable ZIPs match the PDFs already included in both projects. This build keeps one canonical copy, uses Roomwise’s structured room/event data for occupancy, and derives section schedule slots for attendance planning without double-counting split-lab rooms.</p></div><MessageCircleMore className="hidden shrink-0 text-slate-300 sm:block" size={54}/></div></section>
    </div>
  </main>
}
function Metric({label,value,icon:Icon}:{label:string;value:string;icon:any}){return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Icon size={18} className="text-lime-300"/><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>}
function Feature({href,icon:Icon,kicker,title,text,tags}:{href:string;icon:any;kicker:string;title:string;text:string;tags:string[]}){return <Link href={href} className="group surface p-6 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-4"><div className="rounded-2xl bg-slate-950 p-3 text-lime-300"><Icon size={22}/></div><ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-950"/></div><p className="eyebrow mt-6">{kicker}</p><h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p><div className="mt-5 flex flex-wrap gap-2">{tags.map(t=><span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{t}</span>)}</div></Link>}
