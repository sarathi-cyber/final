'use client';
import { useEffect,useMemo,useState } from 'react';
import { AlertTriangle, BookOpenCheck, CalendarDays, CheckCircle2, Database, RotateCcw, Target, Users } from 'lucide-react';
import { getDashboardSummary } from '@/lib/attendance';
import { Section,Subject,TimetableEntry } from '@/types/attendance';
import { SectionSelector } from '@/components/SectionSelector';
import { StatCard } from '@/components/StatCard';
import { SubjectTable } from '@/components/SubjectTable';
import { DetentionAlert } from '@/components/DetentionAlert';
import { Timetable } from '@/components/Timetable';
import { AttendanceChart } from '@/components/AttendanceChart';
import { LeaveSimulator } from '@/components/LeaveSimulator';
import { AttendanceAdvisor } from '@/components/AttendanceAdvisor';
import { OverallHealthChart } from '@/components/OverallHealthChart';
import preload from '@/data/preloaded-attendance.json';
import dataset from '@/data/timetable.dataset.json';
import { TimetableService } from '@/lib/server/TimetableService';

type CatalogSubject={id:string;name:string;code:string;slotCode?:string;faculty?:string;credits?:string};
type PreloadEntry={attended:number;conducted:number};
const timetableService = new TimetableService(dataset as any);
const bundledSections = timetableService.getAvailableSections();
const todayIST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

function defaultSubjects(sectionId:string,catalog:CatalogSubject[]):Subject[]{
 const entries=((preload.sections as Record<string,Record<string,PreloadEntry>>)[sectionId]||{});
 return catalog.map(s=>({id:s.id,name:s.name,code:s.code,slotCode:s.slotCode,faculty:s.faculty,credits:s.credits,attended:entries[s.id]?.attended??0,conducted:entries[s.id]?.conducted??0}));
}

export default function AttendancePage(){
 const [sections,setSections]=useState<Section[]>([]),[sectionId,setSectionId]=useState(''),[loadedSection,setLoadedSection]=useState(''),[subjects,setSubjects]=useState<Subject[]>([]),[catalog,setCatalog]=useState<CatalogSubject[]>([]),[futureDate,setFutureDate]=useState(''),[timetable,setTimetable]=useState<TimetableEntry[]>([]),[dataError,setDataError]=useState('');
 useEffect(()=>{
   setFutureDate(todayIST());
   setSections(bundledSections as Section[]);
   setSectionId(bundledSections[0]?.id??'');
 },[]);
 useEffect(()=>{
   if(!sectionId)return;
   setDataError('');
   try{
     const list=timetableService.getSubjectsForSection(sectionId) as CatalogSubject[];
     setCatalog(list);
     const defaults=defaultSubjects(sectionId,list);
     const key=`roomwise-attendance:${sectionId}`;
     try{const saved=localStorage.getItem(key);setSubjects(saved?JSON.parse(saved):defaults)}catch{setSubjects(defaults)}
     setLoadedSection(sectionId);
   }catch{setDataError('This section subject list could not be loaded from the bundled data.')}
 },[sectionId]);
 useEffect(()=>{
   if(!sectionId||!futureDate)return;
   try{
     const entries=timetableService.generateSchedule(sectionId,futureDate,'2026-11-29',{now:new Date()});
     setTimetable(entries.map((e:any)=>({id:e.slot.id+'-'+e.date,sectionId,subject:e.subject?.name??e.slot.subjectId,date:e.date,startTime:e.slot.startTime,endTime:e.slot.endTime,room:e.slot.room,faculty:e.subject?.faculty})));
   }catch{setDataError('This section timetable could not be loaded from the bundled data.')}
 },[sectionId,futureDate]);
 useEffect(()=>{if(!sectionId||loadedSection!==sectionId)return;try{localStorage.setItem(`roomwise-attendance:${sectionId}`,JSON.stringify(subjects))}catch{}},[subjects,sectionId,loadedSection]);
 const changeSection=(id:string)=>{setLoadedSection('');setSubjects([]);setCatalog([]);setTimetable([]);setSectionId(id)};
 const resetPreloaded=()=>{const next=defaultSubjects(sectionId,catalog);setSubjects(next);try{localStorage.removeItem(`roomwise-attendance:${sectionId}`)}catch{}};
 const entered=subjects.filter(s=>s.conducted>0),remainingClasses=timetable.length,summary=useMemo(()=>getDashboardSummary(entered,remainingClasses),[entered,remainingClasses]),section=sections.find(s=>s.id===sectionId),upcoming=timetable.slice(0,18);
 const update=(id:string,patch:Partial<Pick<Subject,'attended'|'conducted'>>)=>setSubjects(prev=>prev.map(s=>s.id===id?{...s,...patch}:s));
 return <main className="min-h-screen bg-mist"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
   <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-soft sm:p-9"><p className="text-xs font-black uppercase tracking-[.18em] text-lime-300">Attendance command center</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Open it and your class data is already there.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Sections, real subject names, subject codes, faculty, timetable sessions, rooms, and a ready-to-use attendance profile are loaded automatically from the supplied timetable data.</p></section>
   <section className="mt-6"><div className="mb-3 flex items-center gap-2"><Users size={18}/><h2 className="font-bold">Select class section</h2></div>{dataError&&<p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{dataError}</p>}{sections.length?<SectionSelector sections={sections} value={sectionId} onChange={changeSection}/>:<p className="text-sm text-slate-500">Loading sections…</p>}</section>
   <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex gap-3"><Database className="mt-0.5 shrink-0 text-emerald-700" size={19}/><div className="min-w-0 flex-1"><p className="font-bold text-emerald-950">Hard-wired timetable + preloaded attendance</p><p className="mt-1 text-sm leading-6 text-emerald-900">{section?.name} now uses the actual subject table from the supplied PDF. Completed-class totals are precomputed through 28 Sep 2026, 3:22 PM IST. The ZIPs did not contain a per-student absence log, so the built-in starting profile initializes attended equal to conducted. You do not need to add subjects or class details manually; edit a count only if you want to replace the demo starting attendance with an official value.</p><div className="mt-3 flex flex-wrap gap-2">{section?.sourcePdf&&<a className="btn-soft" href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}${section.sourcePdf}`} target="_blank" rel="noreferrer">Open source timetable PDF ↗</a>}<button onClick={resetPreloaded} className="btn-soft"><RotateCcw size={15}/>Reset preloaded attendance</button></div></div></div></section>
   <section className="mt-6 surface p-5"><p className="font-bold">Subjects loaded automatically</p><p className="mt-1 text-sm text-slate-500">{subjects.length} timetable subjects/blocks are ready for {section?.name||'the selected section'}.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(s=><div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3"><p className="font-bold text-slate-800">{s.name}</p><p className="mt-1 text-xs text-slate-500">{s.code||'No code'}{s.slotCode?` · Slot ${s.slotCode}`:''}{s.credits?` · ${s.credits}`:''}</p>{s.faculty&&<p className="mt-1 text-xs text-slate-500">{s.faculty}</p>}</div>)}</div></section>
   <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Overall attendance" value={summary.conducted?`${summary.overallPercentage.toFixed(1)}%`:'—'} detail="Preloaded profile" icon={Target}/><StatCard label="Classes conducted" value={summary.conducted} detail={`${summary.attended} attended`} icon={BookOpenCheck}/><StatCard label="Remaining timetable" value={remainingClasses} detail="From planning date" icon={CalendarDays}/><StatCard label="Required for 75%" value={summary.conducted?summary.classesTo75:'—'} detail="Consecutive attended classes" icon={Target}/><StatCard label="Required for 90%" value={summary.conducted?summary.classesTo90:'—'} detail="Consecutive attended classes" icon={CheckCircle2}/></section>
   {summary.conducted>0&&<div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 text-amber-700" size={19}/><div><p className="font-bold text-amber-900">75% checkpoint</p><p className="mt-1 text-sm text-amber-800">The currently loaded profile needs <strong>{summary.classesTo75}</strong> consecutive attended classes to reach 75%.</p></div></div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="font-bold text-blue-900">No setup form required</p><p className="mt-1 text-sm text-blue-800">Your section automatically brings in its subjects, timetable, rooms, faculty, and starting attendance counts. Any edits are saved locally for that section.</p></div></div>}
   <div className="mt-6"><DetentionAlert show={summary.conducted>0&&summary.overallPercentage<75&&summary.classesTo75>summary.remainingClasses}/></div>
   <div className="mt-6"><LeaveSimulator subjects={entered} timetable={timetable} planningDate={futureDate}/></div>
   <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_.95fr]"><SubjectTable subjects={subjects} onUpdate={update} onRemove={()=>{}} allowRemove={false}/><div className="grid gap-6"><OverallHealthChart subjects={entered}/><AttendanceChart subjects={entered}/></div></div>
   <div className="mt-6"><Timetable entries={upcoming} sectionName={section?.name??'Selected section'}/></div>
   <footer className="py-8 text-center text-xs text-slate-400">Class and subject details are transcribed from the supplied 2026-27 timetable PDFs. The starting attended counts are a built-in demo assumption because the supplied ZIPs do not contain a student-specific attendance/absence record.</footer>
 </div><AttendanceAdvisor subjects={entered} timetable={timetable} planningDate={futureDate} timetableVerified={section?.predictionEnabled===true}/></main>
}
