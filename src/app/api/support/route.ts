import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pgQuery } from '@/lib/postgres';
import { getCurrentUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const categories = ['Technical Issue','Payment Issue','Order Issue','Account Issue','Subscription','Feature Request','Other'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const phone = String(form.get('phone') || '').trim();
    const subject = String(form.get('subject') || '').trim();
    const category = String(form.get('category') || '');
    const message = String(form.get('message') || '').trim();
    if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || phone.length > 40 || subject.length < 3 || subject.length > 180 || !categories.includes(category) || message.length < 10 || message.length > 10000)
      return NextResponse.json({ success:false, error:'Check the required fields and try again.' }, { status:400 });

    const files = form.getAll('attachments').filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length > 3) return NextResponse.json({ success:false,error:'Attach up to 3 files.' }, {status:400});
    const attachments: { filename:string; mime:string; size:number; bytes:Buffer }[]=[];
    for (const file of files) {
      const mime=file.type.toLowerCase();
      if (!['image/jpeg','image/png','image/webp','application/pdf','text/plain'].includes(mime) || file.size > 5*1024*1024) return NextResponse.json({success:false,error:'Attachments must be JPG, PNG, WEBP, PDF, or TXT files under 5 MB.'},{status:400});
      const bytes=Buffer.from(await file.arrayBuffer());
      const signatureOk=mime==='image/jpeg'?bytes.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])):mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':mime==='application/pdf'?bytes.toString('ascii',0,5)==='%PDF-':!bytes.includes(0);
      if (!signatureOk) return NextResponse.json({success:false,error:`${file.name} does not match its file type.`},{status:400});
      attachments.push({filename:file.name.replace(/[\\/\0]/g,'').slice(0,180),mime,size:file.size,bytes});
    }

    const user = await getCurrentUserFromRequest(req);
    const id = crypto.randomUUID();
    const ticketId = `OO-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const db = await pgQuery(
      `INSERT INTO public.support_tickets (id,ticket_id,user_id,name,email,phone,subject,category,message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [id,ticketId,user?.id || null,name,email,phone || null,subject,category,message]
    );
    await pgQuery(`INSERT INTO public.support_ticket_history (ticket_id,actor_type,actor_name,entry_type,content) VALUES ($1,'customer',$2,'message',$3)`, [db.rows[0].id,name,message]);
    for (const file of attachments) {
      await pgQuery(`INSERT INTO public.support_ticket_attachments (ticket_id,filename,mime_type,file_size,data) VALUES ($1,$2,$3,$4,$5)`,[db.rows[0].id,file.filename,file.mime,file.size,file.bytes]);
    }
    if (process.env.RESEND_API_KEY && process.env.SUPPORT_FROM_EMAIL) {
      const headers={Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'};
      const emails=[{from:process.env.SUPPORT_FROM_EMAIL,to:email,subject:`OrderOne support request received · ${ticketId}`,text:`Hi ${name},\n\nWe received your support request: ${subject}. Your ticket ID is ${ticketId}.\n\nOrderOne Support`}];
      if(process.env.SUPPORT_ADMIN_EMAIL) emails.push({from:process.env.SUPPORT_FROM_EMAIL,to:process.env.SUPPORT_ADMIN_EMAIL,subject:`New support ticket ${ticketId}`,text:`${name} (${email}) submitted ${category}: ${subject}`});
      const results=await Promise.allSettled(emails.map(payload=>fetch('https://api.resend.com/emails',{method:'POST',headers,body:JSON.stringify(payload)})));
      results.forEach(result=>{if(result.status==='rejected')console.error('Support email failed',result.reason)});
    }
    return NextResponse.json({success:true,ticketId});
  } catch (error:any) {
    console.error('Support submission failed:',error);
    return NextResponse.json({success:false,error:'Support form is temporarily unavailable. Please try again.'},{status:500});
  }
}
