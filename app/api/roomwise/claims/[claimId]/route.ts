import { NextResponse } from 'next/server'; import { releaseClaim } from '@/lib/roomwise-server';
export const dynamic='force-dynamic'; export const runtime='nodejs';
export async function DELETE(req:Request,ctx:{params:Promise<{claimId:string}>}){try{const {claimId}=await ctx.params; const b=await req.json(); const r=await releaseClaim(claimId,b.token); return NextResponse.json({ok:true,roomId:r.roomId});}catch(e:any){return NextResponse.json({error:e.message||'Could not release claim.'},{status:e.status||400});}}
