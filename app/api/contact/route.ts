import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const toEmail = process.env.CONTACT_EMAIL || 'hello@whatseo.ai';
    const apiKey = process.env.RESEND_API_KEY;

    const subjectLabels: Record<string, string> = {
      'report-question': 'Question about my report',
      'agency-pricing': 'Agency/volume pricing',
      'technical-issue': 'Technical issue',
      'general-feedback': 'General feedback',
    };

    const subjectLabel = subjectLabels[subject] ?? subject;
    const emailSubject = `[WhatSEO.ai Contact] ${subjectLabel} — from ${name}`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #914d00;">New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px 0; color: #7a7a72; font-size: 14px; width: 100px;">Name</td>
            <td style="padding: 8px 0; color: #1c1c18; font-size: 14px;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7a7a72; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #914d00;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7a7a72; font-size: 14px;">Subject</td>
            <td style="padding: 8px 0; color: #1c1c18; font-size: 14px;">${subjectLabel}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #ede9e3; margin: 16px 0;" />
        <h3 style="color: #4a4a44; font-size: 14px; margin-bottom: 8px;">Message</h3>
        <p style="color: #1c1c18; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <hr style="border: none; border-top: 1px solid #ede9e3; margin: 16px 0;" />
        <p style="color: #7a7a72; font-size: 12px;">Sent via WhatSEO.ai contact form</p>
      </div>
    `;

    if (apiKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'WhatSEO.ai Contact <noreply@whatseo.ai>',
          to: [toEmail],
          reply_to: email,
          subject: emailSubject,
          html: htmlBody,
        }),
      });

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text();
        console.error('[contact] Resend error:', resendError);
        // Still return ok to the user — don't expose internal errors
      }
    } else {
      // No API key — log to console in development
      console.log('[contact] RESEND_API_KEY not set. Would have sent:', {
        to: toEmail,
        subject: emailSubject,
        from: name,
        email,
        message,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
