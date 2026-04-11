import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WhatSEO.ai — AI SEO Audit in 10 Minutes",
  description:
    "Get an instant, AI-powered SEO audit with scores across 47 criteria. Professional PDF report delivered in minutes. No agency needed.",
  openGraph: {
    title: "WhatSEO.ai — AI SEO Audit in 10 Minutes",
    description: "AI-powered SEO analysis across 47 criteria. No agency needed.",
    url: "https://whatseo.ai",
    siteName: "WhatSEO.ai",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
