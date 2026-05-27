import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The simple terms for using SafeSpark.',
  alternates: { canonical: '/terms' },
};

const EFFECTIVE = 'May 27, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-12 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-6 text-slate-700">
        <header className="space-y-2">
          <Link href="/" className="text-xs font-bold uppercase tracking-widest text-violet-500 hover:text-violet-700">
            ← SafeSpark
          </Link>
          <h1 className="text-4xl font-black text-slate-900">Terms of Service</h1>
          <p className="text-sm font-semibold text-slate-500">Effective {EFFECTIVE}</p>
        </header>

        <p>
          By using SafeSpark you agree to these terms. They&apos;re short on purpose.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Who can use this</h2>
        <p>
          The <strong>account holder must be 18 or older</strong>. Kids 10-13 use the product under their
          parent&apos;s account by entering a family code. Kids under 10 may use it with a parent sitting next
          to them, but the parent stays responsible.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">What kids can build</h2>
        <p>
          Anything kid-appropriate. SafeSpark proactively redirects unsafe asks (violence, gore, sexual content,
          private-data collection, gambling, drug references, age manipulation in image restyles) to safer
          alternatives. You agree not to deliberately work around these safeguards.
        </p>
        <p>
          Projects are the kid&apos;s creative work. We don&apos;t claim ownership of what your kid makes. You
          give us permission to store and display the project so the product works (rendering the preview,
          showing it in the gallery, serving share links you create).
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">What you can&apos;t do</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Don&apos;t use SafeSpark to harass, defame, or impersonate anyone.</li>
          <li>Don&apos;t try to extract other people&apos;s personal data.</li>
          <li>Don&apos;t use it to generate violent, sexual, or illegal content.</li>
          <li>Don&apos;t resell or rebrand it. (If you want to license SafeSpark for a school or program, email us.)</li>
          <li>Don&apos;t share your family code publicly.</li>
        </ul>
        <p>
          We may suspend accounts that abuse the platform.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">AI output disclaimer</h2>
        <p>
          The AI (Spark) generates outputs based on what the kid asks. Outputs can be imperfect, factually
          wrong, or unexpected. Don&apos;t rely on Spark&apos;s output for medical, legal, financial, or
          safety-critical decisions. The kid is the author of what they decide to keep, share, or print.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Pricing</h2>
        <p>
          SafeSpark is free during early access. If we add paid tiers, we&apos;ll announce it before charging,
          you&apos;ll see the price clearly, and continued use after a paid tier launches will not auto-charge
          you — we&apos;ll ask first.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Service availability</h2>
        <p>
          We try to keep SafeSpark online, but we don&apos;t guarantee uninterrupted service. We may pause or
          modify the product, especially during early access. Saved projects belong to you; if we shut down,
          we&apos;ll give parents a way to export their kids&apos; work first.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Limitation of liability</h2>
        <p>
          To the extent allowed by law, SafeSpark is provided &quot;as is&quot; without warranties. We&apos;re
          not liable for indirect, incidental, or consequential damages from using or being unable to use the
          service.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Contact</h2>
        <p>
          Questions about these terms?{' '}
          <a href="mailto:jeremiah@getsafefamily.com" className="font-bold text-violet-600 underline">
            jeremiah@getsafefamily.com
          </a>
        </p>
      </article>
    </main>
  );
}
