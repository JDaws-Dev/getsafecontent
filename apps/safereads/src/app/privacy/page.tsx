import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SafeReads collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-brand-navy">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: January 2026</p>

      <div className="mt-8 space-y-8 text-ink-600">
        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            What We Collect
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            When you sign in with Google via Clerk, we receive your name, email
            address, and profile photo. We also store the book searches you
            perform and the AI-generated content reviews associated with those
            books.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            How We Use Your Data
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Your account information is used solely to authenticate you and
            provide a personalized experience (e.g., saved books, wishlists).
            Book metadata — such as title, author, and description — is sent to
            OpenAI&apos;s GPT-4o model to generate content reviews. No personal
            data (your name, email, or children&apos;s information) is sent to
            OpenAI.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            Cookies
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            We use cookies managed by Clerk to maintain your authentication
            session. We do not use advertising or third-party tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            Data Retention
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Your account data is retained as long as your account is active.
            Book reviews are cached permanently since book content metadata is
            static. You may request deletion of your account and associated data
            at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            Third-Party Services
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed">
            <li>
              <strong>Clerk</strong> — authentication and session management
            </li>
            <li>
              <strong>Convex</strong> — database and backend infrastructure
            </li>
            <li>
              <strong>OpenAI</strong> — AI-powered content review (book
              metadata only)
            </li>
            <li>
              <strong>Google Books &amp; Open Library</strong> — book metadata
              lookups
            </li>
            <li>
              <strong>Vercel</strong> — hosting and deployment
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-navy">
            Contact
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            If you have questions about this policy or want to request data
            deletion, email us at{" "}
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="text-accent-700 hover:text-accent-800"
            >
              jeremiah@getsafefamily.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
