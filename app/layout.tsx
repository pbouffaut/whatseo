import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-dm-serif" });

export const metadata: Metadata = {
  metadataBase: new URL("https://whatseo.ai"),
  title: {
    default: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    template: "%s | WhatSEO.ai",
  },
  description:
    "Professional SEO analysis your team can act on. 47 checks on your homepage for free, or a full audit across up to 500 pages with real Google data.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    description: "AI-powered SEO analysis across 47 criteria. Professional reports with prioritized action plans. No agency needed.",
    url: "https://whatseo.ai",
    siteName: "WhatSEO.ai",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WhatSEO.ai — AI-Powered SEO Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    description: "AI-powered SEO analysis across 47 criteria. No agency needed.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
