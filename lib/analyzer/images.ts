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

  let missingAlt = 0, decorativeAlt = 0, lazyLoaded = 0, webpImages = 0, hasSrcset = 0;
  let missingDimensions = 0, svgCount = 0, brokenSrc = 0;
  let maxSrcsetWidth = 0;

  imgs.each((_, el) => {
    const img = $(el);
    const alt = img.attr('alt');
    const hasAltAttr = img.attr('alt') !== undefined;

    // Alt text: distinguish missing alt attribute from empty alt (decorative)
    if (!hasAltAttr && !img.attr('role')?.includes('presentation')) {
      missingAlt++;
    } else if (hasAltAttr && alt === '') {
      decorativeAlt++;
    }

    if (img.attr('loading') === 'lazy') lazyLoaded++;

    const src = (img.attr('src') || '') + (img.attr('srcset') || '');
    if (/\.webp|\.avif/i.test(src)) webpImages++;
    if (img.attr('srcset')) hasSrcset++;

    // Missing width/height
    if (!img.attr('width') || !img.attr('height')) missingDimensions++;

    // SVG detection
    if (/\.svg/i.test(img.attr('src') || '')) svgCount++;

    // Broken image detection (empty src or src="#")
    const imgSrc = img.attr('src') || '';
    if (imgSrc === '' || imgSrc === '#') brokenSrc++;

    // Srcset width analysis
    const srcset = img.attr('srcset') || '';
    const widthMatches = srcset.match(/(\d+)w/g);
    if (widthMatches) {
      for (const w of widthMatches) {
        const num = parseInt(w.replace('w', ''), 10);
        if (num > maxSrcsetWidth) maxSrcsetWidth = num;
      }
    }
  });

  // --- Check 1: Alt text coverage ---
  const altPct = ((totalImages - missingAlt) / totalImages) * 100;
  checks.push({ name: 'Alt text coverage', status: altPct >= 90 ? 'pass' : altPct >= 70 ? 'warn' : 'fail', message: `${Math.round(altPct)}% of images have alt text (${missingAlt} missing)`, value: Math.round(altPct) });

  // --- Check 2: Lazy loading ---
  checks.push({ name: 'Lazy loading', status: lazyLoaded > 0 ? 'pass' : 'fail', message: `${lazyLoaded}/${totalImages} images use lazy loading`, value: lazyLoaded });

  // --- Check 3: Modern formats ---
  checks.push({ name: 'Modern formats', status: webpImages > 0 ? 'pass' : 'warn', message: webpImages > 0 ? `${webpImages} WebP/AVIF images` : 'No WebP or AVIF images detected' });

  // --- Check 4: Responsive images ---
  checks.push({ name: 'Responsive images', status: hasSrcset > 0 ? 'pass' : 'warn', message: hasSrcset > 0 ? `${hasSrcset} images use srcset` : 'No responsive images (srcset)' });

  // --- Check 5: Hero image loading ---
  const firstImg = imgs.first();
  const firstLazy = firstImg.attr('loading') === 'lazy';
  const firstEager = firstImg.attr('loading') === 'eager' || firstImg.attr('fetchpriority') === 'high';
  checks.push({ name: 'Hero image loading', status: firstEager ? 'pass' : !firstLazy ? 'warn' : 'fail', message: firstEager ? 'Hero image is eagerly loaded' : firstLazy ? 'Hero image is lazy loaded (should be eager)' : 'Hero image has no loading attribute' });

  // --- Check 6: Image count reasonable ---
  checks.push({
    name: 'Image count',
    status: totalImages <= 50 ? 'pass' : totalImages <= 100 ? 'warn' : 'fail',
    message: totalImages <= 50
      ? `${totalImages} images on page (reasonable)`
      : totalImages <= 100
        ? `${totalImages} images on page (heavy — consider reducing)`
        : `${totalImages} images on page (excessive — will hurt performance)`,
    value: totalImages,
  });

  // --- Check 7: Missing width/height (CLS) ---
  const dimPct = ((totalImages - missingDimensions) / totalImages) * 100;
  checks.push({
    name: 'Width/height attributes',
    status: dimPct >= 90 ? 'pass' : dimPct >= 50 ? 'warn' : 'fail',
    message: missingDimensions === 0
      ? 'All images have explicit width and height (prevents CLS)'
      : `${missingDimensions}/${totalImages} images missing width/height attributes (causes CLS)`,
    value: missingDimensions,
  });

  // --- Check 8: SVG usage ---
  checks.push({
    name: 'SVG usage',
    status: svgCount > 0 ? 'pass' : 'warn',
    message: svgCount > 0
      ? `${svgCount} SVG images detected (good for icons/logos)`
      : 'No SVG images detected — consider SVGs for icons and logos',
  });

  // --- Check 9: Image file size signals (srcset width descriptors) ---
  if (hasSrcset > 0) {
    checks.push({
      name: 'Image size signals',
      status: maxSrcsetWidth <= 2000 ? 'pass' : maxSrcsetWidth <= 4000 ? 'warn' : 'fail',
      message: maxSrcsetWidth <= 2000
        ? `Largest srcset width descriptor is ${maxSrcsetWidth}w (reasonable)`
        : maxSrcsetWidth <= 4000
          ? `Largest srcset width descriptor is ${maxSrcsetWidth}w (large — may cause slow loads)`
          : `Largest srcset width descriptor is ${maxSrcsetWidth}w (excessive — will slow mobile devices)`,
      value: maxSrcsetWidth,
    });
  } else {
    checks.push({
      name: 'Image size signals',
      status: 'warn',
      message: 'No srcset with width descriptors found — cannot assess image size optimization',
    });
  }

  // --- Check 10: Decorative images vs missing alt ---
  checks.push({
    name: 'Decorative images',
    status: missingAlt === 0 ? 'pass' : 'warn',
    message: decorativeAlt > 0
      ? `${decorativeAlt} decorative images (alt="") correctly marked, ${missingAlt} images missing alt attribute entirely`
      : missingAlt > 0
        ? `${missingAlt} images missing alt attribute — add alt="" for decorative or descriptive alt for content images`
        : 'All images have alt attributes (none missing)',
  });

  // --- Check 11: Figure/figcaption ---
  const figures = $('figure');
  const figuresWithCaption = $('figure figcaption').length;
  checks.push({
    name: 'Figure/figcaption',
    status: figuresWithCaption > 0 ? 'pass' : figures.length > 0 ? 'warn' : 'warn',
    message: figuresWithCaption > 0
      ? `${figuresWithCaption} images use <figure> with <figcaption> (good for SEO)`
      : figures.length > 0
        ? `${figures.length} <figure> elements found but none have <figcaption> — add captions for SEO`
        : 'No <figure>/<figcaption> elements — consider wrapping content images in <figure> with captions',
  });

  // --- Check 12: Broken image detection ---
  checks.push({
    name: 'Broken images',
    status: brokenSrc === 0 ? 'pass' : 'fail',
    message: brokenSrc === 0
      ? 'No images with empty or placeholder src detected'
      : `${brokenSrc} images have empty src or src="#" (broken images)`,
    value: brokenSrc,
  });

  const score = Math.round(checks.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0), 0) / checks.length * 100);
  return { score, checks, totalImages, missingAlt, lazyLoaded, webpImages };
}
