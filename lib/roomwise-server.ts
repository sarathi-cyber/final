// @ts-nocheck
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import timetable from '@/data/roomwise.data.json';
import { evaluate, istNow, parseSearch, dayOf, minute, time, START, END } from '@/lib/roomwise-engine';

const ROOT = process.cwd();
const METADATA_FILE = path.join(ROOT, 'server-data', 'room-details.json');
const CLAIMS_FILE = path.join(ROOT, 'server-data', 'claims.json');
const IST_OFFSET = '+05:30';
const roomIds = new Set(timetable.rooms.map((room:any)=>room.id));
let claimQueue: Promise<void> = Promise.resolve();
async function withClaimLock<T>(work:()=>Promise<T>):Promise<T>{
  const previous=claimQueue;
  let release!:()=>void;
  claimQueue=new Promise<void>(resolve=>{release=resolve});
  await previous;
  try{return await work()}finally{release()}
}

export function safeMetadataValue(value:any={}) {
  return {
    floor: [0,1,2].includes(value.floor) ? value.floor : null,
    ac: typeof value.ac === 'boolean' ? value.ac : null,
    capacity: Number.isInteger(value.capacity) && value.capacity > 0 && value.capacity <= 1000 ? value.capacity : null,
  };
}

export async function readMetadata(){
  try {
    const parsed=JSON.parse(await fs.readFile(METADATA_FILE,'utf8'));
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) return {};
    const clean:any={};
    for(const [id,value] of Object.entries(parsed)) if(roomIds.has(id)) clean[id]=safeMetadataValue(value);
    return clean;
  } catch(e:any){ if(e.code==='ENOENT') return {}; throw e; }
}

async function atomicWrite(file:string,value:any){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.tmp`;
  await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');
  await fs.rename(temp,file);
}

export async function writeMetadata(metadata:any){ return atomicWrite(METADATA_FILE,metadata); }
export function mergedRooms(metadata:any){ return timetable.rooms.map((r:any)=>({...r,...safeMetadataValue(metadata[r.id])})); }

export function normalizeFilters(value:any={}){
  const now=istNow();
  const q:any={
    date:typeof value.date==='string'?value.date:now.date,
    time:typeof value.time==='string'?value.time:now.time,
    duration:Number(value.duration??60),
    floor:['all','unknown','0','1','2'].includes(String(value.floor))?String(value.floor):'all',
    ac:['any','yes','no'].includes(value.ac)?value.ac:'any',
    people:value.people===''||value.people==null?'':Number(value.people),
  };
  if(!Number.isInteger(q.duration)||q.duration<1||q.duration>470) throw Object.assign(new Error('Duration must be between 1 and 470 whole minutes.'),{status:400});
  if(q.people!==''&&(!Number.isInteger(q.people)||q.people<1||q.people>1000)) throw Object.assign(new Error('People must be between 1 and 1000.'),{status:400});
  return q;
}

function epochForIstMinute(date:string,minuteOfDay:number){ return Date.parse(`${date}T${time(minuteOfDay)}:00${IST_OFFSET}`); }
function visualLevel(room:any){ if(/^\d{3}$/.test(room.id)) return Number(room.id[0]); if(/^TB/i.test(room.id)) return 'TB'; return '?'; }
function sanitizeClaimName(value:any){ return String(value||'').replace(/[\u0000-\u001F<>]/g,'').trim().slice(0,40)||'A student'; }

async function readClaimsRaw(){
  try { const parsed=JSON.parse(await fs.readFile(CLAIMS_FILE,'utf8')); return Array.isArray(parsed)?parsed:[]; }
  catch(e:any){ if(e.code==='ENOENT') return []; throw e; }
}
async function writeClaims(claims:any[]){ return atomicWrite(CLAIMS_FILE,claims); }
async function activeClaims(nowEpoch=Date.now()){
  const claims=await readClaimsRaw();
  const active=claims.filter((c:any)=>roomIds.has(c.roomId)&&Number(c.expiresAt)>nowEpoch);
  if(active.length!==claims.length) await writeClaims(active);
  return active;
}

export function liveRoomState(room:any,now:any,claim:any=null,nowEpoch=Date.now()){
  const at=minute(now.time), day=dayOf(now.date);
  const list=(timetable.events as any[]).filter(e=>e.room===room.id&&e.day===day).sort((a,b)=>a.start-b.start||a.end-b.end);
  const current=list.filter(e=>e.start<=at&&e.end>at);
  const next=list.find(e=>e.start>at)||null;
  const insideWindow=day>=1&&day<=5&&Number.isFinite(at)&&at>=START&&at<END;
  const nextStartEpoch=next?epochForIstMinute(now.date,next.start):null;
  const coverageEndEpoch=insideWindow?epochForIstMinute(now.date,END):null;
  const freeUntil=current.length?null:(next?.start??(insideWindow?END:null));
  const freeUntilEpoch=freeUntil==null?null:epochForIstMinute(now.date,freeUntil);
  const minutesToNext=next&&nextStartEpoch!==null?Math.max(0,Math.ceil((nextStartEpoch-nowEpoch)/60000)):null;
  let availability='unknown';
  if(insideWindow){
    if(room.type==='lab') availability='restricted';
    else if(current.length) availability='busy';
    else if(claim) availability='claimed';
    else if(next&&minutesToNext<=30) availability='soon';
    else availability='free';
  }
  return {room:{id:room.id,name:room.name,type:room.type,floor:room.floor,ac:room.ac,capacity:room.capacity,coverage:room.coverage,visualLevel:visualLevel(room)},availability,current:current.map(({start,end,section,label})=>({start,end,section,label})),next:next?{start:next.start,end:next.end,section:next.section,label:next.label}:null,nextStartEpoch,coverageEndEpoch,freeUntil,freeUntilEpoch,claim:claim?{id:claim.id,name:claim.name,claimedAt:claim.claimedAt,expiresAt:claim.expiresAt}:null};
}

export async function liveSnapshot(){
  const metadata=await readMetadata(), rooms=mergedRooms(metadata), now=istNow(), nowEpoch=Date.now(), claims=await activeClaims(nowEpoch), by=new Map(claims.map((c:any)=>[c.roomId,c]));
  return {now:{...now,epoch:nowEpoch},timetableWindow:{start:START,end:END},rooms:rooms.map((r:any)=>liveRoomState(r,now,by.get(r.id)||null,nowEpoch))};
}

export async function claimRoom(roomId:string,name?:string){ return withClaimLock(async()=>{
  const metadata=await readMetadata(); const room=mergedRooms(metadata).find((r:any)=>r.id===roomId); if(!room) throw Object.assign(new Error('Room not found.'),{status:404});
  const now=istNow(), nowEpoch=Date.now(), claims=await activeClaims(nowEpoch), existing=claims.find((c:any)=>c.roomId===roomId);
  if(existing) throw Object.assign(new Error(`${room.name} is already claimed by ${existing.name}.`),{status:409});
  const state=liveRoomState(room,now,null,nowEpoch);
  if(!['free','soon'].includes(state.availability)) throw Object.assign(new Error(state.availability==='busy'?`${room.name} has a class in progress.`:state.availability==='restricted'?`${room.name} is a teaching lab and cannot be claimed as an open study room.`:`${room.name} cannot be claimed outside the supplied timetable window.`),{status:409});
  if(!state.freeUntilEpoch||state.freeUntilEpoch<=nowEpoch) throw Object.assign(new Error(`${room.name} is not available long enough to claim.`),{status:409});
  const claim:any={id:crypto.randomUUID(),token:crypto.randomUUID(),roomId,name:sanitizeClaimName(name),claimedAt:new Date(nowEpoch).toISOString(),expiresAt:state.freeUntilEpoch,freeUntil:state.freeUntil};
  claims.push(claim); await writeClaims(claims); return {claim,state:liveRoomState(room,now,claim,nowEpoch)};
})}

export async function releaseClaim(claimId:string,token:string){ return withClaimLock(async()=>{
  const claims=await readClaimsRaw(), index=claims.findIndex((c:any)=>c.id===claimId); if(index<0) throw Object.assign(new Error('Claim not found or already expired.'),{status:404});
  if(!token||claims[index].token!==token) throw Object.assign(new Error('This device is not authorized to release that claim.'),{status:403});
  const [released]=claims.splice(index,1); await writeClaims(claims); return released;
})}

export async function getData(){ const metadata=await readMetadata(); return {...timetable,rooms:mergedRooms(metadata),runtime:{mode:'nextjs-server',phase:3,integrated:true}}; }
export async function searchRooms(body:any){
  const metadata=await readMetadata(), rooms=mergedRooms(metadata); let filters,notes:any[]=[];
  if(typeof body.text==='string'){ const parsed=parseSearch(body.text,normalizeFilters(body.base||{})); filters=parsed.query; notes=parsed.notes; }
  else filters=normalizeFilters(body.filters||body);
  const results=rooms.map((r:any)=>evaluate(r,(timetable as any).events,filters));
  return {filters,notes,summary:{matches:results.filter((r:any)=>r.match).length,occupiedAtStart:results.filter((r:any)=>r.current.length).length,trackedVenues:results.length},results};
}
export { START, END, time, istNow };
