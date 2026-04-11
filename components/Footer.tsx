export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-500">
          <span className="font-bold text-white">What<span className="text-gold">SEO</span>.ai</span>
          <span className="ml-3">AI-Powered SEO Analysis</span>
        </div>
        <div className="text-sm text-gray-600">
          &copy; 2026 WhatSEO.ai. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
