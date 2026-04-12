import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-dm-serif" });

export const metadata: Metadata = {
  title: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
  description:
    "Professional SEO analysis your team can act on. 47 checks on your homepage for free, or a full audit across up to 500 pages with real Google data.",
  openGraph: {
    title: "WhatSEO.ai — Expert-Level SEO Insights in Minutes",
    description: "Professional SEO analysis your team can act on. No agency needed.",
    url: "https://whatseo.ai",
    siteName: "WhatSEO.ai",
    type: "website",
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
