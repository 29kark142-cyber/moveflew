import { z } from 'zod';
import type { Ctx } from './crm-api';
import { generateFieldPdf } from '@/lib/field-pdf.server';
import { type FieldSnapshot } from '@/shared/field-documents';

// Access to the job is verified by fieldRoute before any privileged storage work.
export async function finalizeFieldSnapshot(ctx: Ctx, jobId: number, operationId: string, snapshot: FieldSnapshot) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: id, error } = await supabaseAdmin.rpc('commit_field_signoff', { _ws: Number(ctx.wsId),_job:jobId,_actor:ctx.userId,_operation:operationId,_signature:snapshot.signature,_snapshot:snapshot as never });
  if(error || !id)throw new Error('Could not save the signed document');
  return prepareFieldPdf(ctx,String(id));
}
export async function prepareFieldPdf(ctx: Ctx, id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row,error } = await supabaseAdmin.from('field_document_snapshots').select('*').eq('id',id).eq('workspace_id',Number(ctx.wsId)).single();
  if(error || !row)throw new Error('Signed document not found');
  let path=row.storage_path;
  if(!path) {
    const pdf=await generateFieldPdf(row.snapshot as unknown as FieldSnapshot,ctx.origin || '');
    path=`${ctx.wsId}/${row.job_id}/${id}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage.from('field-documents').upload(path,pdf,{ contentType:'application/pdf',upsert:true });
    if(uploadError)throw new Error('Signed document saved; PDF upload failed. Retry to finish.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(pdf))),v=>v.toString(16).padStart(2,'0')).join('');
    const { error: saveError }=await supabaseAdmin.from('field_document_snapshots').update({storage_path:path,pdf_hash:hash}).eq('id',id);
    if(saveError)throw new Error('Could not save PDF download details');
  }
  const { data: link,error: linkError }=await supabaseAdmin.storage.from('field-documents').createSignedUrl(path,900,{download:`BOL-job-${row.job_id}.pdf`});
  if(linkError || !link)throw new Error('Could not create secure PDF download');
  return { id,url:link.signedUrl,emailStatus:'sender_domain_required' as const };
}
export const officeEmailSchema=z.object({ officeEmail:z.string().trim().email().max(254).or(z.literal('')) }).strict();