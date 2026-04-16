'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { UserRow } from '@/lib/admin/types';

interface CustomersResponse {
  users: UserRow[];
  total: number;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[#a09888]">—</span>;
  const colors: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400',
    canceled: 'bg-[#2e2e2e] text-[#a09888]',
    past_due: 'bg-red-900/40 text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] ?? 'bg-[#2e2e2e] text-[#a09888]'
      }`}
    >
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-[#c9a85c]" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.set('search', debouncedSearch);

    fetch(`/api/admin/customers?${params.toString()}`)
      .then((r) => r.json())
      .then((d: CustomersResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8]">Customers</h1>
          {data && (
            <p className="text-[#a09888] text-sm mt-1">
              {data.total.toLocaleString()} total users
            </p>
          )}
        </div>
        {/* Search */}
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#232323] border border-[#2e2e2e] rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#a09888] focus:outline-none focus:border-[#c9a85c] transition-colors"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner />
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#232323] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e] text-[#a09888] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Website</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Credits</th>
                <th className="text-left px-4 py-3 font-medium">Audits</th>
                <th className="text-left px-4 py-3 font-medium">Last Score</th>
                <th className="text-left px-4 py-3 font-medium">Last Audit</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Spinner />
                      <span className="text-[#a09888]">Loading customers…</span>
                    </div>
                  </td>
                </tr>
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#a09888]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#f5f0e8] max-w-[200px] truncate">
                      <span title={user.email}>{user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-[#a09888] max-w-[160px] truncate">
                      {user.website_url ? (
                        <span title={user.website_url}>{user.website_url}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.plan ? (
                        <div>
                          <span className="text-[#f5f0e8] text-xs">{user.plan}</span>
                          <div className="mt-0.5">
                            <StatusBadge status={user.subscription_status} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#a09888]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.credits_available > 0 ? (
                        <span className="text-green-400 font-medium">
                          {user.credits_available}
                        </span>
                      ) : (
                        <span className="text-[#a09888]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#f5f0e8]">{user.audits_total}</td>
                    <td className="px-4 py-3">
                      {user.last_score != null ? (
                        <span
                          className={`font-bold ${
                            user.last_score >= 70
                              ? 'text-green-400'
                              : user.last_score >= 40
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {user.last_score}
                        </span>
                      ) : (
                        <span className="text-[#a09888]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#a09888] whitespace-nowrap">
                      {user.last_audit_date
                        ? new Date(user.last_audit_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${user.id}`}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="border-t border-[#2e2e2e] px-4 py-3 flex items-center justify-between">
            <span className="text-[#a09888] text-xs">
              Page {page} of {totalPages} &bull;{' '}
              {Math.min((page - 1) * PAGE_SIZE + 1, data.total)}–
              {Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1 rounded-lg text-xs text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 rounded-lg text-xs text-[#a09888] hover:text-[#f5f0e8] hover:bg-[#2a2a2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
