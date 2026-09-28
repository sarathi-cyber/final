import { NextResponse } from 'next/server'; import { liveSnapshot } from '@/lib/roomwise-server';
export const dynamic='force-dynamic'; export const runtime='nodejs';
export async function GET(){ return NextResponse.json(await liveSnapshot(),{headers:{'Cache-Control':'no-store'}}); }
