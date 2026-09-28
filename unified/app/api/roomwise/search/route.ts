import { NextResponse } from 'next/server'; import { searchRooms } from '@/lib/roomwise-server';
export const dynamic='force-dynamic'; export const runtime='nodejs';
export async function POST(req:Request){ try{return NextResponse.json(await searchRooms(await req.json()));}catch(e:any){return NextResponse.json({error:e.message||'Search failed.'},{status:e.status||400});} }
