import { createServerFn } from '@tanstack/react-start';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { depositRuleSchema, requiredDeposit, proposalTokenSchema, signatureSchema } from './proposal-rules';
import type { Job, Pricing } from '@/shared/crm';
import { DEFAULT_PRICING } from '@/shared/crm';

export type PublicProposal = {
  job: Job; company: { name: string; phone: string; email: string }; pricing: Pricing;
  depositCents: number; signed: boolean; paid: boolean; proposalId: string; testApproved?: boolean;
};
function publicClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Backend unavailable');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    },
  } });
}
async function manager(db: SupabaseClient<Database>, workspaceId: number, adminOnly = false) {
  const { data, error } = await db.rpc('workspace_role', { _ws: workspaceId });
  if (error || !(adminOnly ? ['admin'] : ['admin','office_admin','estimator']).includes(String(data))) throw new Error('Only authorized office staff can manage proposals');
}
export const getDepositRule = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ workspaceId: z.number().int().positive() }).parse(v))
  .handler(async ({ data, context }) => {
    await manager(context.supabase, data.workspaceId);
    const { data: row, error } = await context.supabase.from('workspaces').select('deposit_rule').eq('id',data.workspaceId).single();
    if (error) throw new Error('Could not load deposit settings');
    return row.deposit_rule ? depositRuleSchema.parse(row.deposit_rule) : null;
  });
export const saveDepositRule = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ workspaceId: z.number().int().positive(), rule: depositRuleSchema }).parse(v))
  .handler(async ({ data, context }) => {
    await manager(context.supabase, data.workspaceId, true);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('workspaces').update({ deposit_rule: data.rule }).eq('id',data.workspaceId);
    if (error) throw new Error('Could not save deposit rule');
    return { saved: true };
  });
export const publishProposal = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ workspaceId: z.number().int().positive(), jobId: z.number().int().positive(), depositOverride: z.number().finite().min(0).max(100000).nullable() }).parse(v))
  .handler(async ({ data, context }) => {
    await manager(context.supabase, data.workspaceId);
    const { data: row, error } = await context.supabase.from('workspace_records').select('id,data,created_at').eq('workspace_id',data.workspaceId).eq('id',data.jobId).eq('kind','job').single();
    const { data: workspace } = await context.supabase.from('workspaces').select('name,pricing,deposit_rule').eq('id',data.workspaceId).single();
    if (error || !row || !workspace) throw new Error('Estimate not found');
    const job = row.data as unknown as Job;
    if (job.status !== 'estimate') throw new Error('Only estimates can be sent as proposals');
    const depositCents = requiredDeposit(Number(job.total), workspace.deposit_rule ? depositRuleSchema.parse(workspace.deposit_rule) : null, data.depositOverride);
    // Snapshot only customer-visible estimate details; never crew/payroll/internal notes.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const existing = await supabaseAdmin.from('moving_proposals').select('id,signed_at').eq('workspace_id',data.workspaceId).eq('job_id',data.jobId).is('revoked_at',null);
    if (existing.error) throw new Error('Could not check prior proposals');
    if (existing.data.some(p => p.signed_at)) throw new Error('This estimate is already signed; signed proposals cannot be replaced');
    const safeJob = {
      id: row.id, customerName: job.customerName || job.title || 'Customer', title: job.title,
      moveDate: job.moveDate, startHour: job.startHour, origin: job.origin, destination: job.destination,
      originNotes: job.originNotes, destinationNotes: job.destinationNotes, pricingMode: job.pricingMode,
      crewSize: job.crewSize, hourlyRate: job.hourlyRate, estimatedHours: job.estimatedHours,
      distanceMiles: job.distanceMiles, travelFee: job.travelFee, weightRate: job.weightRate,
      mileRate: job.mileRate, inventory: job.inventory ?? [], fees: job.fees ?? [], total: job.total, status: job.status,
    };
    const snapshot = { job: safeJob, company: { name: workspace.name, phone: '', email: '' }, pricing: workspace.pricing ?? DEFAULT_PRICING };
    const { data: proposal, error: saveError } = await supabaseAdmin.from('moving_proposals').insert({ workspace_id:data.workspaceId, job_id:data.jobId, snapshot: snapshot as never, deposit_cents:depositCents }).select('token').single();
    if (saveError) throw new Error('Could not create proposal');
    if (existing.data.length) {
      const { error: revokeError } = await supabaseAdmin.from('moving_proposals').update({ revoked_at:new Date().toISOString() }).in('id',existing.data.map(p=>p.id)).is('signed_at',null);
      if (revokeError) throw new Error('Could not retire the prior proposal');
    }
    const { error: jobError } = await supabaseAdmin.from('workspace_records').update({ data: { ...job, proposalToken:proposal.token, depositOverride:data.depositOverride } as never }).eq('id',data.jobId).eq('workspace_id',data.workspaceId);
    if (jobError) throw new Error('Proposal saved but job link could not be updated');
    return { token: proposal.token, depositCents };
  });
export const readProposal = createServerFn({ method: 'GET' })
  .inputValidator((v: unknown) => z.object({ token: proposalTokenSchema }).parse(v))
  .handler(async ({ data }): Promise<PublicProposal> => {
    const { data: proposal, error } = await publicClient().rpc('view_moving_proposal', { _token:data.token });
    if (error || !proposal) throw new Error('This proposal is unavailable or has been replaced');
    return proposal as unknown as PublicProposal;
  });
export const signProposal = createServerFn({ method: 'POST' })
  .inputValidator((v: unknown) => z.object({ token: proposalTokenSchema, signature:signatureSchema, acceptedTerms:z.literal(true) }).parse(v))
  .handler(async ({ data }) => {
    // A valid, unrevoked capability token authorizes only this proposal's signature.
    const visible = await publicClient().rpc('view_moving_proposal',{ _token:data.token });
    if (!visible.data || visible.error) throw new Error('Proposal unavailable');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.rpc('sign_moving_proposal',{ _token:data.token, _signature:data.signature });
    if (error) throw new Error('Could not save signature; the proposal may no longer be available');
    return { signed:true };
  });