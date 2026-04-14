import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Trigger.dev sends a webhook when a run fails/crashes (OOM, timeout, etc.)
// Configure this in Trigger.dev dashboard → Project → Webhooks
// URL: https://whatseo.ai/api/webhooks/trigger
// Events: run.failed, run.crashed, run.timed_out

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook secret to ensure it's from Trigger.dev
    const secret = request.headers.get('x-trigger-secret');
    if (process.env.TRIGGER_WEBHOOK_SECRET && secret !== process.env.TRIGGER_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, run } = body;

    // Only handle failure events
    if (!['run.failed', 'run.crashed', 'run.timed_out', 'run.oom'].includes(type)) {
      return NextResponse.json({ ok: true });
    }

    // Extract auditId and email from the run payload
    const payload = run?.payload as {
      auditId?: string;
      creditId?: string;
      url?: string;
      email?: string;
    } | undefined;

    if (!payload?.auditId) {
      return NextResponse.json({ ok: true });
    }

    const { auditId, creditId, url, email } = payload;
    const supabase = getSupabase();

    // Check if already marked as failed (graceful catch block ran)
    const { data: audit } = await supabase
      .from('Audit')
      .select('status, error')
      .eq('id', auditId)
      .single();

    if (audit?.status === 'failed' || audit?.status === 'complete') {
      // Already handled — skip
      return NextResponse.json({ ok: true });
    }

    const errorLabel = type === 'run.timed_out'
      ? 'Audit timed out — your site may be too large. Credit refunded.'
      : type === 'run.oom' || (run?.error?.message || '').toLowerCase().includes('memory')
      ? 'Audit ran out of memory — credit refunded. Please retry.'
      : `Audit crashed (${type}) — credit refunded.`;

    // Mark audit as failed
    await supabase.from('Audit').update({
      status: 'failed',
      error: errorLabel,
      phase: 'failed',
      updatedAt: new Date().toISOString(),
    }).eq('id', auditId);

    // Refund the credit
    if (creditId) {
      await supabase.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('id', creditId);
    } else {
      // Fallback: find credit by audit_id
      await supabase.from('audit_credits').update({
        status: 'available',
        audit_id: null,
        used_at: null,
      }).eq('audit_id', auditId);
    }

    // Send failure email
    try {
      if (email && process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const client = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatseo.vercel.app';
        await client.emails.send({
          from: `WhatSEO.ai <${process.env.RESEND_FROM_EMAIL || 'reports@whatseo.ai'}>`,
          to: email,
          subject: `Your SEO Audit Encountered an Issue`,
          html: `<div style="max-width:600px;margin:0 auto;padding:40px 24px;background:#1a1a1a;font-family:system-ui,sans-serif;">
            <div style="text-align:center;margin-bottom:32px;">
              <span style="font-size:20px;font-weight:bold;color:#f5f0e8;">What</span><span style="font-size:20px;font-weight:bold;color:#c9a85c;">SEO</span><span style="font-size:14px;color:#a09888;">.ai</span>
            </div>
            <div style="background:#232323;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;border-radius:50%;background:#3d1f1f;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 16px;display:block;">
                <span style="font-size:24px;font-weight:bold;color:#e05555;line-height:56px;">!</span>
              </div>
              <p style="color:#c9a85c;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Audit Unsuccessful</p>
              <h2 style="color:#f5f0e8;font-size:20px;margin:0 0 12px;">We hit a snag auditing ${url || 'your site'}</h2>
              <p style="color:#a09888;font-size:14px;margin:0 0 20px;">Your audit credit has been fully refunded and is ready to use again.</p>
              <a href="${appUrl}/dashboard" style="display:inline-block;background:#c9a85c;color:#1a1a1a;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:15px;">Retry from Dashboard →</a>
            </div>
            <p style="color:#6b6b6b;font-size:12px;text-align:center;">If this keeps happening, reply to this email and we'll look into it.</p>
          </div>`,
        });
      }
    } catch (emailErr) {
      console.error('Webhook failure email error:', emailErr);
    }

    console.log(`Webhook: cleaned up failed audit ${auditId} (${type})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Trigger webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
