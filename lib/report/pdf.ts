import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FullAuditResult, PremiumInsights, ActionPlanPhase, SchemaTemplate, AuditTicket, PageTypeGroup } from '../analyzer/types';

// Academic Rebel color palette
const PRIMARY: [number, number, number] = [145, 77, 0];      // #914d00
const DARK: [number, number, number] = [28, 28, 24];          // #1c1c18
const CREAM: [number, number, number] = [253, 249, 243];      // #fdf9f3
const SURFACE_LOW: [number, number, number] = [247, 243, 237]; // #f7f3ed
const MUTED: [number, number, number] = [74, 74, 68];         // #4a4a44
const LIGHT: [number, number, number] = [122, 122, 114];      // #7a7a72
const RED: [number, number, number] = [186, 26, 26];          // #ba1a1a
const GREEN: [number, number, number] = [77, 107, 50];        // #4d6b32
const ORANGE: [number, number, number] = [242, 140, 40];      // #f28c28
const OUTLINE: [number, number, number] = [219, 194, 176];    // #dbc2b0
const WHITE: [number, number, number] = [255, 255, 255];

function getScoreColor(score: number): [number, number, number] {
  if (score >= 70) return GREEN;
  if (score >= 40) return PRIMARY;
  return RED;
}

function getPhaseColor(phase: string): [number, number, number] {
  switch (phase) {
    case 'critical': return RED;
    case 'high': return ORANGE;
    case 'medium': return PRIMARY;
    case 'backlog': return LIGHT;
    default: return MUTED;
  }
}

function getPriorityColor(priority: string): [number, number, number] {
  switch (priority) {
    case 'P0': return RED;
    case 'P1': return ORANGE;
    case 'P2': return PRIMARY;
    case 'P3': return LIGHT;
    default: return MUTED;
  }
}

// Light tint: blend a color with white at a given opacity (0-1)
function tint(color: [number, number, number], opacity: number): [number, number, number] {
  return [
    Math.round(255 - (255 - color[0]) * opacity),
    Math.round(255 - (255 - color[1]) * opacity),
    Math.round(255 - (255 - color[2]) * opacity),
  ];
}

export function generateAuditPdf(result: FullAuditResult, websiteUrl: string): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- Determine premium mode ---
  const insights = result.insights;
  const isPremium = insights && 'actionPlan' in insights && Array.isArray((insights as PremiumInsights).actionPlan);
  const premium = isPremium ? (insights as PremiumInsights) : null;

  function addPage() {
    doc.addPage();
    y = margin;
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 25) addPage();
  }

  // Helper: section heading with number and title
  function sectionHeading(num: string, title: string) {
    checkPageBreak(25);
    doc.setTextColor(...PRIMARY);
    doc.setFontSize(8);
    doc.text(num, margin, y);
    doc.setTextColor(...DARK);
    doc.setFontSize(20);
    doc.text(title, margin + 8, y);
    y += 3;
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 30, y);
    y += 12;
  }

  // Helper: render multi-paragraph text
  function renderInsight(text: string, maxWidth: number) {
    if (!text) return;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const paragraphs = text.split('\n\n');
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const lines = doc.splitTextToSize(trimmed, maxWidth);
      const blockHeight = lines.length * 4 + 3;
      checkPageBreak(blockHeight);
      doc.text(lines, margin, y);
      y += blockHeight;
    }
    y += 3;
  }

  // Helper: render markdown-like text with ### headers and paragraphs
  function renderMarkdownText(text: string, maxWidth: number) {
    if (!text) return;
    const blocks = text.split('\n');
    let i = 0;
    while (i < blocks.length) {
      const line = blocks[i].trim();
      if (!line) { i++; continue; }

      if (line.startsWith('### ')) {
        checkPageBreak(15);
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text(line.replace('### ', ''), margin, y);
        y += 7;
      } else if (line.startsWith('## ')) {
        checkPageBreak(15);
        doc.setFontSize(14);
        doc.setTextColor(...DARK);
        doc.text(line.replace('## ', ''), margin, y);
        y += 8;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        const bulletText = line.replace(/^[-*]\s+/, '');
        const bulletLines = doc.splitTextToSize(bulletText, maxWidth - 6);
        const blockHeight = bulletLines.length * 4 + 2;
        checkPageBreak(blockHeight);
        doc.text('\u2022', margin + 1, y);
        doc.text(bulletLines, margin + 6, y);
        y += blockHeight;
      } else {
        // Accumulate paragraph lines
        let para = line;
        while (i + 1 < blocks.length && blocks[i + 1].trim() && !blocks[i + 1].trim().startsWith('#') && !blocks[i + 1].trim().startsWith('- ') && !blocks[i + 1].trim().startsWith('* ')) {
          i++;
          para += ' ' + blocks[i].trim();
        }
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        const pLines = doc.splitTextToSize(para, maxWidth);
        const blockHeight = pLines.length * 4 + 3;
        checkPageBreak(blockHeight);
        doc.text(pLines, margin, y);
        y += blockHeight;
      }
      i++;
    }
    y += 3;
  }

  // Helper: render a code block with monospace font in a light background
  function renderCodeBlock(codeText: string, startY: number, maxWidth: number): number {
    const prevFont = doc.getFont();
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);

    // Word-wrap code lines at ~90 chars
    const rawLines = codeText.split('\n');
    const wrappedLines: string[] = [];
    for (const rawLine of rawLines) {
      if (rawLine.length <= 90) {
        wrappedLines.push(rawLine);
      } else {
        // Wrap long lines
        let remaining = rawLine;
        while (remaining.length > 90) {
          wrappedLines.push(remaining.substring(0, 90));
          remaining = remaining.substring(90);
        }
        wrappedLines.push(remaining);
      }
    }

    const lineHeight = 3;
    const padding = 4;
    const totalHeight = wrappedLines.length * lineHeight + padding * 2;

    // Check if entire block fits on page
    let currentY = startY;
    if (currentY + totalHeight > pageHeight - 25) {
      // Render lines one chunk at a time, breaking across pages
      let lineIdx = 0;
      while (lineIdx < wrappedLines.length) {
        const availableHeight = pageHeight - 25 - currentY;
        const linesPerChunk = Math.max(1, Math.floor((availableHeight - padding * 2) / lineHeight));
        const chunk = wrappedLines.slice(lineIdx, lineIdx + linesPerChunk);
        const chunkHeight = chunk.length * lineHeight + padding * 2;

        if (currentY + chunkHeight > pageHeight - 25) {
          addPage();
          currentY = y;
        }

        // Background rect
        doc.setFillColor(...SURFACE_LOW);
        doc.rect(margin, currentY, maxWidth, chunkHeight, 'F');

        // Draw lines
        doc.setFont('courier', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...DARK);
        let textY = currentY + padding + 2;
        for (const line of chunk) {
          doc.text(line, margin + 3, textY);
          textY += lineHeight;
        }

        currentY += chunkHeight + 2;
        lineIdx += linesPerChunk;
      }
    } else {
      // Fits on current page
      doc.setFillColor(...SURFACE_LOW);
      doc.rect(margin, currentY, maxWidth, totalHeight, 'F');

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...DARK);
      let textY = currentY + padding + 2;
      for (const line of wrappedLines) {
        doc.text(line, margin + 3, textY);
        textY += lineHeight;
      }
      currentY += totalHeight + 2;
    }

    // Restore font
    doc.setFont(prevFont.fontName, prevFont.fontStyle);
    y = currentY;
    return currentY;
  }

  // Helper: render a colored callout box with title and bullet items
  function renderCalloutBox(title: string, items: string[], color: [number, number, number], startY: number, maxWidth: number): number {
    // Calculate dynamic height
    doc.setFontSize(8);
    let totalItemHeight = 0;
    const processedItems: string[][] = [];
    for (const item of items) {
      const lines = doc.splitTextToSize(item, maxWidth - 16);
      processedItems.push(lines);
      totalItemHeight += lines.length * 4 + 1;
    }
    const boxHeight = 14 + totalItemHeight + 4; // title area + items + padding

    let currentY = startY;
    if (currentY + boxHeight > pageHeight - 25) {
      addPage();
      currentY = y;
    }

    // Background (light tint of color)
    const bgColor = tint(color, 0.08);
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, currentY, maxWidth, boxHeight, 3, 3, 'F');

    // Border
    const borderColor = tint(color, 0.30);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, maxWidth, boxHeight, 3, 3, 'S');

    // Title
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, currentY + 7);

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    let itemY = currentY + 14;
    for (const lines of processedItems) {
      doc.text('\u2022', margin + 5, itemY);
      doc.text(lines, margin + 10, itemY);
      itemY += lines.length * 4 + 1;
    }

    y = currentY + boxHeight + 6;
    return y;
  }

  // Helper: sub-heading (smaller than section heading)
  function subHeading(title: string) {
    checkPageBreak(12);
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(title, margin, y);
    y += 8;
  }

  // Helper: small label
  function smallLabel(text: string) {
    checkPageBreak(8);
    doc.setFontSize(8);
    doc.setTextColor(...LIGHT);
    doc.text(text, margin, y);
    y += 5;
  }

  // Helper: get autoTable final Y
  function getTableY(): number {
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ============================================================
  // COVER PAGE
  // ============================================================
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(12);
  doc.text('WhatSEO.ai', margin, 50);

  doc.setTextColor(...DARK);
  doc.setFontSize(32);
  doc.text('SEO Audit Report', margin, 80);

  if (isPremium) {
    doc.setFontSize(11);
    doc.setTextColor(...PRIMARY);
    doc.text('PREMIUM', margin + doc.getTextWidth('SEO Audit Report  ') * (32 / doc.getFontSize()), 80);
  }

  doc.setFontSize(16);
  doc.setTextColor(...MUTED);
  doc.text(websiteUrl, margin, 95);

  const scoreColor = getScoreColor(result.score.overall);
  doc.setFontSize(72);
  doc.setTextColor(...scoreColor);
  doc.text(String(result.score.overall), pageWidth / 2, 160, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...LIGHT);
  doc.text('/ 100  SEO Health Score', pageWidth / 2, 175, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(`${result.pagesCrawled} pages analyzed  |  ${result.recommendations.length} recommendations  |  ${result.duration ? Math.round(result.duration / 1000) + 's' : ''}`, pageWidth / 2, 200, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...LIGHT);
  doc.text(new Date(result.analyzedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, 215, { align: 'center' });

  doc.setFontSize(8);
  doc.text('Generated by WhatSEO.ai  |  Confidential', pageWidth / 2, 280, { align: 'center' });

  doc.setFillColor(...PRIMARY);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  // ============================================================
  // If NOT premium, render the basic 5-section report (backward compat)
  // ============================================================
  if (!isPremium) {
    // --- EXECUTIVE SUMMARY ---
    addPage();
    sectionHeading('01', 'Executive Summary');

    if (insights?.topPriority) {
      doc.setFontSize(8);
      const prioLines = doc.splitTextToSize(insights.topPriority, contentWidth - 10);
      const boxHeight = prioLines.length * 4 + 14;
      checkPageBreak(boxHeight + 5);
      doc.setFillColor(250, 245, 235);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
      doc.setDrawColor(...OUTLINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');
      doc.setFontSize(7);
      doc.setTextColor(...PRIMARY);
      doc.text('#1 PRIORITY', margin + 5, y + 6);
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(prioLines, margin + 5, y + 12);
      y += boxHeight + 8;
    }

    if (insights?.executive) renderInsight(insights.executive, contentWidth);

    checkPageBreak(50);
    const catRows = Object.entries(result.score.categories).map(([key, val]) => {
      const labels: Record<string, string> = { technical: 'Technical SEO', content: 'Content Quality', onPage: 'On-Page SEO', schema: 'Schema Markup', performance: 'Performance', aiReadiness: 'AI Search Ready', images: 'Images' };
      return [labels[key] || key, `${val.score}/100`, `${val.weight}%`, val.weighted.toFixed(1)];
    });
    catRows.push(['Total', '', '', `${result.score.overall}/100`]);

    autoTable(doc, {
      startY: y, head: [['Category', 'Score', 'Weight', 'Weighted']], body: catRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
      headStyles: { fillColor: [...DARK], textColor: [...WHITE], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...SURFACE_LOW] },
    });
    y = getTableY();

    checkPageBreak(60);
    doc.setTextColor(...DARK);
    doc.setFontSize(14);
    doc.text('Patterns Detected', margin, y);
    y += 8;

    const patterns = [
      ['Thin Content Pages (<300 words)', String(result.thinContentPages?.length || 0)],
      ['Missing Title Tags', String(result.missingTitlePages?.length || 0)],
      ['Missing Meta Descriptions', String(result.missingMetaDescPages?.length || 0)],
      ['Missing Schema Markup', String(result.missingSchemaPages?.length || 0)],
      ['Duplicate Titles', String(result.duplicateTitles?.length || 0)],
      ['Slow Pages (>2s)', String(result.slowPages?.length || 0)],
      ['Broken Links', String(result.brokenLinks?.length || 0)],
    ];

    autoTable(doc, {
      startY: y, head: [['Issue', 'Count']], body: patterns,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
      headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
      alternateRowStyles: { fillColor: [...SURFACE_LOW] },
      columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
    });
    y = getTableY();

    // --- EXPERT ANALYSIS ---
    addPage();
    sectionHeading('02', 'Expert Analysis');

    if (insights) {
      const sections = [
        { key: 'technical', label: 'Technical SEO' },
        { key: 'onPage', label: 'On-Page SEO' },
        { key: 'content', label: 'Content Quality' },
        { key: 'schema', label: 'Structured Data' },
        { key: 'performance', label: 'Performance' },
        { key: 'aiReadiness', label: 'AI Search Readiness' },
        { key: 'images', label: 'Image Optimization' },
      ];
      for (const { key, label } of sections) {
        const text = insights[key as keyof typeof insights];
        if (!text || typeof text !== 'string') continue;
        checkPageBreak(25);
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text(label, margin, y);
        y += 6;
        renderInsight(text, contentWidth);
        y += 2;
      }
      if (insights.googleData) {
        checkPageBreak(25);
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text('Google Search & Analytics', margin, y);
        y += 6;
        renderInsight(insights.googleData, contentWidth);
      }
    }

    // --- RECOMMENDATIONS ---
    addPage();
    sectionHeading('03', 'Prioritized Recommendations');

    for (const rec of result.recommendations) {
      checkPageBreak(30);
      const impactColor = rec.impact === 'high' ? RED : rec.impact === 'medium' ? ORANGE : GREEN;
      doc.setFontSize(7);
      doc.setTextColor(...impactColor);
      doc.text(`${rec.impact.toUpperCase()} IMPACT  |  ${rec.effort.toUpperCase()} EFFORT`, margin, y);
      y += 5;
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(rec.title, margin, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const descLines = doc.splitTextToSize(rec.description, contentWidth);
      checkPageBreak(descLines.length * 4 + 10);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 2;
      if (rec.affectedUrls.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...PRIMARY);
        doc.text(`${rec.affectedUrls.length} affected URLs`, margin, y);
        y += 4;
        doc.setTextColor(...LIGHT);
        for (const url of rec.affectedUrls.slice(0, 5)) {
          checkPageBreak(5);
          doc.text(`  ${url}`, margin + 2, y);
          y += 3.5;
        }
        if (rec.affectedUrls.length > 5) {
          doc.text(`  ...and ${rec.affectedUrls.length - 5} more`, margin + 2, y);
          y += 3.5;
        }
      }
      y += 6;
    }

    // --- PAGES TABLE ---
    addPage();
    sectionHeading('04', 'Pages Analyzed');

    const pageRows = result.pages.slice(0, 50).map((p) => {
      const urlPath = p.url.replace(/^https?:\/\/[^/]+/, '') || '/';
      return [
        urlPath.length > 40 ? urlPath.substring(0, 40) + '...' : urlPath,
        String(p.statusCode), `${p.responseTime}ms`, String(p.content.wordCount),
        p.schema.jsonLdBlocks > 0 ? 'Yes' : 'No',
      ];
    });

    autoTable(doc, {
      startY: y, head: [['URL', 'Status', 'Speed', 'Words', 'Schema']], body: pageRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, textColor: [...DARK] },
      headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
      alternateRowStyles: { fillColor: [...SURFACE_LOW] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center', cellWidth: 15 }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'center', cellWidth: 20 }, 4: { halign: 'center', cellWidth: 15 } },
    });

    // --- GOOGLE DATA ---
    if (result.googleData?.gsc || result.googleData?.ga4 || result.googleData?.crux) {
      addPage();
      sectionHeading('05', 'Google Data');

      if (result.googleData.gsc) {
        const gsc = result.googleData.gsc;
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text('Search Console (90 days)', margin, y);
        y += 8;
        const queryRows = gsc.topQueries.slice(0, 20).map((q) => [
          q.query.length > 35 ? q.query.substring(0, 35) + '...' : q.query,
          String(q.clicks), String(q.impressions), (q.ctr * 100).toFixed(1) + '%', q.position.toFixed(1),
        ]);
        autoTable(doc, {
          startY: y, head: [['Query', 'Clicks', 'Impressions', 'CTR', 'Position']], body: queryRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 2, textColor: [...DARK] },
          headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
          alternateRowStyles: { fillColor: [...SURFACE_LOW] },
        });
        y = getTableY();
      }

      if (result.googleData.ga4) {
        checkPageBreak(40);
        const ga4 = result.googleData.ga4;
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text('Google Analytics (90 days)', margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text(`Organic Sessions: ${ga4.organicSessions}  |  Organic Share: ${ga4.organicPercentage.toFixed(1)}%  |  Engagement: ${ga4.engagementRate.toFixed(1)}%`, margin, y);
        y += 10;
      }

      if (result.googleData.crux) {
        checkPageBreak(40);
        const crux = result.googleData.crux;
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text('Core Web Vitals (Real Users)', margin, y);
        y += 8;
        const cwvRows: string[][] = [];
        if (crux.lcp) cwvRows.push(['LCP', `${crux.lcp.p75}ms`, `${crux.lcp.good}% good`, crux.lcp.p75 <= 2500 ? 'PASS' : 'FAIL']);
        if (crux.inp) cwvRows.push(['INP', `${crux.inp.p75}ms`, `${crux.inp.good}% good`, crux.inp.p75 <= 200 ? 'PASS' : 'FAIL']);
        if (crux.cls) cwvRows.push(['CLS', String(crux.cls.p75), `${crux.cls.good}% good`, crux.cls.p75 <= 0.1 ? 'PASS' : 'FAIL']);
        if (cwvRows.length > 0) {
          autoTable(doc, {
            startY: y, head: [['Metric', 'p75', 'Distribution', 'Status']], body: cwvRows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
            headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
            alternateRowStyles: { fillColor: [...SURFACE_LOW] },
          });
        }
      }
    }

    // --- FOOTERS ---
    addFooters(doc, pageWidth, margin);
    return Buffer.from(doc.output('arraybuffer'));
  }

  // ============================================================
  // PREMIUM REPORT: 7 sections + table of contents
  // ============================================================

  // --- TABLE OF CONTENTS ---
  addPage();
  doc.setTextColor(...DARK);
  doc.setFontSize(20);
  doc.text('Table of Contents', margin, y);
  y += 3;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 30, y);
  y += 15;

  const tocEntries = [
    { num: '01', title: 'SEO Audit Report' },
    { num: '02', title: 'Action Plan' },
    { num: '03', title: 'Google Data Report' },
    { num: '04', title: 'Deep-Dive Findings' },
    { num: '05', title: 'Schema Templates' },
    { num: '06', title: 'Implementation Guide' },
    { num: '07', title: 'Implementation Tickets' },
  ];

  for (const entry of tocEntries) {
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text(entry.num, margin, y);
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(entry.title, margin + 12, y);
    y += 4;
    doc.setDrawColor(...OUTLINE);
    doc.setLineWidth(0.15);
    doc.line(margin + 12, y, pageWidth - margin, y);
    y += 10;
  }

  // ============================================================
  // SECTION 01 — SEO Audit Report
  // ============================================================
  addPage();
  sectionHeading('01', 'SEO Audit Report');

  // #1 Priority callout
  if (premium!.topPriority) {
    doc.setFontSize(8);
    const prioLines = doc.splitTextToSize(premium!.topPriority, contentWidth - 10);
    const boxHeight = prioLines.length * 4 + 14;
    checkPageBreak(boxHeight + 5);

    doc.setFillColor(250, 245, 235);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
    doc.setDrawColor(...OUTLINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'S');

    doc.setFontSize(7);
    doc.setTextColor(...PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.text('#1 PRIORITY', margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');

    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(prioLines, margin + 5, y + 12);
    y += boxHeight + 8;
  }

  // Executive summary
  if (premium!.executive) {
    renderInsight(premium!.executive, contentWidth);
  }

  // 5 Critical Issues callout
  if (premium!.criticalIssues && premium!.criticalIssues.length > 0) {
    renderCalloutBox('5 CRITICAL ISSUES', premium!.criticalIssues, RED, y, contentWidth);
  }

  // 5 Quick Wins callout
  if (premium!.quickWins && premium!.quickWins.length > 0) {
    renderCalloutBox('5 QUICK WINS', premium!.quickWins, GREEN, y, contentWidth);
  }

  // Score breakdown table
  checkPageBreak(50);
  const catRows = Object.entries(result.score.categories).map(([key, val]) => {
    const labels: Record<string, string> = { technical: 'Technical SEO', content: 'Content Quality', onPage: 'On-Page SEO', schema: 'Schema Markup', performance: 'Performance', aiReadiness: 'AI Search Ready', images: 'Images' };
    return [labels[key] || key, `${val.score}/100`, `${val.weight}%`, val.weighted.toFixed(1)];
  });
  catRows.push(['Total', '', '', `${result.score.overall}/100`]);

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Score', 'Weight', 'Weighted']],
    body: catRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
    headStyles: { fillColor: [...DARK], textColor: [...WHITE], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [...SURFACE_LOW] },
  });
  y = getTableY();

  // Patterns detected table
  checkPageBreak(60);
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.text('Patterns Detected', margin, y);
  y += 8;

  const patternsData = [
    ['Thin Content Pages (<300 words)', String(result.thinContentPages?.length || 0)],
    ['Missing Title Tags', String(result.missingTitlePages?.length || 0)],
    ['Missing Meta Descriptions', String(result.missingMetaDescPages?.length || 0)],
    ['Missing Schema Markup', String(result.missingSchemaPages?.length || 0)],
    ['Duplicate Titles', String(result.duplicateTitles?.length || 0)],
    ['Slow Pages (>2s)', String(result.slowPages?.length || 0)],
    ['Broken Links', String(result.brokenLinks?.length || 0)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Issue', 'Count']],
    body: patternsData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
    headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
    alternateRowStyles: { fillColor: [...SURFACE_LOW] },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
  });
  y = getTableY();

  // ============================================================
  // SECTION 02 — Action Plan
  // ============================================================
  addPage();
  sectionHeading('02', 'Action Plan');

  if (premium!.actionPlan && premium!.actionPlan.length > 0) {
    for (const phase of premium!.actionPlan) {
      const phaseColor = getPhaseColor(phase.phase);

      // Phase header
      checkPageBreak(25);
      doc.setFillColor(...tint(phaseColor, 0.12));
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
      doc.setDrawColor(...phaseColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'S');

      doc.setFontSize(10);
      doc.setTextColor(...phaseColor);
      doc.setFont('helvetica', 'bold');
      doc.text(phase.title.toUpperCase(), margin + 5, y + 6);
      doc.setFont('helvetica', 'normal');

      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Timeline: ${phase.timeline}  |  Projected Score: ${phase.projectedScore}/100`, margin + 5, y + 11);
      y += 18;

      // Phase items as autoTable
      if (phase.items && phase.items.length > 0) {
        const itemRows = phase.items.map((item) => [
          item.title,
          item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description,
          item.effort,
          item.impact,
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Title', 'Description', 'Effort', 'Impact']],
          body: itemRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [...DARK] },
          headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
          alternateRowStyles: { fillColor: [...SURFACE_LOW] },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 85 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
          },
        });
        y = getTableY();
      }

      y += 4;
    }
  }

  // ============================================================
  // SECTION 03 — Google Data Report
  // ============================================================
  addPage();
  sectionHeading('03', 'Google Data Report');

  // Google Data Deep analysis (Claude-generated)
  if (premium!.googleDataDeep) {
    renderMarkdownText(premium!.googleDataDeep, contentWidth);
  }

  // GSC Queries table (top 20)
  if (result.googleData?.gsc) {
    const gsc = result.googleData.gsc;

    checkPageBreak(20);
    subHeading('Search Console — Top Queries (90 days)');

    const queryRows = gsc.topQueries.slice(0, 20).map((q) => [
      q.query.length > 35 ? q.query.substring(0, 35) + '...' : q.query,
      String(q.clicks),
      String(q.impressions),
      (q.ctr * 100).toFixed(1) + '%',
      q.position.toFixed(1),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Query', 'Clicks', 'Impressions', 'CTR', 'Position']],
      body: queryRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, textColor: [...DARK] },
      headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
      alternateRowStyles: { fillColor: [...SURFACE_LOW] },
    });
    y = getTableY();

    // GSC Pages table (top 15)
    if (gsc.topPages && gsc.topPages.length > 0) {
      checkPageBreak(20);
      subHeading('Search Console — Top Pages by Clicks');

      const pageRows = gsc.topPages.slice(0, 15).map((p) => {
        const shortUrl = p.page.replace(/^https?:\/\/[^/]+/, '') || '/';
        return [
          shortUrl.length > 50 ? shortUrl.substring(0, 50) + '...' : shortUrl,
          String(p.clicks),
          String(p.impressions),
          (p.ctr * 100).toFixed(1) + '%',
          p.position.toFixed(1),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Page', 'Clicks', 'Impressions', 'CTR', 'Avg Pos']],
        body: pageRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 2, textColor: [...DARK] },
        headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
        alternateRowStyles: { fillColor: [...SURFACE_LOW] },
        columnStyles: { 0: { cellWidth: 80 } },
      });
      y = getTableY();
    }
  }

  // GA4 Metrics Summary
  if (result.googleData?.ga4) {
    checkPageBreak(30);
    subHeading('Google Analytics (90 days)');

    const ga4 = result.googleData.ga4;
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`Organic Sessions: ${ga4.organicSessions}  |  Organic Share: ${ga4.organicPercentage.toFixed(1)}%  |  Engagement: ${ga4.engagementRate.toFixed(1)}%`, margin, y);
    y += 10;
  }

  // CrUX Core Web Vitals table
  if (result.googleData?.crux) {
    checkPageBreak(30);
    subHeading('Core Web Vitals (Real Users)');

    const crux = result.googleData.crux;
    const cwvRows: string[][] = [];
    if (crux.lcp) cwvRows.push(['LCP', `${crux.lcp.p75}ms`, `${crux.lcp.good}% good`, crux.lcp.p75 <= 2500 ? 'PASS' : 'FAIL']);
    if (crux.inp) cwvRows.push(['INP', `${crux.inp.p75}ms`, `${crux.inp.good}% good`, crux.inp.p75 <= 200 ? 'PASS' : 'FAIL']);
    if (crux.cls) cwvRows.push(['CLS', String(crux.cls.p75), `${crux.cls.good}% good`, crux.cls.p75 <= 0.1 ? 'PASS' : 'FAIL']);

    if (cwvRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'p75', 'Distribution', 'Status']],
        body: cwvRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3, textColor: [...DARK] },
        headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
        alternateRowStyles: { fillColor: [...SURFACE_LOW] },
      });
      y = getTableY();
    }
  }

  // If no google data at all, show a note
  if (!result.googleData?.gsc && !result.googleData?.ga4 && !result.googleData?.crux && !premium!.googleDataDeep) {
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT);
    doc.text('No Google API data was connected for this audit.', margin, y);
    y += 10;
  }

  // ============================================================
  // SECTION 04 — Deep-Dive Findings
  // ============================================================
  addPage();
  sectionHeading('04', 'Deep-Dive Findings');

  const pageTypeGroups = result.pageTypeGroups || [];

  if (pageTypeGroups.length > 0 && premium!.deepDive) {
    // Split deepDive by ### headers to match with page type groups
    const deepDiveSections = splitByHeaders(premium!.deepDive);

    for (const group of pageTypeGroups) {
      checkPageBreak(30);

      // Sub-heading for page type group
      doc.setFontSize(13);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(group.label, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Stats line
      doc.setFontSize(8);
      doc.setTextColor(...LIGHT);
      doc.text(
        `${group.count} pages  |  Pattern: ${group.urlPattern}  |  Avg words: ${group.avgWordCount}  |  Avg speed: ${group.avgResponseTime}ms  |  Schema: ${group.schemaPresent}/${group.count}`,
        margin, y
      );
      y += 6;

      // Find the matching deep dive section for this group
      const matchingSection = deepDiveSections.find((s) =>
        s.header.toLowerCase().includes(group.label.toLowerCase()) ||
        s.header.toLowerCase().includes(group.type.toLowerCase())
      );

      if (matchingSection) {
        renderMarkdownText(matchingSection.body, contentWidth);
      }

      // Sample URLs
      if (group.sampleUrls && group.sampleUrls.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(7);
        doc.setTextColor(...PRIMARY);
        doc.text('Sample URLs:', margin, y);
        y += 4;
        doc.setTextColor(...LIGHT);
        for (const url of group.sampleUrls.slice(0, 5)) {
          checkPageBreak(5);
          const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url;
          doc.text(`  ${shortUrl}`, margin + 2, y);
          y += 3.5;
        }
        y += 4;
      }

      y += 4;
    }
  } else if (premium!.deepDive) {
    // No page type groups, just render the full deep dive text
    renderMarkdownText(premium!.deepDive, contentWidth);
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT);
    doc.text('No deep-dive analysis available.', margin, y);
    y += 10;
  }

  // ============================================================
  // SECTION 05 — Schema Templates
  // ============================================================
  addPage();
  sectionHeading('05', 'Schema Templates');

  if (premium!.schemaTemplates && premium!.schemaTemplates.length > 0) {
    for (const schema of premium!.schemaTemplates) {
      checkPageBreak(30);

      // Schema type name heading
      doc.setFontSize(12);
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(schema.type, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Description paragraph
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const descLines = doc.splitTextToSize(schema.description, contentWidth);
      const descHeight = descLines.length * 4 + 2;
      checkPageBreak(descHeight);
      doc.text(descLines, margin, y);
      y += descHeight + 2;

      // Applicable pages
      if (schema.applicablePages) {
        doc.setFontSize(7);
        doc.setTextColor(...PRIMARY);
        doc.text(`Applicable to: ${schema.applicablePages}`, margin, y);
        y += 5;
      }

      // JSON-LD code block
      if (schema.jsonLd) {
        checkPageBreak(15);
        renderCodeBlock(schema.jsonLd, y, contentWidth);
      }

      y += 6;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT);
    doc.text('No schema templates generated.', margin, y);
    y += 10;
  }

  // ============================================================
  // SECTION 06 — Implementation Guide
  // ============================================================
  addPage();
  sectionHeading('06', 'Implementation Guide');

  if (premium!.implementationGuide) {
    renderMarkdownText(premium!.implementationGuide, contentWidth);
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT);
    doc.text('No implementation guide available.', margin, y);
    y += 10;
  }

  // ============================================================
  // SECTION 07 — Implementation Tickets
  // ============================================================
  addPage();
  sectionHeading('07', 'Implementation Tickets');

  if (premium!.tickets && premium!.tickets.length > 0) {
    // Overview table
    const ticketOverviewRows = premium!.tickets.map((t) => [
      t.id,
      t.title.length > 40 ? t.title.substring(0, 40) + '...' : t.title,
      t.priority,
      String(t.storyPoints),
      t.category,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['ID', 'Title', 'Priority', 'Points', 'Category']],
      body: ticketOverviewRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [...DARK] },
      headStyles: { fillColor: [...DARK], textColor: [...WHITE] },
      alternateRowStyles: { fillColor: [...SURFACE_LOW] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 70 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const rowIdx = data.row.index;
          const prio = premium!.tickets[rowIdx]?.priority;
          if (prio) {
            data.cell.styles.textColor = getPriorityColor(prio) as unknown as string;
          }
        }
      },
    });
    y = getTableY();

    // Detailed ticket breakdowns
    for (const ticket of premium!.tickets) {
      checkPageBreak(40);

      // Ticket header
      const prioColor = getPriorityColor(ticket.priority);
      doc.setFontSize(7);
      doc.setTextColor(...prioColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${ticket.id}  |  ${ticket.priority}  |  ${ticket.storyPoints} SP  |  ${ticket.category}`, margin, y);
      doc.setFont('helvetica', 'normal');
      y += 5;

      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(ticket.title, margin, y);
      y += 7;

      // Description
      if (ticket.description) {
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        const descLines = doc.splitTextToSize(ticket.description, contentWidth);
        const descHeight = descLines.length * 3.5 + 2;
        checkPageBreak(descHeight);
        doc.text(descLines, margin, y);
        y += descHeight + 2;
      }

      // Acceptance criteria
      if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
        checkPageBreak(10);
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'bold');
        doc.text('Acceptance Criteria:', margin, y);
        doc.setFont('helvetica', 'normal');
        y += 5;

        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        for (const criterion of ticket.acceptanceCriteria) {
          const critLines = doc.splitTextToSize(criterion, contentWidth - 8);
          const critHeight = critLines.length * 3.5 + 1;
          checkPageBreak(critHeight);
          doc.text('\u2022', margin + 2, y);
          doc.text(critLines, margin + 7, y);
          y += critHeight;
        }
        y += 2;
      }

      // Testing instructions
      if (ticket.testingInstructions) {
        checkPageBreak(10);
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.setFont('helvetica', 'bold');
        doc.text('Testing:', margin, y);
        doc.setFont('helvetica', 'normal');
        y += 4;

        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        const testLines = doc.splitTextToSize(ticket.testingInstructions, contentWidth);
        const testHeight = testLines.length * 3.5 + 2;
        checkPageBreak(testHeight);
        doc.text(testLines, margin, y);
        y += testHeight + 2;
      }

      // Dependencies
      if (ticket.dependencies && ticket.dependencies.length > 0) {
        checkPageBreak(8);
        doc.setFontSize(7);
        doc.setTextColor(...LIGHT);
        doc.text(`Dependencies: ${ticket.dependencies.join(', ')}`, margin, y);
        y += 5;
      }

      // Separator line
      y += 2;
      doc.setDrawColor(...OUTLINE);
      doc.setLineWidth(0.15);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT);
    doc.text('No implementation tickets generated.', margin, y);
    y += 10;
  }

  // ============================================================
  // FOOTERS
  // ============================================================
  addFooters(doc, pageWidth, margin);

  return Buffer.from(doc.output('arraybuffer'));
}

// --- Footer helper (applied to all pages after content is done) ---
function addFooters(doc: jsPDF, pageWidth: number, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...LIGHT);
    doc.text('WhatSEO.ai  |  SEO Audit Report  |  Confidential', margin, 290);
    doc.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth - margin, 290, { align: 'right' });
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.line(margin, 287, pageWidth - margin, 287);
  }
}

// --- Helper: split deepDive text by ### headers ---
function splitByHeaders(text: string): { header: string; body: string }[] {
  const sections: { header: string; body: string }[] = [];
  const parts = text.split(/^### /m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const newlineIdx = trimmed.indexOf('\n');
    if (newlineIdx === -1) {
      sections.push({ header: trimmed, body: '' });
    } else {
      sections.push({
        header: trimmed.substring(0, newlineIdx).trim(),
        body: trimmed.substring(newlineIdx + 1).trim(),
      });
    }
  }

  return sections;
}
