import { NextRequest, NextResponse } from 'next/server';
import { pgQuery } from '@/lib/postgres';
import { requireSuperAdmin } from '@/lib/adminAuth';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
 const auth=await requireSuperAdmin(req); if(!auth.authorized)return auth.response;
 try { const p=new URL(req.url).searchParams; const q=(p.get('q')||'').trim(); const status=p.get('status')||''; const category=p.get('category')||''; const date=p.get('date')||'';
 const r=await pgQuery(`SELECT t.*, (SELECT COUNT(*) FROM public.support_ticket_attachments a WHERE a.ticket_id=t.id)::int attachment_count FROM public.support_tickets t WHERE ($1='' OR t.ticket_id ILIKE $2 OR t.name ILIKE $2 OR t.email ILIKE $2) AND ($3='' OR t.status=$3) AND ($4='' OR t.category=$4) AND ($5='' OR t.created_at::date=$5::date) ORDER BY t.created_at DESC LIMIT 500`,[q,`%${q}%`,status,category,date]);
 return NextResponse.json({success:true,tickets:r.rows}); }catch(e:any){console.error(e);return NextResponse.json({success:false,error:'Could not load support tickets.'},{status:500});}
}

export async function PATCH(req:NextRequest){
 const auth=await requireSuperAdmin(req); if(!auth.authorized)return auth.response;
 try { const b=await req.json(); const {id,status,entryType,content}=b;
 const validStatus=['New','In Progress','Resolved','Closed']; const validEntry=['reply','note'];
 const found=await pgQuery('SELECT id,status,ticket_id FROM public.support_tickets WHERE id=$1',[id]); if(!found.rowCount)return NextResponse.json({success:false,error:'Ticket not found.'},{status:404});
 if(status){if(!validStatus.includes(status))return NextResponse.json({success:false,error:'Invalid status.'},{status:400});const old=found.rows[0].status;if(old!==status){await pgQuery('UPDATE public.support_tickets SET status=$2,updated_at=NOW() WHERE id=$1',[id,status]);await pgQuery(`INSERT INTO public.support_ticket_history(ticket_id,actor_type,actor_name,entry_type,content) VALUES($1,'admin',$2,'status',$3)`,[id,auth.user.name,`${old} → ${status}`]);}}
 if(entryType){if(!validEntry.includes(entryType)||typeof content!=='string'||!content.trim()||content.length>10000)return NextResponse.json({success:false,error:'Invalid message.'},{status:400});await pgQuery(`INSERT INTO public.support_ticket_history(ticket_id,actor_type,actor_name,entry_type,content) VALUES($1,'admin',$2,$3,$4)`,[id,auth.user.name,entryType,content.trim()]);await pgQuery('UPDATE public.support_tickets SET updated_at=NOW() WHERE id=$1',[id]);if(entryType==='reply'&&process.env.RESEND_API_KEY&&process.env.SUPPORT_FROM_EMAIL){const ticket=await pgQuery('SELECT email,ticket_id,subject FROM public.support_tickets WHERE id=$1',[id]);const t=ticket.rows[0];try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.SUPPORT_FROM_EMAIL,to:t.email,subject:`OrderOne support update · ${t.ticket_id}`,text:`Regarding: ${t.subject}\n\n${content.trim()}\n\nOrderOne Support`})});if(!response.ok)console.error('Support reply email failed:',await response.text());}catch(e){console.error('Support reply email failed',e)}}}
 return NextResponse.json({success:true}); }catch(e:any){console.error(e);return NextResponse.json({success:false,error:'Could not update ticket.'},{status:500});}
}
