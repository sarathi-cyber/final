import { NextResponse } from 'next/server'; import { claimRoom } from '@/lib/roomwise-server';
export const dynamic='force-dynamic'; export const runtime='nodejs';
export async function POST(req:Request){try{const b=await req.json(); if(typeof b.roomId!=='string')return NextResponse.json({error:'roomId is required.'},{status:400}); const x=await claimRoom(b.roomId,b.name); return NextResponse.json({ok:true,claim:x.claim,state:x.state},{status:201});}catch(e:any){return NextResponse.json({error:e.message||'Could not claim room.'},{status:e.status||400});}}
