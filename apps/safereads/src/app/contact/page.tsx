import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the SafeReads team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-brand-navy">Contact Us</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-600">
        Have a question, feedback, or suggestion? We&apos;d love to hear from
        you.
      </p>

      <div className="mt-8 rounded-xl border border-brand-cream-2 bg-white p-6">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-accent-600" />
          <h2 className="font-display text-lg font-bold text-brand-navy">Email</h2>
        </div>
        <p className="mt-2 text-sm text-ink-500">
          The fastest way to reach us. We aim to respond within a few days.
        </p>
        <a
          href="mailto:jeremiah@getsafefamily.com"
          className="mt-3 inline-block text-sm font-medium text-accent-700 transition-colors hover:text-accent-800"
        >
          jeremiah@getsafefamily.com
        </a>
      </div>

      <div className="mt-6 text-sm text-ink-400">
        <p>
          Whether it&apos;s a bug report, feature request, or just a kind word
          — we read every message.
        </p>
      </div>
    </div>
  );
}
