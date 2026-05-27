import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SafeSpark handles data for parents and kids: what we collect, why, and how to delete it.',
  alternates: { canonical: '/privacy' },
};

const EFFECTIVE = 'May 27, 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-12 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-6 text-slate-700">
        <header className="space-y-2">
          <Link href="/" className="text-xs font-bold uppercase tracking-widest text-violet-500 hover:text-violet-700">
            ← SafeSpark
          </Link>
          <h1 className="text-4xl font-black text-slate-900">Privacy Policy</h1>
          <p className="text-sm font-semibold text-slate-500">Effective {EFFECTIVE}</p>
        </header>

        <p>
          SafeSpark is built for kids ages 10-13 to make things with AI. This page explains what we collect, why,
          and what you can do about it. Plain English. No tricks.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Who&apos;s the account holder</h2>
        <p>
          The <strong>parent</strong> is the account holder. Kids do <strong>not</strong> have their own SafeSpark
          accounts. Parents sign up with email through our auth provider (Clerk) and get a 6-character{' '}
          <strong>family code</strong>. Kids log in on their device by entering that code and picking their
          profile — no email, no password.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">What we collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Parent account</strong>: email, display name (from Clerk). That&apos;s it.
          </li>
          <li>
            <strong>Kid profiles</strong> (created by the parent): display name, age, sex, interests, optional
            avatar color, optional 4-digit PIN. We do not collect a kid&apos;s real name unless the parent enters one.
          </li>
          <li>
            <strong>Projects</strong> the kid creates: title, the project&apos;s HTML, the chat transcript that
            built it, and version snapshots. Stored under the parent&apos;s account.
          </li>
          <li>
            <strong>Prompts</strong>: what the kid asked Spark to do. Logged for safety review and product
            improvement.
          </li>
          <li>
            <strong>Uploaded images</strong>: photos a kid attaches to a project. Stored in Convex storage tied
            to the parent account.
          </li>
          <li>
            <strong>Usage</strong>: chat-turn counts, image-restyle counts, and estimated AI cost per month —
            for the parent dashboard and our internal observability.
          </li>
        </ul>

        <h2 className="mt-6 text-2xl font-black text-slate-900">What we do NOT collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            No biometric data, no facial recognition, no location tracking.
          </li>
          <li>No ad-tracking pixels, no third-party advertising cookies.</li>
          <li>No social-media login data.</li>
          <li>No browsing history outside SafeSpark.</li>
          <li>No microphone audio is stored. Voice input is processed locally by the browser&apos;s Speech API.</li>
        </ul>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Who we share data with</h2>
        <p>The minimum number of vendors to run the product:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>OpenAI</strong>: prompts and project context are sent to OpenAI to generate the response.
            We send the minimum needed. Image transforms go through OpenAI&apos;s image API and pass through
            their moderation layer.
          </li>
          <li>
            <strong>Convex</strong>: our database. Projects, prompts, usage, and uploaded images are stored here.
          </li>
          <li>
            <strong>Clerk</strong>: handles parent account sign-up and login.
          </li>
          <li>
            <strong>Vercel</strong>: serves the website.
          </li>
        </ul>
        <p>
          We do not sell data. We do not share data with advertisers. We do not let any vendor train models on
          your kid&apos;s prompts (per our agreements with those vendors).
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Children&apos;s privacy (COPPA)</h2>
        <p>
          SafeSpark is designed for the parent to be the account holder for children under 13. Kids interact
          under their parent&apos;s family account. The parent provides verifiable consent at sign-up by
          creating the account and adding kid profiles themselves. If you are a parent and want us to delete
          any data we have for your kid, see <strong>Deleting data</strong> below.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Deleting data</h2>
        <p>
          Parents can delete any project from <code className="rounded bg-slate-100 px-1 py-0.5">/parent</code> or{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">/make</code>. Deleted projects sit in a 30-day
          recycle bin, then are permanently removed.
        </p>
        <p>
          To delete your entire account and all kid profiles, email{' '}
          <a href="mailto:jeremiah@getsafefamily.com" className="font-bold text-violet-600 underline">
            jeremiah@getsafefamily.com
          </a>
          . We&apos;ll process within 7 days.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Changes to this policy</h2>
        <p>
          If we materially change what we collect or how we share data, we&apos;ll update this page and notify
          parents by email.
        </p>

        <h2 className="mt-6 text-2xl font-black text-slate-900">Contact</h2>
        <p>
          Email{' '}
          <a href="mailto:jeremiah@getsafefamily.com" className="font-bold text-violet-600 underline">
            jeremiah@getsafefamily.com
          </a>{' '}
          with any privacy question. We&apos;re a small team and will respond.
        </p>
      </article>
    </main>
  );
}
