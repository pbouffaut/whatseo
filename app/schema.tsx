export default function JsonLdSchema() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WhatSEO.ai",
    url: "https://whatseo.vercel.app",
    logo: "https://whatseo.vercel.app/og-image.png",
    description: "AI-powered SEO analysis delivering professional-grade audits across 47 criteria in minutes.",
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
    url: "https://whatseo.vercel.app",
    description: "AI-powered SEO analysis across 47 criteria.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://whatseo.vercel.app/analyze?url={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI SEO Audit",
    provider: { "@type": "Organization", name: "WhatSEO.ai" },
    description: "Comprehensive AI-powered SEO analysis across 47 criteria with professional PDF report and prioritized action plan.",
    serviceType: "SEO Audit",
    offers: [
      {
        "@type": "Offer",
        name: "Free Scan",
        price: "0",
        priceCurrency: "USD",
        description: "Homepage analysis across 47 checks",
      },
      {
        "@type": "Offer",
        name: "Professional Audit",
        price: "499",
        priceCurrency: "USD",
        description: "Full site audit across up to 500 pages with Google data integration",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(service).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
