import fs from 'node:fs';
const root=process.cwd();
const room=JSON.parse(fs.readFileSync(root+'/data/roomwise.data.json','utf8'));
const att=JSON.parse(fs.readFileSync(root+'/data/timetable.dataset.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'/data/source-manifest.json','utf8'));
const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(room.rooms.length===14,'Expected 14 tracked rooms');
assert(room.events.length===262,'Expected 262 room occupancy records');
assert(Object.keys(att.sections).length===9,'Expected 9 current sections');
assert(manifest.canonicalSources.length===10,'Expected 10 canonical timetable PDFs');
for(const [id,s] of Object.entries(att.sections)){
  const seen=new Set();
  for(const slot of s.timetable){const k=[slot.weekday,slot.startTime,slot.endTime,slot.subjectId].join('|');assert(!seen.has(k),`Duplicate academic slot in ${id}: ${k}`);seen.add(k);assert(att.subjects[slot.subjectId],`Missing subject ${slot.subjectId}`)}
}
console.log(`Data OK: ${room.rooms.length} rooms, ${room.events.length} room records, ${Object.keys(att.sections).length} sections, ${Object.values(att.sections).reduce((n,s)=>n+s.timetable.length,0)} unique academic slots/week, ${manifest.canonicalSources.length} canonical PDFs.`);
