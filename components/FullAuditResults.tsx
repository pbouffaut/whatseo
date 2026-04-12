'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScoreGauge from './ScoreGauge';
import ScoreBreakdown from './ScoreBreakdown';
import Link from 'next/link';
import { Check, AlertTriangle, FileText, Globe, BarChart3, Code, Zap, Bot, Search } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical SEO',
  content: 'Content Quality',
  onPage: 'On-Page SEO',
  schema: 'Schema Markup',
  performance: 'Performance',
  aiReadiness: 'AI Search Ready',
  images: 'Images',
};

interface FullAuditResultsProps {
  audit: Record<string, unknown>;
  results: Record<string, unknown>;
}

export default function FullAuditResults({ audit, results }: FullAuditResultsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const score = results.score as { overall: number; categories: Record<string, { score: number; weight: number }> };
  const pages = (results.pages || []) as Record<string, unknown>[];
  const recommendations = (results.recommendations || []) as Record<string, unknown>[];
  const googleData = results.googleData as Record<string, unknown> | undefined;
  const gsc = googleData?.gsc as Record<string, unknown> | undefined;
  const ga4 = googleData?.ga4 as Record<string, unknown> | undefined;
  const crux = googleData?.crux as Record<string, unknown> | undefined;
  const psi = googleData?.pageSpeed as Record<string, unknown> | undefined;

  // Aggregate issues across all pages
  const allChecks: { name: string; status: string; message: string }[] = [];
  for (const [cat, data] of Object.entries(results)) {
    if (data && typeof data === 'object' && 'checks' in (data as Record<string, unknown>)) {
      for (const check of ((data as Record<string, unknown>).checks as { name: string; status: string; message: string }[])) {
        allChecks.push(check);
      }
    }
  }
  const issues = allChecks.filter((c) => c.status === 'fail');
  const wins = allChecks.filter((c) => c.status === 'pass');

  const categories = Object.entries(score?.categories || {}).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    score: val.score,
    weight: val.weight,
  }));

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'pages', label: `Pages (${pages.length})`, icon: FileText },
    { key: 'recommendations', label: `Fixes (${recommendations.length})`, icon: AlertTriangle },
    ...(gsc || ga4 ? [{ key: 'google', label: 'Google Data', icon: Search }] : []),
    ...(crux || psi ? [{ key: 'performance', label: 'Performance', icon: Zap }] : []),
  ];

  const impactColors: Record<string, string> = { high: 'text-[#e05555] bg-[#e05555]/10', medium: 'text-[#d4952b] bg-[#d4952b]/10', low: 'text-[#4aab6a] bg-[#4aab6a]/10' };
  const effortColors: Record<string, string> = { low: 'text-[#4aab6a]', medium: 'text-[#d4952b]', high: 'text-[#e05555]' };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-3">Full Audit Complete</p>
        <h1 className="font-serif text-3xl md:text-4xl text-warm-white mb-2">SEO Audit Report</h1>
        <p className="text-warm-gray">{String(audit.url)}</p>
        <p className="text-xs text-warm-gray-light mt-1">
          {Number(results.pagesCrawled)} pages crawled in {Math.round(Number(results.duration || 0) / 1000)}s
          {' · '}{new Date(String(audit.createdAt)).toLocaleDateString()}
        </p>
      </div>

      {/* Score */}
      <div className="flex justify-center mb-6">
        <ScoreGauge score={score?.overall || 0} />
      </div>
      <div className="flex justify-center mb-10">
        <ScoreBreakdown categories={categories} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-gold text-dark'
                : 'bg-warm-white/5 text-warm-gray hover:text-warm-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pages Crawled', value: String(results.pagesCrawled) },
                { label: 'Issues Found', value: String(issues.length) },
                { label: 'Recommendations', value: String(recommendations.length) },
                { label: 'Score', value: `${score?.overall || 0}/100` },
              ].map((stat) => (
                <div key={stat.label} className="bg-dark-card rounded-xl border border-warm-white/8 p-4 text-center">
                  <div className="text-2xl font-bold text-gold">{stat.value}</div>
                  <div className="text-xs text-warm-gray mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Top Issues */}
            {issues.length > 0 && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-[#e05555] mb-4">Top Issues ({issues.length})</h3>
                <ul className="space-y-3">
                  {issues.slice(0, 8).map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#e05555] mt-2 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-warm-white">{c.name}</div>
                        <div className="text-xs text-warm-gray">{c.message}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Patterns Detected */}
            <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
              <h3 className="text-lg font-semibold text-warm-white mb-4">Patterns Detected</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: 'Thin Content Pages', value: (results.thinContentPages as string[])?.length || 0, bad: true },
                  { label: 'Missing Titles', value: (results.missingTitlePages as string[])?.length || 0, bad: true },
                  { label: 'Missing Meta Descriptions', value: (results.missingMetaDescPages as string[])?.length || 0, bad: true },
                  { label: 'Missing Schema', value: (results.missingSchemaPages as string[])?.length || 0, bad: true },
                  { label: 'Duplicate Titles', value: (results.duplicateTitles as unknown[])?.length || 0, bad: true },
                  { label: 'Slow Pages (>2s)', value: (results.slowPages as string[])?.length || 0, bad: true },
                ].map((p) => (
                  <div key={p.label} className="flex justify-between items-center py-2 px-3 rounded-lg bg-warm-white/3">
                    <span className="text-sm text-warm-gray">{p.label}</span>
                    <span className={`text-sm font-bold ${p.value > 0 && p.bad ? 'text-[#e05555]' : 'text-[#4aab6a]'}`}>
                      {p.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Working */}
            {wins.length > 0 && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-[#4aab6a] mb-4">What&apos;s Working ({wins.length})</h3>
                <ul className="space-y-2">
                  {wins.slice(0, 5).map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-[#4aab6a] mt-0.5 shrink-0" />
                      <span className="text-sm text-warm-gray">{c.name}: {c.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* PAGES TAB */}
        {activeTab === 'pages' && (
          <div className="bg-dark-card rounded-xl border border-warm-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-white/8">
                    <th className="text-left text-warm-gray-light font-medium px-4 py-3">URL</th>
                    <th className="text-center text-warm-gray-light font-medium px-3 py-3 w-16">Status</th>
                    <th className="text-center text-warm-gray-light font-medium px-3 py-3 w-20">Speed</th>
                    <th className="text-center text-warm-gray-light font-medium px-3 py-3 w-20">Words</th>
                    <th className="text-center text-warm-gray-light font-medium px-3 py-3 w-20">Schema</th>
                    <th className="text-center text-warm-gray-light font-medium px-3 py-3 w-20">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page, i) => {
                    const onPage = page.onPage as Record<string, unknown> | undefined;
                    const schema = page.schema as Record<string, unknown> | undefined;
                    const content = page.content as Record<string, unknown> | undefined;
                    const pageIssues = [
                      ...((onPage?.checks || []) as { status: string }[]),
                      ...((schema?.checks || []) as { status: string }[]),
                      ...((content?.checks || []) as { status: string }[]),
                    ].filter((c) => c.status === 'fail').length;

                    const urlPath = String(page.url).replace(/^https?:\/\/[^/]+/, '') || '/';

                    return (
                      <tr key={i} className="border-b border-warm-white/5 hover:bg-warm-white/3">
                        <td className="px-4 py-3 text-warm-white truncate max-w-[300px]" title={String(page.url)}>
                          {urlPath}
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={Number(page.statusCode) < 400 ? 'text-[#4aab6a]' : 'text-[#e05555]'}>
                            {String(page.statusCode)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3 text-warm-gray">
                          {Number(page.responseTime)}ms
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={Number(content?.wordCount || 0) < 300 ? 'text-[#e05555]' : 'text-warm-gray'}>
                            {String(content?.wordCount || 0)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          {Number(schema?.jsonLdBlocks || 0) > 0 ? (
                            <Check className="w-4 h-4 text-[#4aab6a] mx-auto" />
                          ) : (
                            <span className="text-[#e05555]">-</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={pageIssues > 0 ? 'text-[#e05555] font-medium' : 'text-[#4aab6a]'}>
                            {pageIssues}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-warm-white font-semibold text-sm">{String(rec.title)}</h3>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${impactColors[String(rec.impact)] || ''}`}>
                      {String(rec.impact)} impact
                    </span>
                    <span className={`text-xs ${effortColors[String(rec.effort)] || ''}`}>
                      {String(rec.effort)} effort
                    </span>
                  </div>
                </div>
                <p className="text-warm-gray text-xs leading-relaxed mb-3">{String(rec.description)}</p>
                {(rec.affectedUrls as string[])?.length > 0 && (
                  <details className="text-xs">
                    <summary className="text-gold cursor-pointer hover:text-gold-light">
                      {(rec.affectedUrls as string[]).length} affected URLs
                    </summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      {(rec.affectedUrls as string[]).slice(0, 10).map((url, j) => (
                        <li key={j} className="text-warm-gray-light truncate">{url}</li>
                      ))}
                      {(rec.affectedUrls as string[]).length > 10 && (
                        <li className="text-warm-gray-light">...and {(rec.affectedUrls as string[]).length - 10} more</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            ))}
            {recommendations.length === 0 && (
              <p className="text-warm-gray text-center py-8">No recommendations — your site looks great!</p>
            )}
          </div>
        )}

        {/* GOOGLE DATA TAB */}
        {activeTab === 'google' && (
          <div className="space-y-6">
            {gsc && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-warm-white mb-1">Search Console (90 days)</h3>
                <p className="text-warm-gray-light text-xs mb-4">
                  {String((gsc as Record<string, unknown>).totalClicks || 0)} clicks · {String((gsc as Record<string, unknown>).totalImpressions || 0)} impressions
                </p>

                <h4 className="text-sm font-medium text-warm-gray mb-2">Top Queries</h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-warm-white/8">
                        <th className="text-left text-warm-gray-light px-3 py-2">Query</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">Clicks</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">Impressions</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">CTR</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((gsc as Record<string, unknown>).topQueries as Record<string, unknown>[])?.slice(0, 15).map((q, i) => (
                        <tr key={i} className="border-b border-warm-white/5">
                          <td className="px-3 py-2 text-warm-white truncate max-w-[200px]">{String(q.query)}</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{String(q.clicks)}</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{String(q.impressions)}</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{(Number(q.ctr) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{Number(q.position).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="text-sm font-medium text-warm-gray mb-2">Top Pages</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-warm-white/8">
                        <th className="text-left text-warm-gray-light px-3 py-2">Page</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">Clicks</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">CTR</th>
                        <th className="text-right text-warm-gray-light px-3 py-2">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((gsc as Record<string, unknown>).topPages as Record<string, unknown>[])?.slice(0, 15).map((p, i) => (
                        <tr key={i} className="border-b border-warm-white/5">
                          <td className="px-3 py-2 text-warm-white truncate max-w-[250px]">{String(p.page).replace(/^https?:\/\/[^/]+/, '')}</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{String(p.clicks)}</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{(Number(p.ctr) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-warm-gray">{Number(p.position).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ga4 && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-warm-white mb-4">Google Analytics (90 days)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gold">{String((ga4 as Record<string, unknown>).organicSessions || 0)}</div>
                    <div className="text-xs text-warm-gray">Organic Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-warm-white">{Number((ga4 as Record<string, unknown>).organicPercentage || 0).toFixed(1)}%</div>
                    <div className="text-xs text-warm-gray">Organic Share</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-warm-white">{Number((ga4 as Record<string, unknown>).engagementRate || 0).toFixed(1)}%</div>
                    <div className="text-xs text-warm-gray">Engagement Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-warm-white">{String((ga4 as Record<string, unknown>).totalSessions || 0)}</div>
                    <div className="text-xs text-warm-gray">Total Sessions</div>
                  </div>
                </div>

                {((ga4 as Record<string, unknown>).topLandingPages as Record<string, unknown>[])?.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-warm-gray mb-2">Top Organic Landing Pages</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-warm-white/8">
                            <th className="text-left text-warm-gray-light px-3 py-2">Page</th>
                            <th className="text-right text-warm-gray-light px-3 py-2">Sessions</th>
                            <th className="text-right text-warm-gray-light px-3 py-2">Users</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((ga4 as Record<string, unknown>).topLandingPages as Record<string, unknown>[])?.slice(0, 10).map((p, i) => (
                            <tr key={i} className="border-b border-warm-white/5">
                              <td className="px-3 py-2 text-warm-white truncate max-w-[250px]">{String(p.page)}</td>
                              <td className="px-3 py-2 text-right text-warm-gray">{String(p.sessions)}</td>
                              <td className="px-3 py-2 text-right text-warm-gray">{String(p.users)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {!gsc && !ga4 && (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-warm-gray-light mx-auto mb-4" />
                <p className="text-warm-gray mb-2">No Google data available for this audit</p>
                <p className="text-warm-gray-light text-xs">Connect Google Search Console and GA4 in Settings to get real traffic data.</p>
                <Link href="/onboarding" className="text-gold text-sm hover:text-gold-light mt-4 inline-block">
                  Connect now →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {psi && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-warm-white mb-4">Lighthouse Scores (Mobile)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Performance', score: Number((psi as Record<string, unknown>).performanceScore || 0) },
                    { label: 'SEO', score: Number((psi as Record<string, unknown>).seoScore || 0) },
                    { label: 'Accessibility', score: Number((psi as Record<string, unknown>).accessibilityScore || 0) },
                    { label: 'Best Practices', score: Number((psi as Record<string, unknown>).bestPracticesScore || 0) },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 bg-warm-white/3 rounded-xl">
                      <div className={`text-2xl font-bold ${item.score >= 90 ? 'text-[#4aab6a]' : item.score >= 50 ? 'text-[#d4952b]' : 'text-[#e05555]'}`}>
                        {item.score}
                      </div>
                      <div className="text-xs text-warm-gray mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {crux && (
              <div className="bg-dark-card rounded-xl border border-warm-white/8 p-6">
                <h3 className="text-lg font-semibold text-warm-white mb-4">Core Web Vitals (Real Users)</h3>
                <div className="space-y-4">
                  {[
                    { label: 'LCP', data: (crux as Record<string, unknown>).lcp as Record<string, unknown> | null, unit: 'ms', target: 2500 },
                    { label: 'INP', data: (crux as Record<string, unknown>).inp as Record<string, unknown> | null, unit: 'ms', target: 200 },
                    { label: 'CLS', data: (crux as Record<string, unknown>).cls as Record<string, unknown> | null, unit: '', target: 0.1 },
                    { label: 'FCP', data: (crux as Record<string, unknown>).fcp as Record<string, unknown> | null, unit: 'ms', target: 1800 },
                    { label: 'TTFB', data: (crux as Record<string, unknown>).ttfb as Record<string, unknown> | null, unit: 'ms', target: 800 },
                  ].map((metric) => {
                    if (!metric.data) return null;
                    const p75 = Number(metric.data.p75 || 0);
                    const good = Number(metric.data.good || 0);
                    const pass = p75 <= metric.target;
                    return (
                      <div key={metric.label} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${pass ? 'bg-[#4aab6a]' : 'bg-[#e05555]'}`} />
                          <span className="text-sm text-warm-white font-medium w-12">{metric.label}</span>
                          <span className="text-sm text-warm-gray">p75: {p75}{metric.unit}</span>
                        </div>
                        <span className="text-xs text-warm-gray">{good}% good</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!psi && !crux && (
              <p className="text-warm-gray text-center py-8">No performance data available for this audit.</p>
            )}
          </div>
        )}

      </motion.div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-12">
        {audit.pdf_url ? (
          <a href={String(audit.pdf_url)} target="_blank" rel="noopener noreferrer"
            className="px-8 py-3.5 bg-gold text-dark rounded-full font-semibold hover:bg-gold-light transition-colors">
            Download PDF Report
          </a>
        ) : (
          <span className="px-8 py-3.5 bg-warm-white/5 text-warm-gray-light rounded-full font-semibold cursor-not-allowed">
            PDF Report (Coming Soon)
          </span>
        )}
        <Link href="/dashboard" className="px-8 py-3.5 bg-warm-white/5 text-warm-gray rounded-full font-semibold hover:bg-warm-white/10 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
