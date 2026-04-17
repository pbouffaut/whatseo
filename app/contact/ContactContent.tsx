'use client';

import { motion } from 'framer-motion';
import { Mail, Clock, MessageSquare, Building2, HelpCircle, Smile, CheckCircle } from 'lucide-react';
import { useState, FormEvent } from 'react';

const reasons = [
  { icon: HelpCircle, text: 'Technical questions about your report' },
  { icon: Building2, text: 'Agency or volume pricing inquiries' },
  { icon: Smile, text: 'General feedback or feature requests' },
];

const subjectOptions = [
  { value: '', label: 'Select a subject…' },
  { value: 'report-question', label: 'Question about my report' },
  { value: 'agency-pricing', label: 'Agency/volume pricing' },
  { value: 'technical-issue', label: 'Technical issue' },
  { value: 'general-feedback', label: 'General feedback' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function ContactContent() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!form.subject) errs.subject = 'Please select a subject.';
    if (!form.message.trim()) errs.message = 'Message is required.';
    else if (form.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Server error');
      setSuccess(true);
    } catch {
      setServerError('Something went wrong. Please try again or email us directly at hello@whatseo.ai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const inputClass = (field: string) =>
    `w-full bg-surface-low border rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-light text-sm focus:outline-none focus:ring-2 transition-shadow ${
      errors[field]
        ? 'border-error focus:ring-error/30'
        : 'border-outline/40 focus:ring-primary/30 focus:border-primary/50'
    }`;

  return (
    <>
      {/* Hero — editorial photography */}
      <section className="relative min-h-[55vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1920&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1108]/90 via-[#1a1108]/72 to-[#1a1108]/40" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-28 pb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#c9a85c] text-xs uppercase tracking-[0.2em] font-semibold mb-6"
          >
            Contact Us
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#f5f0e8] leading-[1.08] mb-6 tracking-tight"
          >
            Let&apos;s Refine Your
            <br />
            <span className="italic text-[#c9a85c]">Digital Footprint.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-[#c8bfb0] max-w-xl leading-relaxed"
          >
            We&apos;re a small team and we actually read every message.
            No support tickets, no automated first responses.
          </motion.p>
        </div>
      </section>

      {/* 2-column layout */}
      <section className="bg-surface-low py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.6fr] gap-12 items-start">

          {/* Left: contact info */}
          <motion.div {...fadeUp}>
            <div className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-8 sticky top-28">
              <h2 className="font-serif text-2xl text-on-surface mb-6 tracking-tight">Contact Info</h2>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-on-surface-light text-xs uppercase tracking-wider font-semibold mb-1">Email</p>
                  <a
                    href="mailto:hello@whatseo.ai"
                    className="text-on-surface font-medium hover:text-primary transition-colors"
                  >
                    hello@whatseo.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-on-surface-light text-xs uppercase tracking-wider font-semibold mb-1">Response Time</p>
                  <p className="text-on-surface font-medium">Within 1 business day</p>
                </div>
              </div>

              <div className="border-t border-outline/30 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-secondary" strokeWidth={1.5} />
                  <p className="text-secondary text-xs uppercase tracking-wider font-semibold">Good reasons to write</p>
                </div>
                <ul className="space-y-3">
                  {reasons.map((r) => (
                    <li key={r.text} className="flex items-center gap-3 text-sm text-on-surface-muted">
                      <r.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                      {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            {success ? (
              <div className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl text-on-surface mb-3">Message Sent!</h2>
                <p className="text-on-surface-muted leading-relaxed">
                  We&apos;ll be in touch within 1 business day. In the meantime, feel free to run
                  a free scan at{' '}
                  <a href="/#audit-form" className="text-primary hover:underline">whatseo.ai</a>.
                </p>
              </div>
            ) : (
              <div className="bg-surface-white rounded-[1.5rem] shadow-ambient border border-outline/30 p-8">
                <h2 className="font-serif text-2xl text-on-surface mb-6 tracking-tight">Send a Message</h2>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-on-surface mb-1.5">
                      Name <span className="text-error">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                    />
                    {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-1.5">
                      Email <span className="text-error">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="jane@company.com"
                      value={form.email}
                      onChange={handleChange}
                      className={inputClass('email')}
                    />
                    {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-on-surface mb-1.5">
                      Subject <span className="text-error">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className={inputClass('subject') + ' cursor-pointer'}
                    >
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.subject && <p className="text-error text-xs mt-1">{errors.subject}</p>}
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-on-surface mb-1.5">
                      Message <span className="text-error">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      placeholder="Tell us what you need…"
                      value={form.message}
                      onChange={handleChange}
                      className={inputClass('message') + ' resize-none'}
                    />
                    {errors.message && <p className="text-error text-xs mt-1">{errors.message}</p>}
                  </div>

                  {serverError && (
                    <p className="text-error text-sm bg-error-light rounded-xl px-4 py-3">{serverError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-cta text-on-primary rounded-full px-8 py-3.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </>
  );
}
