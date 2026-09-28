'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChartNoAxesCombined, LayoutDashboard, Sparkles } from 'lucide-react';

const items=[
  {href:'/',label:'Overview',icon:LayoutDashboard},
  {href:'/rooms',label:'Room Finder',icon:Building2},
  {href:'/attendance',label:'Attendance',icon:ChartNoAxesCombined},
];
export function AppNav(){
  const path=usePathname();
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-lime-300 shadow-lg shadow-slate-200"><Sparkles size={20}/></span>
        <span className="min-w-0"><span className="block truncate text-sm font-black tracking-tight text-slate-950">Roomwise Student Hub</span><span className="hidden text-[11px] font-medium text-slate-500 sm:block">SRM Tiruchirappalli · SEEE</span></span>
      </Link>
      <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1" aria-label="Primary navigation">
        {items.map(({href,label,icon:Icon})=>{const active=href==='/'?path===href:path.startsWith(href);return <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${active?'bg-slate-950 text-white shadow-sm':'text-slate-600 hover:bg-white hover:text-slate-950'}`}><Icon size={16}/><span className="hidden sm:inline">{label}</span></Link>})}
      </nav>
    </div>
  </header>;
}
