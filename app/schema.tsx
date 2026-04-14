export default function JsonLdSchema() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WhatSEO.ai",
    url: "https://whatseo.ai",
    logo: "https://whatseo.ai/og-image.png",
    description: "AI-powered SEO analysis delivering professional-grade audits across 80+ criteria in minutes.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "hello@whatseo.ai",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WhatSEO.ai",
    url: "https://whatseo.ai",
    description: "AI-powered SEO analysis across 80+ criteria.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://whatseo.ai/analyze?url={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://whatseo.ai",
      },
    ],
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI SEO Audit",
    provider: { "@type": "Organization", name: "WhatSEO.ai" },
    description: "Comprehensive AI-powered SEO analysis across 80+ criteria with professional PDF report and prioritized action plan.",
    serviceType: "SEO Audit",
    offers: [
      {
        "@type": "Offer",
        name: "Free Scan",
        price: "0",
        priceCurrency: "USD",
        description: "Homepage analysis across 80+ checks",
      },
      {
        "@type": "Offer",
        name: "Professional Audit",
        price: "499",
        priceCurrency: "USD",
        description: "Full site audit across up to 1,000 pages with Google data integration, AI Search readiness, and GitHub/Jira ticket export",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
