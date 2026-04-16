'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { UserRow } from '@/lib/admin/types';

interface CustomersResponse {
  users: UserRow[];
  total: number;
}

type StatusFilter = 'all' | 'active' | 'trial' | 'new';

function userStatus(user: UserRow): 'active' | 'trial' | 'new' {
  if (user.subscription_status === 'active') return 'active';
  if (user.free_audits > 0 || user.paid_audits > 0) return 'trial';
  return 'new';
}

function StatusBadge({ user }: { user: UserRow }) {
  const status = userStatus(user);
  const config = {
    active: { label: 'Active', cls: 'bg-green-900/40 text-green-400' },
    trial: { label: 'Trial', cls: 'bg-blue-900/40 text-blue-400' },
    new: { label: 'New', cls: 'bg-[#2e2e2e] text-[#a09888]' },
  }[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function AvatarCircle({ user }: { user: UserRow }) {
  const initials =
    user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : (user.email[0] ?? '?').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[#c9a85c]/20 text-[#c9a85c] flex items-center justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const filteredUsers = (data?.users ?? []).filter((u) => {
    if (statusFilter === 'all') return true;
    return userStatus(u) === statusFilter;
  });

  const activeCount = (data?.users ?? []).filter((u) => userStatus(u) === 'active').length;
  const trialCount = (data?.users ?? []).filter((u) => userStatus(u) === 'trial').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8]">Customers</h1>
          {data && (
            <p className="text-[#a09888] text-sm mt-1">
              {data.total.toLocaleString()} customers &bull;{' '}
              {activeCount} active subscription{activeCount !== 1 ? 's' : ''} &bull;{' '}
              {trialCount} trial user{trialCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-[#232323] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#c9a85c] transition-colors cursor-pointer"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="new">New</option>
          </select>
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
      </div>

      <div className="bg-[#232323] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2e2e] text-[#a09888] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Company / Title</th>
                <th className="text-left px-4 py-3 font-medium">Website</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-right px-4 py-3 font-medium">Free</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-left px-4 py-3 font-medium">Last Login</th>
                <th className="text-left px-4 py-3 font-medium">Signed Up</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Spinner />
                      <span className="text-[#a09888]">Loading customers…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#a09888]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const hasName = user.first_name || user.last_name;
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
                  const companyTitle = [user.company, user.title].filter(Boolean).join(' · ');

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-[#2e2e2e] hover:bg-[#2a2a2a] transition-colors"
                    >
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <AvatarCircle user={user} />
                          <div className="min-w-0">
                            {hasName && (
                              <p className="text-[#f5f0e8] text-sm font-medium truncate">{fullName}</p>
                            )}
                            <p className="text-[#a09888] text-xs truncate max-w-[180px]" title={user.email}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Company / Title */}
                      <td className="px-4 py-3 text-[#a09888] text-sm">
                        {companyTitle || '—'}
                      </td>
                      {/* Website */}
                      <td className="px-4 py-3 text-[#a09888] max-w-[140px] truncate text-sm">
                        {user.website_url ? (
                          <span title={user.website_url}>{user.website_url}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge user={user} />
                      </td>
                      {/* Plan */}
                      <td className="px-4 py-3 text-[#f5f0e8] text-sm capitalize">
                        {user.plan ?? 'Free'}
                      </td>
                      {/* Free Audits */}
                      <td className="px-4 py-3 text-right text-[#a09888] text-sm">
                        {user.free_audits}
                      </td>
                      {/* Paid Audits */}
                      <td className="px-4 py-3 text-right text-[#a09888] text-sm">
                        {user.paid_audits}
                      </td>
                      {/* Last Login */}
                      <td className="px-4 py-3 text-[#a09888] text-sm whitespace-nowrap">
                        {relativeTime(user.last_sign_in_at)}
                      </td>
                      {/* Signed Up */}
                      <td className="px-4 py-3 text-[#a09888] text-sm whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${user.id}`}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-[#c9a85c]/10 text-[#c9a85c] hover:bg-[#c9a85c]/20 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
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
