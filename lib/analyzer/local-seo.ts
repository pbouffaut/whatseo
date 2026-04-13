import { Check } from './types';

export interface LocalSeoResult {
  score: number;
  checks: Check[];
  napDetected: boolean;
  locationPageCount: number;
  hasLocalSchema: boolean;
}

interface PageInput {
  url: string;
  onPage: { title: string | null };
  schema: { schemasFound: string[]; jsonLdBlocks: number };
  content: { wordCount: number };
}

function check(name: string, pass: boolean, msg: string, warnIf?: boolean): Check {
  return { name, status: warnIf ? 'warn' : pass ? 'pass' : 'fail', message: msg };
}

const LOCAL_SCHEMA_TYPES = [
  'LocalBusiness',
  'Place',
  'CoworkingSpace',
  'Store',
  'Restaurant',
  'Hotel',
  'HealthAndBeautyBusiness',
  'FinancialService',
  'RealEstateAgent',
  'LodgingBusiness',
  'FoodEstablishment',
  'EntertainmentBusiness',
  'SportActivityLocation',
  'MedicalBusiness',
  'LegalService',
  'AutomotiveBusiness',
  'HomeAndConstructionBusiness',
  'ProfessionalService',
  'GasStation',
  'ShoppingCenter',
  'DaySpa',
  'Dentist',
  'Pharmacy',
  'GolfCourse',
  'Library',
  'BarOrPub',
  'CafeOrCoffeeShop',
];

const LOCATION_PATH_PATTERNS = [
  /\/locations?\//i,
  /\/stores?\//i,
  /\/offices?\//i,
  /\/branch(es)?\//i,
];

export function analyzeLocalSeo(
  html: string,
  url: string,
  pages: PageInput[],
): LocalSeoResult {
  const checks: Check[] = [];
  const htmlLower = html.toLowerCase();

  // --- LocalBusiness / Place schema ---
  const allSchemas = pages.flatMap((p) => p.schema.schemasFound);
  const foundLocalSchemas = allSchemas.filter((s) =>
    LOCAL_SCHEMA_TYPES.some(
      (t) => s.toLowerCase() === t.toLowerCase() || s.toLowerCase().includes(t.toLowerCase()),
    ),
  );
  const hasLocalSchema = foundLocalSchemas.length > 0;
  const uniqueLocalSchemas = Array.from(new Set(foundLocalSchemas));

  checks.push(
    check(
      'LocalBusiness schema',
      hasLocalSchema,
      hasLocalSchema
        ? `Local schema found: ${uniqueLocalSchemas.join(', ')}`
        : 'No LocalBusiness, Place, or related schema detected on any page',
    ),
  );

  // --- NAP detection ---
  // Check for tel: links
  const telLinks = html.match(/href=["']tel:[^"']+["']/gi) || [];
  const hasTelLinks = telLinks.length > 0;

  // Check for PostalAddress schema (microdata or JSON-LD)
  const hasPostalAddressMicrodata =
    /itemtype=["'][^"']*PostalAddress["']/i.test(html);
  const hasPostalAddressJsonLd = /["']@type["']\s*:\s*["']PostalAddress["']/i.test(html);
  const hasPostalAddress = hasPostalAddressMicrodata || hasPostalAddressJsonLd;

  // Check for address-like patterns (street number + street name patterns)
  const addressPattern = /\d{1,5}\s+[A-Z][a-zA-Z]+\s+(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place)\b/;
  const hasAddressPattern = addressPattern.test(html);

  const napDetected = hasTelLinks && (hasPostalAddress || hasAddressPattern);

  if (hasTelLinks) {
    checks.push(
      check('Phone number (tel: link)', true, `${telLinks.length} tel: link(s) found`),
    );
  } else {
    checks.push(check('Phone number (tel: link)', false, 'No tel: links found on the page'));
  }

  if (hasPostalAddress) {
    checks.push(
      check(
        'Structured address (PostalAddress)',
        true,
        hasPostalAddressJsonLd
          ? 'PostalAddress found in JSON-LD'
          : 'PostalAddress found via microdata',
      ),
    );
  } else if (hasAddressPattern) {
    checks.push(
      check(
        'Structured address (PostalAddress)',
        false,
        'Address text detected but no structured PostalAddress markup',
        true,
      ),
    );
  } else {
    checks.push(
      check('Structured address (PostalAddress)', false, 'No address information detected'),
    );
  }

  checks.push(
    check(
      'NAP consistency signals',
      napDetected,
      napDetected
        ? 'Name, Address, Phone data detected with structured markup'
        : 'Incomplete NAP data — ensure name, address, and phone are present with structured markup',
      !napDetected && (hasTelLinks || hasPostalAddress || hasAddressPattern),
    ),
  );

  // --- Location page detection ---
  const locationPages = pages.filter((p) =>
    LOCATION_PATH_PATTERNS.some((pattern) => pattern.test(p.url)),
  );
  const locationPageCount = locationPages.length;

  checks.push(
    check(
      'Location pages',
      locationPageCount > 0,
      locationPageCount > 0
        ? `${locationPageCount} location page(s) detected (e.g. /location/, /store/, /office/)`
        : 'No dedicated location pages found — consider creating /locations/ pages for each branch or area',
    ),
  );

  // --- Location page quality (word count) ---
  if (locationPageCount > 0) {
    const avgWordCount = Math.round(
      locationPages.reduce((sum, p) => sum + p.content.wordCount, 0) / locationPageCount,
    );
    const isGood = avgWordCount >= 500;
    const isThin = avgWordCount < 300;

    checks.push(
      check(
        'Location page quality',
        isGood,
        isGood
          ? `Avg word count on location pages: ${avgWordCount} (good depth)`
          : `Avg word count on location pages: ${avgWordCount}${isThin ? ' — thin content, aim for 500+ words' : ' — could be richer, aim for 500+ words'}`,
        !isGood && !isThin,
      ),
    );
  }

  // --- GBP signals (Google Maps links/embeds) ---
  const hasGoogleMapsLink =
    /href=["'][^"']*google\.com\/maps/i.test(html) ||
    /href=["'][^"']*maps\.google\.com/i.test(html);
  const hasGoogleMapsEmbed =
    /src=["'][^"']*google\.com\/maps/i.test(html) ||
    /src=["'][^"']*maps\.googleapis\.com/i.test(html);
  const hasGbpSignals = hasGoogleMapsLink || hasGoogleMapsEmbed;

  checks.push(
    check(
      'Google Maps / GBP signals',
      hasGbpSignals,
      hasGbpSignals
        ? `${hasGoogleMapsEmbed ? 'Embedded Google Map found' : 'Google Maps link found'} — good local signal`
        : 'No Google Maps embed or link found — consider adding a map to reinforce local presence',
    ),
  );

  // --- Review signals ---
  const hasReviewSchema =
    /["']@type["']\s*:\s*["']Review["']/i.test(html) ||
    /["']@type["']\s*:\s*["']AggregateRating["']/i.test(html) ||
    /itemtype=["'][^"']*Review["']/i.test(html) ||
    /itemtype=["'][^"']*AggregateRating["']/i.test(html);
  const hasStarRatings = /class=["'][^"']*(star|rating|review)[^"']*["']/i.test(html);
  const hasTestimonialContent =
    /class=["'][^"']*(testimonial|review|feedback)[^"']*["']/i.test(html);
  const hasReviewSignals = hasReviewSchema || hasStarRatings || hasTestimonialContent;

  checks.push(
    check(
      'Review / testimonial signals',
      hasReviewSignals,
      hasReviewSignals
        ? hasReviewSchema
          ? 'Review or AggregateRating schema found — eligible for star snippets'
          : 'Review-related content found but no Review schema markup'
        : 'No review or testimonial signals detected — reviews boost local trust',
      hasReviewSignals && !hasReviewSchema,
    ),
  );

  // --- Geo meta tags ---
  const hasGeoPosition = /meta\s+[^>]*name=["']geo\.position["']/i.test(html);
  const hasGeoPlacename = /meta\s+[^>]*name=["']geo\.placename["']/i.test(html);
  const hasIcbm = /meta\s+[^>]*name=["']ICBM["']/i.test(html);
  const hasGeoMeta = hasGeoPosition || hasGeoPlacename || hasIcbm;

  const geoTags: string[] = [];
  if (hasGeoPosition) geoTags.push('geo.position');
  if (hasGeoPlacename) geoTags.push('geo.placename');
  if (hasIcbm) geoTags.push('ICBM');

  checks.push(
    check(
      'Geo meta tags',
      hasGeoMeta,
      hasGeoMeta
        ? `Geo meta tags found: ${geoTags.join(', ')}`
        : 'No geo meta tags (geo.position, geo.placename, ICBM) — optional but helpful for local signals',
      false,
    ),
  );

  // --- Contact page ---
  const hasContactPage = pages.some((p) => /\/contact/i.test(p.url));

  checks.push(
    check(
      'Contact page',
      hasContactPage,
      hasContactPage
        ? 'Contact page detected — good for local SEO and user trust'
        : 'No /contact page found — a dedicated contact page improves local discoverability',
    ),
  );

  // --- Opening hours ---
  const hasOpeningHoursSchema =
    /["']openingHours["']/i.test(html) ||
    /["']openingHoursSpecification["']/i.test(html);
  const hasTimeElements = /<time[^>]*>/i.test(html) && /hours|schedule|open/i.test(htmlLower);
  const hasOpeningHoursContent =
    /class=["'][^"']*(hours|opening|schedule)[^"']*["']/i.test(html);
  const hasOpeningHours =
    hasOpeningHoursSchema || hasTimeElements || hasOpeningHoursContent;

  checks.push(
    check(
      'Opening hours',
      hasOpeningHours,
      hasOpeningHours
        ? hasOpeningHoursSchema
          ? 'Opening hours found in structured data — eligible for rich results'
          : 'Opening hours content found but not in structured data — add openingHours to schema'
        : 'No opening hours information detected — important for local businesses',
      hasOpeningHours && !hasOpeningHoursSchema,
    ),
  );

  // --- Score ---
  const score = Math.round(
    (checks.reduce(
      (s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.3 : 0),
      0,
    ) /
      checks.length) *
      100,
  );

  return {
    score,
    checks,
    napDetected,
    locationPageCount,
    hasLocalSchema,
  };
}
