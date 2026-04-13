import * as cheerio from 'cheerio';
import { Check, ImageResult } from './types';

export function analyzeImages(html: string): ImageResult {
  const $ = cheerio.load(html);
  const checks: Check[] = [];
  const imgs = $('img');
  const totalImages = imgs.length;

  if (totalImages === 0) {
    return { score: 80, checks: [{ name: 'Images', status: 'pass', message: 'No <img> tags on page — content is text/SVG-based (no optimization needed)' }], totalImages: 0, missingAlt: 0, lazyLoaded: 0, webpImages: 0 };
  }

  let missingAlt = 0, lazyLoaded = 0, webpImages = 0, hasSrcset = 0;
  imgs.each((_, el) => {
    const img = $(el);
    if (!img.attr('alt') && !img.attr('role')?.includes('presentation')) missingAlt++;
    if (img.attr('loading') === 'lazy') lazyLoaded++;
    const src = (img.attr('src') || '') + (img.attr('srcset') || '');
    if (/\.webp|\.avif/i.test(src)) webpImages++;
    if (img.attr('srcset')) hasSrcset++;
  });

  const altPct = ((totalImages - missingAlt) / totalImages) * 100;
  checks.push({ name: 'Alt text coverage', status: altPct >= 90 ? 'pass' : altPct >= 70 ? 'warn' : 'fail', message: `${Math.round(altPct)}% of images have alt text (${missingAlt} missing)`, value: Math.round(altPct) });
  checks.push({ name: 'Lazy loading', status: lazyLoaded > 0 ? 'pass' : 'fail', message: `${lazyLoaded}/${totalImages} images use lazy loading`, value: lazyLoaded });
  checks.push({ name: 'Modern formats', status: webpImages > 0 ? 'pass' : 'warn', message: webpImages > 0 ? `${webpImages} WebP/AVIF images` : 'No WebP or AVIF images detected' });
  checks.push({ name: 'Responsive images', status: hasSrcset > 0 ? 'pass' : 'warn', message: hasSrcset > 0 ? `${hasSrcset} images use srcset` : 'No responsive images (srcset)' });

  const firstImg = imgs.first();
  const firstLazy = firstImg.attr('loading') === 'lazy';
  const firstEager = firstImg.attr('loading') === 'eager' || firstImg.attr('fetchpriority') === 'high';
  checks.push({ name: 'Hero image loading', status: firstEager ? 'pass' : !firstLazy ? 'warn' : 'fail', message: firstEager ? 'Hero image is eagerly loaded' : firstLazy ? 'Hero image is lazy loaded (should be eager)' : 'Hero image has no loading attribute' });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, totalImages, missingAlt, lazyLoaded, webpImages };
}
