import { NextResponse } from 'next/server'; import { getData } from '@/lib/roomwise-server';
export const dynamic='force-dynamic'; export const runtime='nodejs';
export async function GET(){ return NextResponse.json(await getData(),{headers:{'Cache-Control':'no-store'}}); }
