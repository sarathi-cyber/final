import { NextResponse } from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json({ok:true,app:'Roomwise Student Hub',version:'3.2.0',features:['room-finder','live-map','countdown','claims','whatsapp-share','attendance-planner','preloaded-subjects','hardwired-demo-attendance']});}
