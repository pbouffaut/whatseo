import type { ScoreDelta } from './score-delta';

// ─── Shared constants ────────────────────────────────────────────────────────

const BG = '#1a1a1a';
const CARD = '#232323';
const GOLD = '#c9a85c';
const CREAM = '#f5f0e8';
const MUTED = '#a09888';
const GREEN = '#4aab6a';
const ORANGE = '#d4952b';
const RED = '#e05555';

function logoHeader(): string {
  return `<div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:22px;font-weight:bold;color:${CREAM};">What</span><span style="font-size:22px;font-weight:bold;color:${GOLD};">SEO</span><span style="font-size:15px;color:${MUTED};">.ai</span>
  </div>`;
}

function emailWrapper(content: string): string {
  return `<div style="max-width:600px;margin:0 auto;padding:40px 24px;background:${BG};font-family:system-ui,sans-serif;">
    ${logoHeader()}
    ${content}
  </div>`;
}

function card(content: string, extraStyle = ''): string {
  return `<div style="background:${CARD};border-radius:16px;padding:28px 32px;margin-bottom:20px;${extraStyle}">${content}</div>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${GOLD};color:#1a1a1a;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;
}

function secondaryLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${GOLD};font-size:13px;text-decoration:none;">${label} →</a>`;
}

function divider(): string {
  return `<div style="border-top:1px solid #2e2e2e;margin:20px 0;"></div>`;
}

// ─── buildMonitoringEmail ────────────────────────────────────────────────────

export interface MonitoringEmailParams {
  email: string;
  url: string;
  auditId: string;
  appUrl: string;
  currentScore: number;
  previousScore?: number;
  delta: ScoreDelta | null;
  topActions: string[];
  gscSummary: {
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    topMovers: { page: string; positionBefore: number; positionAfter: number }[];
  } | null;
  pagesCrawled: number;
  isFirstRun: boolean;
}

export function buildMonitoringEmail(params: MonitoringEmailParams): { subject: string; html: string } {
  const {
    url,
    auditId,
    appUrl,
    currentScore,
    delta,
    topActions,
    gscSummary,
    pagesCrawled,
    isFirstRun,
  } = params;

  const reportUrl = `${appUrl}/results/${auditId}`;
  const jiraUrl = `${appUrl}/results/${auditId}?push=jira`;

  // ── Subject ──
  let subject: string;
  if (isFirstRun) {
    subject = `Your SEO baseline is set — Score: ${currentScore}/100 · ${url}`;
  } else if (delta && delta.overall > 0) {
    subject = `SEO score improved +${delta.overall} pts · ${url}`;
  } else if (delta && delta.overall < 0) {
    subject = `SEO score dropped ${Math.abs(delta.overall)} pts — action needed · ${url}`;
  } else {
    subject = `Monthly SEO digest — Score: ${currentScore}/100 · ${url}`;
  }

  // ── Score color ──
  const scoreColor = currentScore >= 70 ? GREEN : currentScore >= 40 ? ORANGE : RED;

  // ── Banner ──
  let bannerHtml = '';
  if (isFirstRun) {
    bannerHtml = card(
      `<p style="color:${GOLD};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Baseline Established</p>
      <h2 style="color:${CREAM};font-size:20px;margin:0 0 8px;">Your SEO baseline is set for <span style="color:${GOLD};">${url}</span></h2>
      <p style="color:${MUTED};font-size:14px;margin:0;">We'll track your score every month and send you a digest when things change. This first run is your starting point.</p>`
    );
  } else if (delta && delta.overall > 0) {
    bannerHtml = card(
      `<p style="color:${GREEN};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Score Improved</p>
      <h2 style="color:${CREAM};font-size:20px;margin:0 0 6px;">Your score went up <span style="color:${GREEN};">+${delta.overall} points</span></h2>
      <p style="color:${MUTED};font-size:14px;margin:0;">Nice work — here's what moved.</p>`,
      `border-left:4px solid ${GREEN};`
    );
  } else if (delta && delta.overall < 0) {
    bannerHtml = card(
      `<p style="color:${ORANGE};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Score Dropped</p>
      <h2 style="color:${CREAM};font-size:20px;margin:0 0 6px;">Your score dropped <span style="color:${ORANGE};">${Math.abs(delta.overall)} points</span> — action needed</h2>
      <p style="color:${MUTED};font-size:14px;margin:0;">Some dimensions regressed since last month. Check the breakdown below.</p>`,
      `border-left:4px solid ${ORANGE};`
    );
  } else {
    bannerHtml = card(
      `<p style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Score Unchanged</p>
      <h2 style="color:${CREAM};font-size:20px;margin:0 0 6px;">Score unchanged — here's what to watch</h2>
      <p style="color:${MUTED};font-size:14px;margin:0;">No movement since last month, but your action items are still waiting.</p>`
    );
  }

  // ── Score card ──
  const scoreCardHtml = card(
    `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div>
        <p style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px;">Overall SEO Score</p>
        <div style="font-size:56px;font-weight:bold;color:${scoreColor};line-height:1;">${currentScore}</div>
        <p style="color:${MUTED};font-size:13px;margin:4px 0 0;">/ 100 &nbsp;·&nbsp; ${pagesCrawled} pages crawled</p>
      </div>
      ${!isFirstRun && delta !== null ? `<div style="text-align:right;">
        <p style="color:${MUTED};font-size:12px;margin:0 0 4px;">vs last month</p>
        <div style="font-size:28px;font-weight:bold;color:${delta.overall > 0 ? GREEN : delta.overall < 0 ? ORANGE : MUTED};">${delta.overall > 0 ? '+' : ''}${delta.overall}</div>
      </div>` : ''}
    </div>`
  );

  // ── Dimension deltas ──
  let deltaSectionHtml = '';
  if (!isFirstRun && delta) {
    const rows: string[] = [];

    for (const d of delta.improved) {
      rows.push(
        `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2e2e2e;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:${GREEN};font-size:16px;">&#10003;</span>
            <span style="color:${CREAM};font-size:14px;">${d.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:${MUTED};font-size:13px;">${d.from} → ${d.to}</span>
            <span style="color:${GREEN};font-size:13px;font-weight:600;">+${d.delta}</span>
          </div>
        </div>`
      );
    }

    for (const d of delta.regressed) {
      rows.push(
        `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2e2e2e;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:${ORANGE};font-size:16px;">&#9651;</span>
            <span style="color:${CREAM};font-size:14px;">${d.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:${MUTED};font-size:13px;">${d.from} → ${d.to}</span>
            <span style="color:${ORANGE};font-size:13px;font-weight:600;">${d.delta}</span>
          </div>
        </div>`
      );
    }

    if (delta.unchanged.length > 0) {
      rows.push(
        `<div style="padding:10px 0;">
          <span style="color:${MUTED};font-size:13px;">Unchanged: ${delta.unchanged.join(', ')}</span>
        </div>`
      );
    }

    if (rows.length > 0) {
      deltaSectionHtml = card(
        `<p style="color:${GOLD};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Dimension Breakdown</p>
        ${rows.join('')}`
      );
    }
  }

  // ── Top actions ──
  let actionsHtml = '';
  if (topActions.length > 0) {
    const actionItems = topActions
      .slice(0, 3)
      .map(
        (a, i) =>
          `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;${i < Math.min(topActions.length, 3) - 1 ? 'border-bottom:1px solid #2e2e2e;' : ''}">
            <span style="display:inline-block;min-width:22px;height:22px;border-radius:50%;background:${GOLD};color:#1a1a1a;font-size:12px;font-weight:bold;text-align:center;line-height:22px;">${i + 1}</span>
            <span style="color:${CREAM};font-size:14px;line-height:1.5;">${a}</span>
          </div>`
      )
      .join('');
    actionsHtml = card(
      `<p style="color:${GOLD};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Top Actions</p>
      ${actionItems}`
    );
  }

  // ── GSC snapshot ──
  let gscHtml = '';
  if (gscSummary) {
    const moverRows = gscSummary.topMovers
      .slice(0, 5)
      .map((m) => {
        const improved = m.positionAfter < m.positionBefore;
        const arrow = improved ? `<span style="color:${GREEN};">&#8593;</span>` : `<span style="color:${ORANGE};">&#8595;</span>`;
        const shortPage = m.page.replace(/^https?:\/\/[^/]+/, '') || '/';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2e2e2e;">
          <span style="color:${MUTED};font-size:13px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shortPage}</span>
          <span style="color:${CREAM};font-size:13px;white-space:nowrap;">${arrow} ${m.positionBefore.toFixed(1)} → ${m.positionAfter.toFixed(1)}</span>
        </div>`;
      })
      .join('');

    gscHtml = card(
      `<p style="color:${GOLD};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Google Search Console Snapshot</p>
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px;">
        <div>
          <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Total Clicks</p>
          <p style="color:${CREAM};font-size:22px;font-weight:bold;margin:0;">${gscSummary.totalClicks.toLocaleString()}</p>
        </div>
        <div>
          <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Impressions</p>
          <p style="color:${CREAM};font-size:22px;font-weight:bold;margin:0;">${gscSummary.totalImpressions.toLocaleString()}</p>
        </div>
        <div>
          <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Avg. Position</p>
          <p style="color:${CREAM};font-size:22px;font-weight:bold;margin:0;">${gscSummary.avgPosition.toFixed(1)}</p>
        </div>
      </div>
      ${moverRows.length > 0 ? `<p style="color:${MUTED};font-size:12px;margin:0 0 8px;">Top position movers</p>${moverRows}` : ''}`
    );
  }

  // ── CTA ──
  const ctaHtml = `<div style="text-align:center;margin:28px 0 16px;">
    ${ctaButton(reportUrl, 'View Full Report')}
  </div>
  <div style="text-align:center;margin-bottom:8px;">
    ${secondaryLink(jiraUrl, 'Push tickets to Jira')}
  </div>`;

  // ── Footer ──
  const footerHtml = `<p style="color:#555;font-size:12px;text-align:center;margin-top:32px;">
    Sent by <a href="${appUrl}" style="color:${MUTED};text-decoration:none;">WhatSEO.ai</a> · Monthly monitoring digest for ${url}
  </p>`;

  const html = emailWrapper(
    `${bannerHtml}${scoreCardHtml}${deltaSectionHtml}${actionsHtml}${gscHtml}${ctaHtml}${divider()}${footerHtml}`
  );

  return { subject, html };
}

// ─── buildWatchdogEmail ──────────────────────────────────────────────────────

export interface WatchdogAlert {
  page: string;
  metric: string;
  before: number;
  after: number;
  pctChange: number;
  diagnosis: string;
}

export interface WatchdogEmailParams {
  email: string;
  url: string;
  appUrl: string;
  alerts: WatchdogAlert[];
}

export function buildWatchdogEmail(params: WatchdogEmailParams): { subject: string; html: string } {
  const { url, appUrl, alerts } = params;

  const subject = `${alerts.length} page${alerts.length !== 1 ? 's' : ''} need${alerts.length === 1 ? 's' : ''} attention — ${url}`;

  const alertRows = alerts
    .map((a) => {
      const shortPage = a.page.replace(/^https?:\/\/[^/]+/, '') || '/';
      const improved = a.pctChange > 0;
      const changeColor = improved ? GREEN : ORANGE;
      const sign = improved ? '+' : '';
      return card(
        `<div style="margin-bottom:8px;">
          <a href="${a.page}" style="color:${GOLD};font-size:14px;font-weight:600;text-decoration:none;word-break:break-all;">${shortPage}</a>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">${a.metric}</span>
            <span style="color:${CREAM};font-size:13px;margin-left:10px;">${a.before} → ${a.after}</span>
          </div>
          <span style="color:${changeColor};font-size:13px;font-weight:600;">${sign}${a.pctChange.toFixed(1)}%</span>
        </div>
        <p style="color:${MUTED};font-size:13px;margin:10px 0 0;line-height:1.5;">${a.diagnosis}</p>`
      );
    })
    .join('');

  const ctaHtml = `<div style="text-align:center;margin:24px 0 8px;">
    ${ctaButton(appUrl, 'Review All Alerts')}
  </div>`;

  const footerHtml = `<p style="color:#555;font-size:12px;text-align:center;margin-top:32px;">
    Sent by <a href="${appUrl}" style="color:${MUTED};text-decoration:none;">WhatSEO.ai</a> · Weekly content watchdog for ${url}
  </p>`;

  const headerCard = card(
    `<p style="color:${ORANGE};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Content Watchdog Alert</p>
    <h2 style="color:${CREAM};font-size:20px;margin:0 0 6px;">${alerts.length} page${alerts.length !== 1 ? 's' : ''} ${alerts.length === 1 ? 'has' : 'have'} degraded on <span style="color:${GOLD};">${url}</span></h2>
    <p style="color:${MUTED};font-size:14px;margin:0;">Review the details below and take action before rankings are affected.</p>`,
    `border-left:4px solid ${ORANGE};`
  );

  const html = emailWrapper(`${headerCard}${alertRows}${ctaHtml}${divider()}${footerHtml}`);

  return { subject, html };
}

// ─── buildIndexationAlertEmail ───────────────────────────────────────────────

export interface IndexationAlertEmailParams {
  email: string;
  url: string;
  appUrl: string;
  auditId: string;
  notIndexedCount: number;
  notIndexedPages: string[];
}

export function buildIndexationAlertEmail(params: IndexationAlertEmailParams): { subject: string; html: string } {
  const { url, appUrl, auditId, notIndexedCount, notIndexedPages } = params;

  const subject = `${notIndexedCount} page${notIndexedCount !== 1 ? 's' : ''} not indexed by Google — ${url}`;
  const reportUrl = `${appUrl}/results/${auditId}?tab=indexation`;

  const topPages = notIndexedPages.slice(0, 10);

  const pageListHtml = topPages
    .map((p, i) => {
      const shortPage = p.replace(/^https?:\/\/[^/]+/, '') || '/';
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;${i < topPages.length - 1 ? 'border-bottom:1px solid #2e2e2e;' : ''}">
        <span style="color:${RED};font-size:14px;">&#215;</span>
        <a href="${p}" style="color:${CREAM};font-size:13px;text-decoration:none;word-break:break-all;">${shortPage}</a>
      </div>`;
    })
    .join('');

  const moreHtml =
    notIndexedCount > 10
      ? `<p style="color:${MUTED};font-size:13px;margin:12px 0 0;">…and ${notIndexedCount - 10} more. <a href="${reportUrl}" style="color:${GOLD};text-decoration:none;">View all in the report →</a></p>`
      : '';

  const headerCard = card(
    `<p style="color:${RED};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Indexation Alert</p>
    <h2 style="color:${CREAM};font-size:20px;margin:0 0 8px;"><span style="color:${RED};">${notIndexedCount} page${notIndexedCount !== 1 ? 's' : ''}</span> ${notIndexedCount === 1 ? 'is' : 'are'} not indexed by Google</h2>
    <p style="color:${MUTED};font-size:14px;margin:0;">These pages are invisible in search results. Use the WhatSEO.ai report to diagnose and fix each URL.</p>`,
    `border-left:4px solid ${RED};`
  );

  const listCard = card(
    `<p style="color:${GOLD};font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Not Indexed Pages</p>
    ${pageListHtml}${moreHtml}`
  );

  const ctaHtml = `<div style="text-align:center;margin:24px 0 8px;">
    ${ctaButton(reportUrl, 'View Indexation Report')}
  </div>`;

  const footerHtml = `<p style="color:#555;font-size:12px;text-align:center;margin-top:32px;">
    Sent by <a href="${appUrl}" style="color:${MUTED};text-decoration:none;">WhatSEO.ai</a> · Indexation monitoring for ${url}
  </p>`;

  const html = emailWrapper(`${headerCard}${listCard}${ctaHtml}${divider()}${footerHtml}`);

  return { subject, html };
}
