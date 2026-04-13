import * as cheerio from 'cheerio';
import { Check, ContentResult } from './types';

/** Simple syllable count approximation: count vowel groups in a word. */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;
  const matches = w.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  // Silent e at end
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(count, 1);
}

export function analyzeContent(html: string): ContentResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];

  // Keep a copy before stripping for structural checks
  const fullHtml = html;

  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // --- Existing checks ---

  const level = wordCount < 100 ? 'thin' : wordCount < 300 ? 'light' : wordCount < 800 ? 'adequate' : 'thorough';
  checks.push({ name: 'Word count', status: wordCount >= 300 ? 'pass' : wordCount >= 100 ? 'warn' : 'fail', message: `${wordCount} words (${level})`, value: wordCount });

  const h2Count = $('h2').length;
  checks.push({ name: 'Content structure', status: h2Count >= 2 ? 'pass' : h2Count >= 1 ? 'warn' : 'fail', message: `${h2Count} H2 headings for content structure` });

  const hasAuthor = $('[rel="author"], [class*="author"], [itemprop="author"]').length > 0 || /\bby\s+[A-Z][a-z]+/i.test(text);
  checks.push({ name: 'Author attribution', status: hasAuthor ? 'pass' : 'fail', message: hasAuthor ? 'Author/byline detected' : 'No author attribution found' });

  const dateEl = $('time, [datetime], meta[property="article:published_time"]');
  const hasDate = dateEl.length > 0;
  checks.push({ name: 'Publication date', status: hasDate ? 'pass' : 'warn', message: hasDate ? 'Publication date found' : 'No publication date detected' });

  const hasAbout = $('a[href*="/about"], a[href*="/contact"]').length > 0;
  checks.push({ name: 'About/contact link', status: hasAbout ? 'pass' : 'warn', message: hasAbout ? 'About or contact page linked' : 'No about/contact link found' });

  const hasPrivacy = $('a[href*="/privacy"], a[href*="/terms"]').length > 0;
  checks.push({ name: 'Privacy/terms link', status: hasPrivacy ? 'pass' : 'warn', message: hasPrivacy ? 'Privacy/terms page linked' : 'No privacy or terms link found' });

  const hostname = $('base').attr('href') || '';
  const extLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return !href.includes(hostname) && href.startsWith('http');
  }).length;
  checks.push({ name: 'External references', status: extLinks > 0 ? 'pass' : 'warn', message: `${extLinks} external link(s)` });

  // --- New checks ---

  // Content freshness
  let dateStr: string | undefined;
  const metaDate = $('meta[property="article:published_time"]').attr('content');
  const timeEl = $('time[datetime]').first().attr('datetime');
  dateStr = metaDate || timeEl || undefined;
  if (dateStr) {
    const pubDate = new Date(dateStr);
    const now = new Date();
    const monthsAgo = (now.getFullYear() - pubDate.getFullYear()) * 12 + (now.getMonth() - pubDate.getMonth());
    if (!isNaN(pubDate.getTime())) {
      checks.push({
        name: 'Content freshness',
        status: monthsAgo <= 12 ? 'pass' : monthsAgo <= 24 ? 'warn' : 'fail',
        message: monthsAgo <= 12
          ? `Content published ${monthsAgo} month(s) ago (fresh)`
          : monthsAgo <= 24
            ? `Content published ${monthsAgo} months ago (aging)`
            : `Content published ${monthsAgo} months ago (stale, consider updating)`,
      });
    } else {
      checks.push({ name: 'Content freshness', status: 'warn', message: 'Publication date found but could not be parsed' });
    }
  } else {
    checks.push({ name: 'Content freshness', status: 'warn', message: 'No publication date to evaluate freshness' });
  }

  // Reading level (Flesch-Kincaid approximation)
  if (wordCount >= 30) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = Math.max(sentences.length, 1);
    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const avgSentenceLen = wordCount / sentenceCount;
    const avgSyllables = totalSyllables / wordCount;
    // Flesch Reading Ease: 206.835 - 1.015 * ASL - 84.6 * ASW
    const fleschScore = 206.835 - 1.015 * avgSentenceLen - 84.6 * avgSyllables;
    const readability = fleschScore >= 60 ? 'easy' : fleschScore >= 30 ? 'moderate' : 'difficult';
    checks.push({
      name: 'Reading level',
      status: fleschScore >= 60 ? 'pass' : fleschScore >= 30 ? 'warn' : 'fail',
      message: `Flesch score ~${Math.round(fleschScore)} (${readability}); avg sentence ${Math.round(avgSentenceLen)} words, avg ${avgSyllables.toFixed(1)} syllables/word`,
      value: Math.round(fleschScore),
    });
  } else {
    checks.push({ name: 'Reading level', status: 'warn', message: 'Not enough content to estimate readability' });
  }

  // Keyword in first paragraph: check if title words appear in first 100 words
  const pageTitle = $('title').text().trim();
  if (pageTitle && wordCount >= 20) {
    const titleWords = pageTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3);
    const first100 = words.slice(0, 100).join(' ').toLowerCase();
    const matchCount = titleWords.filter((tw) => first100.includes(tw)).length;
    const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 0;
    checks.push({
      name: 'Keyword in first paragraph',
      status: matchRatio >= 0.5 ? 'pass' : matchRatio > 0 ? 'warn' : 'fail',
      message: matchRatio >= 0.5
        ? `${matchCount}/${titleWords.length} title keywords found in first 100 words`
        : matchRatio > 0
          ? `Only ${matchCount}/${titleWords.length} title keywords in first 100 words`
          : 'No title keywords found in first 100 words',
    });
  } else {
    checks.push({ name: 'Keyword in first paragraph', status: 'warn', message: 'Unable to check (title or content too short)' });
  }

  // Internal link density
  const internalLinks = $('a[href^="/"], a[href^="./"], a[href^="../"]').length +
    (hostname ? $(`a[href*="${hostname}"]`).length : 0);
  if (wordCount >= 100) {
    const densityPer1000 = (internalLinks / wordCount) * 1000;
    checks.push({
      name: 'Internal link density',
      status: densityPer1000 >= 3 && densityPer1000 <= 10 ? 'pass' : densityPer1000 > 0 ? 'warn' : 'fail',
      message: `${internalLinks} internal link(s) (~${densityPer1000.toFixed(1)} per 1000 words; ideal: 3-10)`,
    });
  } else {
    checks.push({ name: 'Internal link density', status: 'warn', message: `${internalLinks} internal link(s) (content too short for density calculation)` });
  }

  // List / structured content (good for featured snippets)
  const $full = cheerio.load(fullHtml);
  const ulCount = $full('ul').length;
  const olCount = $full('ol').length;
  const tableCount = $full('table').length;
  const dlCount = $full('dl').length;
  const structuredElements = ulCount + olCount + tableCount + dlCount;
  checks.push({
    name: 'List/structured content',
    status: structuredElements >= 2 ? 'pass' : structuredElements >= 1 ? 'warn' : 'fail',
    message: `${structuredElements} structured element(s): ${ulCount} <ul>, ${olCount} <ol>, ${tableCount} <table>, ${dlCount} <dl>`,
  });

  // Multimedia content
  const videoCount = $full('video').length;
  const audioCount = $full('audio').length;
  const iframeCount = $full('iframe').length;
  const multimediaCount = videoCount + audioCount + iframeCount;
  checks.push({
    name: 'Multimedia content',
    status: multimediaCount > 0 ? 'pass' : 'warn',
    message: multimediaCount > 0
      ? `${multimediaCount} media element(s): ${videoCount} video, ${audioCount} audio, ${iframeCount} iframe`
      : 'No multimedia elements (video, audio, iframe) found',
  });

  // Content uniqueness signal: H1 vs title
  const h1Text = $('h1').first().text().trim();
  if (pageTitle && h1Text) {
    const titleLower = pageTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const h1Lower = h1Text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const identical = titleLower === h1Lower;
    // Check overlap: how many words are shared
    const titleTokens = new Set(titleLower.split(/\s+/));
    const h1Tokens = h1Lower.split(/\s+/);
    const sharedCount = h1Tokens.filter((t) => titleTokens.has(t)).length;
    const overlapRatio = h1Tokens.length > 0 ? sharedCount / h1Tokens.length : 0;
    checks.push({
      name: 'Content uniqueness signal',
      status: identical ? 'warn' : overlapRatio > 0.3 ? 'pass' : 'fail',
      message: identical
        ? 'H1 is identical to <title> (differentiate for better SEO signal)'
        : overlapRatio > 0.3
          ? 'H1 and title are related but not identical (good)'
          : 'H1 and title appear unrelated (should share topic keywords)',
    });
  } else {
    checks.push({ name: 'Content uniqueness signal', status: 'warn', message: 'Missing H1 or title to compare' });
  }

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, wordCount, readabilityLevel: level };
}
