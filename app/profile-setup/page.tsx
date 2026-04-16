'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface FormState {
  first_name: string;
  last_name: string;
  company: string;
  title: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ProfileSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') ?? '/dashboard';

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    company: '',
    title: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Pre-populate from user metadata
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata as Record<string, string | undefined>;
      let firstName = meta.given_name ?? '';
      let lastName = meta.family_name ?? '';

      if (!firstName && !lastName && meta.full_name) {
        const parts = meta.full_name.trim().split(/\s+/);
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }

      setForm((prev) => ({
        ...prev,
        first_name: firstName || prev.first_name,
        last_name: lastName || prev.last_name,
      }));
    });
  }, []);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required.';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch('/api/profile-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          company: form.company.trim() || undefined,
          title: form.title.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setServerError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push(nextUrl);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image src="/logo-icon.svg" width={40} height={40} alt="WhatSEO.ai logo" />
          <span className="text-[#f5f0e8] text-xl font-bold tracking-tight">WhatSEO.ai</span>
        </div>

        {/* Card */}
        <div className="bg-[#232323] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-[#f5f0e8] mb-1">Set up your profile</h1>
          <p className="text-[#a09888] text-sm mb-6">
            Tell us a bit about yourself to personalize your experience.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-xs font-medium text-[#a09888] uppercase tracking-wider mb-1.5">
                First Name <span className="text-[#c9a85c]">*</span>
              </label>
              <input
                id="first_name"
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={handleChange('first_name')}
                className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#a09888] focus:outline-none transition-colors ${
                  errors.first_name
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-[#2e2e2e] focus:border-[#c9a85c]'
                }`}
                placeholder="Jane"
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-400">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-xs font-medium text-[#a09888] uppercase tracking-wider mb-1.5">
                Last Name <span className="text-[#c9a85c]">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                autoComplete="family-name"
                value={form.last_name}
                onChange={handleChange('last_name')}
                className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#a09888] focus:outline-none transition-colors ${
                  errors.last_name
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-[#2e2e2e] focus:border-[#c9a85c]'
                }`}
                placeholder="Smith"
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-red-400">{errors.last_name}</p>
              )}
            </div>

            {/* Company (optional) */}
            <div>
              <label htmlFor="company" className="block text-xs font-medium text-[#a09888] uppercase tracking-wider mb-1.5">
                Company <span className="text-[#a09888] normal-case font-normal">(optional)</span>
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                value={form.company}
                onChange={handleChange('company')}
                className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#a09888] focus:outline-none focus:border-[#c9a85c] transition-colors"
                placeholder="Acme Corp"
              />
            </div>

            {/* Title (optional) */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-[#a09888] uppercase tracking-wider mb-1.5">
                Job Title <span className="text-[#a09888] normal-case font-normal">(optional)</span>
              </label>
              <input
                id="title"
                type="text"
                autoComplete="organization-title"
                value={form.title}
                onChange={handleChange('title')}
                className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#a09888] focus:outline-none focus:border-[#c9a85c] transition-colors"
                placeholder="Head of Marketing"
              />
            </div>

            {serverError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-2.5">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-[#c9a85c] hover:bg-[#d4b46a] text-[#1a1a1a] font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Spinner />}
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </form>

          {/* Data disclaimer */}
          <p className="mt-6 text-xs text-[#a09888] text-center leading-relaxed">
            Your information is used only to personalize your WhatSEO.ai experience.
            We never sell or share your data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense>
      <ProfileSetupForm />
    </Suspense>
  );
}
