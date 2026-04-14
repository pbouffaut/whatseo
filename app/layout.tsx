import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Serif } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://whatseo.ai"),
  title: {
    default: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    template: "%s | WhatSEO.ai",
  },
  description:
    "Professional SEO analysis your team can act on. 80+ checks on your homepage for free, or a full audit across up to 1,000 pages with real Google data, AI Search readiness, and GitHub/Jira ticket export.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    description: "AI-powered SEO analysis across 80+ criteria. Professional reports with prioritized action plans, AI Search readiness, and GitHub/Jira ticket export. No agency needed.",
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
    description: "AI-powered SEO analysis across 80+ criteria. No agency needed.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/logo-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
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
    <html lang="en" className={`${jakarta.variable} ${notoSerif.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
