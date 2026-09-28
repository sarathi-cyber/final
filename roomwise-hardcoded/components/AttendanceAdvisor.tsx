'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X, RotateCcw, Sparkles } from 'lucide-react';
import { Subject, TimetableEntry } from '@/types/attendance';
import { attendancePercentage, classesNeeded } from '@/lib/attendance';

type Message = { role: 'user' | 'assistant'; text: string };
type Props = { subjects: Subject[]; timetable: TimetableEntry[]; planningDate: string; timetableVerified?: boolean };
type ChatMemory = { lastSubjectId?: string };

const GREETING = 'Hi! I’m your Attendance Advisor. Your selected section, subjects, timetable, rooms, faculty, and starting attendance profile are already loaded. Ask me about attendance, a subject code, 75% or 90% targets, classes you can miss, upcoming classes, or leave scenarios.';
const QUICK_QUESTIONS = [
  'What is my overall attendance?',
  'Which subjects are below 75%?',
  'How many classes can I miss and stay above 75%?',
  'What classes do I have tomorrow?',
  'Can I take leave tomorrow?',
];
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const plusDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const pct = (a: number, c: number, digits = 1) => `${attendancePercentage(a, c).toFixed(digits)}%`;
const prettyDate = (value: string) => { try { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(`${value}T12:00:00+05:30`)); } catch { return value; } };
const time12 = (value: string) => { const [h, m] = value.split(':').map(Number); const suffix = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`; };

function subjectKey(value: string) {
  return norm(value).split(' ').map(word => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word).join(' ');
}

function findSubject(question: string, subjects: Subject[]) {
  const q = ` ${subjectKey(question)} `;
  return [...subjects].sort((a, b) => subjectKey(b.name).length - subjectKey(a.name).length)
    .find(s => {
      const name = subjectKey(s.name);
      const code = subjectKey(s.code ?? '');
      const slot = subjectKey(s.slotCode ?? '');
      if (!name) return false;
      return q.includes(` ${name} `) || q.includes(` ${subjectKey(s.id)} `) || (code && q.includes(` ${code} `)) || (slot && q.includes(` slot ${slot} `));
    });
}

function subjectForEntry(entry: TimetableEntry, subjects: Subject[]) {
  const entryKey = subjectKey(entry.subject ?? '');
  return subjects.find(s => {
    const name = subjectKey(s.name);
    const id = subjectKey(s.id);
    return entryKey === name || entryKey === id || entryKey.includes(name) || name.includes(entryKey);
  });
}

function missAllowance(attended: number, conducted: number, target: number) {
  if (conducted <= 0 || target <= 0 || target > 100) return 0;
  const ratio = target / 100;
  return Math.max(0, Math.floor(attended / ratio - conducted + 1e-9));
}

function scheduleRows(entries: TimetableEntry[], date: string) {
  return entries.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function summarizeSchedule(entries: TimetableEntry[], date: string) {
  const rows = scheduleRows(entries, date);
  if (!rows.length) return `No class sessions are listed for ${prettyDate(date)} in the loaded timetable.`;
  const compact = rows.slice(0, 10).map(e => `${time12(e.startTime)}–${time12(e.endTime)}: ${e.subject}${e.room ? ` · ${e.room}` : ''}`).join('\n');
  return `Classes on ${prettyDate(date)} (${rows.length}):\n${compact}${rows.length > 10 ? `\n…and ${rows.length - 10} more.` : ''}`;
}

export function buildAttendanceReply(question: string, subjects: Subject[], timetable: TimetableEntry[], planningDate: string, timetableVerified: boolean, memory: ChatMemory = {}) {
  const q = norm(question);
  if (!q) return { text: 'Please enter a question, or choose one of the suggested questions.', memory };

  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(q)) {
    return { text: 'Hey! Ask me about your overall attendance, a subject, tomorrow’s classes, how many classes you can miss, or what happens if you take leave.', memory };
  }

  const directSubject = findSubject(question, subjects);
  const rememberedSubject = !directSubject && memory.lastSubjectId ? subjects.find(s => s.id === memory.lastSubjectId) : undefined;
  const followUp = /^(what about|and|how about|then|for 75|for 90|if i miss|can i miss|how many can i miss)\b/.test(q);
  const subject = directSubject ?? (followUp ? rememberedSubject : undefined);
  const nextMemory = subject ? { ...memory, lastSubjectId: subject.id } : memory;

  const subjectRows = subjects.map(s => ({ ...s, percentage: attendancePercentage(s.attended, s.conducted) }));
  const attended = subjectRows.reduce((n, s) => n + s.attended, 0);
  const conducted = subjectRows.reduce((n, s) => n + s.conducted, 0);

  const asksAttendanceData = /\b(attendance|75|90|percent|percentage|subject|below|risk|shortage|detention|reach|target|miss|skip|bunk|absent|leave)\b/.test(q);
  if (!subjects.length && asksAttendanceData) {
    return { text: 'I don’t have a loaded attendance profile for this section yet. Try switching sections once or use Reset preloaded attendance on the page.', memory };
  }

  const asksSchedule = /\b(timetable|schedule|class|classes|period|periods|tomorrow|today|next class|upcoming|leave|sick|medical|absent|absence|od|on duty)\b/.test(q);
  if (asksSchedule && !timetableVerified) {
    return { text: 'The selected section timetable is not marked verified, so I won’t guess schedule-based leave impact. I can still calculate percentages and attendance targets from your entered counts.', memory: nextMemory };
  }

  const tomorrow = /\btomorrow\b/.test(q);
  const today = /\btoday\b/.test(q);
  const dateMatch = question.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const daysMatch = q.match(/\b(\d{1,2})\s*(?:day|days)\b/);
  const duration = daysMatch ? Math.min(90, Math.max(1, Number(daysMatch[1]))) : 1;
  const start = dateMatch?.[1] ?? (tomorrow ? plusDays(planningDate, 1) : planningDate);
  const end = plusDays(start, duration - 1);

  if (/\b(help|what can you do|examples|capabilities)\b/.test(q)) {
    return { text: 'I can: calculate overall or subject attendance; identify subjects below 75%; tell you how many consecutive classes are needed for 75% or 90%; estimate how many classes you can miss while staying at a target; project “if I miss X classes”; list today/tomorrow/upcoming classes; and estimate leave impact from the verified timetable.', memory: nextMemory };
  }

  if (/\b(next class|next period)\b/.test(q)) {
    const rows = timetable.filter(e => e.date >= planningDate).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    const next = rows[0];
    return { text: next ? `Next listed class: ${next.subject} on ${prettyDate(next.date)}, ${time12(next.startTime)}–${time12(next.endTime)}${next.room ? ` in ${next.room}` : ''}.` : 'No upcoming class is listed in the loaded planning window.', memory: nextMemory };
  }

  if ((/\b(classes|class|schedule|timetable|periods)\b/.test(q) && (tomorrow || today || dateMatch)) || /\bwhat do i have tomorrow\b/.test(q)) {
    const targetDate = tomorrow ? plusDays(planningDate, 1) : dateMatch?.[1] ?? planningDate;
    return { text: summarizeSchedule(timetable, targetDate), memory: nextMemory };
  }

  if (/\b(below|under|less than|at risk|shortage|detention|low attendance)\b/.test(q) && /75|attendance|subject|risk|shortage|detention/.test(q)) {
    const low = subjectRows.filter(s => s.percentage < 75);
    return { text: low.length ? `Subjects below 75% (${low.length}): ${low.map(s => `${s.name}: ${pct(s.attended, s.conducted)} (${s.attended}/${s.conducted})`).join('; ')}.` : 'No entered subject is currently below 75%.', memory: nextMemory };
  }

  const missCountMatch = q.match(/\b(?:miss|skip|bunk|absent for)\s*(\d{1,3})\s*(?:class|classes|period|periods)?\b/) || q.match(/\bif i (?:miss|skip)\s*(\d{1,3})\b/);
  if (missCountMatch) {
    const count = Math.min(500, Number(missCountMatch[1]));
    if (subject) {
      const projected = attendancePercentage(subject.attended, subject.conducted + count);
      return { text: `If you miss ${count} more ${count === 1 ? 'class' : 'classes'} in ${subject.name}, it would become ${projected.toFixed(2)}% (${subject.attended}/${subject.conducted + count}), assuming those classes are conducted and you attend none of them.`, memory: nextMemory };
    }
    const projected = attendancePercentage(attended, conducted + count);
    return { text: `If you miss ${count} more ${count === 1 ? 'class' : 'classes'} overall, the simple combined projection becomes ${projected.toFixed(2)}% (${attended}/${conducted + count}).`, memory: nextMemory };
  }

  if (/\b(how many|classes|class).*\b(miss|skip|bunk|absent)\b|\b(miss|skip|bunk).*\bhow many\b/.test(q)) {
    const target = /\b90\b|ninety/.test(q) ? 90 : 75;
    if (subject) {
      const n = missAllowance(subject.attended, subject.conducted, target);
      return { text: `${subject.name}: you can miss ${n} additional ${n === 1 ? 'class' : 'classes'} and still remain at or above ${target}%, based on ${subject.attended}/${subject.conducted} now.`, memory: nextMemory };
    }
    const n = missAllowance(attended, conducted, target);
    return { text: `Across the entered subjects, you can miss ${n} additional ${n === 1 ? 'class' : 'classes'} and still remain at or above ${target}% on the simple combined count. Subject-wise rules can differ, so ask me about a specific subject too.`, memory: nextMemory };
  }

  if (!subject && (/\b(overall|combined|total)\b/.test(q) || /\b(my attendance|attendance percentage|attendance level)\b/.test(q))) {
    const need75 = classesNeeded(attended, conducted, 75);
    const need90 = classesNeeded(attended, conducted, 90);
    return { text: `Overall attendance is ${pct(attended, conducted, 2)} (${attended} attended out of ${conducted} conducted). ${need75 === 0 ? 'You are at or above 75%.' : `You need ${need75} consecutive attended classes to reach 75%.`} ${need90 === 0 ? 'You are also at or above 90%.' : `To reach 90%, you need ${need90} consecutive attended classes.`}`, memory: nextMemory };
  }

  if (subject && /\b(90|ninety|75|seventy five|target|reach|need|how many)\b/.test(q)) {
    const target = /\b90\b|ninety/.test(q) ? 90 : 75;
    const need = classesNeeded(subject.attended, subject.conducted, target);
    return { text: `${subject.name} is at ${pct(subject.attended, subject.conducted, 2)} (${subject.attended}/${subject.conducted}). ${need === 0 ? `You are already at or above ${target}%.` : `Attend ${need} consecutive classes to reach ${target}%, assuming you do not miss another class.`}`, memory: nextMemory };
  }

  if (subject) {
    const need75 = classesNeeded(subject.attended, subject.conducted, 75);
    const need90 = classesNeeded(subject.attended, subject.conducted, 90);
    return { text: `${subject.name}: ${pct(subject.attended, subject.conducted, 2)} (${subject.attended}/${subject.conducted}). ${need75 ? `${need75} consecutive attended classes are needed for 75%.` : 'You are at or above 75%.'} ${need90 ? `${need90} are needed for 90%.` : 'You are at or above 90%.'}`, memory: nextMemory };
  }

  if (/\b(leave|sick|medical|absent|absence|skip|od|on duty|tomorrow)\b/.test(q)) {
    const matching = timetable.filter(e => e.date >= start && e.date <= end);
    const future = timetable.filter(e => e.date > end);
    const missed = matching.length;
    const after = attendancePercentage(attended, conducted + missed);
    const grouped = new Map<string, number>();
    for (const e of matching) grouped.set(e.subject, (grouped.get(e.subject) ?? 0) + 1);
    const detail = [...grouped.entries()].map(([name, n]) => `${name}: ${n}`).join(', ');
    const knownImpacts = matching.map(e => ({ e, s: subjectForEntry(e, subjects) })).filter((x): x is {e:TimetableEntry;s:Subject} => Boolean(x.s));
    const subjectImpact = new Map<string, { s: Subject; missed: number }>();
    for (const row of knownImpacts) {
      const existing = subjectImpact.get(row.s.id) ?? { s: row.s, missed: 0 };
      existing.missed += 1;
      subjectImpact.set(row.s.id, existing);
    }
    const impactText = [...subjectImpact.values()].map(x => `${x.s.name} → ${attendancePercentage(x.s.attended, x.s.conducted + x.missed).toFixed(1)}%`).join('; ');
    const recoverable = attendancePercentage(attended + future.length, conducted + missed + future.length);
    return { text: `From ${prettyDate(start)} to ${prettyDate(end)}, the loaded timetable contains ${missed} class session${missed === 1 ? '' : 's'}${detail ? ` (${detail})` : ''}. If you miss all of them, the simple combined projection becomes ${after.toFixed(2)}% (${attended}/${conducted + missed}).${impactText ? ` Subject projections: ${impactText}.` : ''} ${recoverable < 75 ? 'Even attending every remaining listed session would keep the combined projection below 75%.' : 'The loaded future timetable suggests recovery to at least 75% may still be possible.'} This is planning guidance, not leave approval.`, memory: nextMemory };
  }

  if (/\b(75|seventy five|seventyfive)\b/.test(q)) {
    const need = classesNeeded(attended, conducted, 75);
    return { text: `Your combined attendance is ${pct(attended, conducted, 2)}. ${need === 0 ? 'You are already at or above 75%.' : `You need ${need} consecutive attended classes to reach 75%, assuming no further absences.`} Mention a subject name for a subject-specific answer.`, memory: nextMemory };
  }

  if (/\b(90|ninety)\b/.test(q)) {
    return { text: subjectRows.map(s => { const need = classesNeeded(s.attended, s.conducted, 90); return `${s.name}: ${pct(s.attended, s.conducted)} — ${need === 0 ? 'already at 90%+' : `${need} consecutive classes needed for 90%`}`; }).join('\n'), memory: nextMemory };
  }

  return { text: 'I couldn’t confidently understand that yet. Try asking in a direct way, for example: “What is my overall attendance?”, “How many classes can I miss in Discrete Mathematics?”, “What classes do I have tomorrow?”, or “If I miss 2 classes, what happens?”', memory: nextMemory };
}

export function AttendanceAdvisor({ subjects, timetable, planningDate, timetableVerified = false }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: GREETING }]);
  const [memory, setMemory] = useState<ChatMemory>({});
  const listRef = useRef<HTMLDivElement>(null);
  const dataSummary = useMemo(() => subjects.length ? `${subjects.length} subject${subjects.length === 1 ? '' : 's'} loaded` : 'No attendance counts loaded', [subjects.length]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open]);

  function reset() {
    setMessages([{ role: 'assistant', text: GREETING }]);
    setMemory({});
  }

  function send(text = draft) {
    const value = text.trim();
    if (!value) return;
    const reply = buildAttendanceReply(value, subjects, timetable, planningDate, timetableVerified, memory);
    setMemory(reply.memory);
    setMessages(prev => [...prev, { role: 'user', text: value }, { role: 'assistant', text: reply.text }]);
    setDraft('');
  }
  function submit(e: FormEvent) { e.preventDefault(); send(); }

  return <>
    <button aria-label={open ? 'Close Attendance Advisor' : 'Open Attendance Advisor'} onClick={() => setOpen(v => !v)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-navy px-5 py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800"><MessageCircle size={19}/><span>Attendance Advisor</span>{open ? <X size={16}/> : <Bot size={17}/>}</button>
    {open && <section className="fixed bottom-24 right-4 z-50 flex h-[min(700px,80vh)] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="Attendance Advisor chat">
      <header className="flex items-center justify-between bg-navy px-4 py-3 text-white"><div className="flex items-center gap-2"><Bot size={20}/><div><p className="font-bold">Attendance Advisor</p><p className="text-xs text-slate-300">{dataSummary} · remembers follow-ups</p></div></div><div className="flex items-center gap-3"><button aria-label="Reset chat" title="Reset chat" onClick={reset}><RotateCcw size={16}/></button><button aria-label="Close chat" onClick={() => setOpen(false)}><X size={18}/></button></div></header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">{messages.map((m, i) => <div key={i} className={`max-w-[94%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-5 ${m.role === 'user' ? 'ml-auto bg-navy text-white' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div>)}
        {messages.length <= 1 && <div className="grid gap-2 pt-1">{QUICK_QUESTIONS.map(q => <button key={q} onClick={() => send(q)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"><Sparkles size={13} className="shrink-0"/>{q}</button>)}</div>}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 p-3"><input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" placeholder="Ask about attendance or your timetable…" aria-label="Ask Attendance Advisor"/><button type="submit" disabled={!draft.trim()} className="rounded-xl bg-navy px-3 text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send question"><Send size={17}/></button></form>
      <p className="px-3 pb-2 text-[10px] text-slate-400">Uses your browser-saved attendance and loaded timetable. It does not send student attendance to an external AI service. Verify official records and college policy.</p>
    </section>}
  </>;
}
