import type { Metadata } from "next";
import { BookOpen, Brain, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about SafeReads — AI-powered book content reviews built by a parent, for parents.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-ink-900">
        About SafeReads
      </h1>

      <div className="mt-8 space-y-8 text-ink-600">
        <section>
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-parchment-600" />
            <h2 className="font-serif text-xl font-bold text-ink-900">
              What is SafeReads?
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            SafeReads is an AI-powered tool that reviews book content so
            parents can make informed decisions about what their children read.
            Search by title, scan a barcode, or snap a photo of a book cover —
            and get a detailed content breakdown in seconds.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-verdict-caution" />
            <h2 className="font-serif text-xl font-bold text-ink-900">
              Why We Built It
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Built by a parent, for parents. Navigating children&apos;s books
            can be overwhelming — especially when a title looks age-appropriate
            on the outside but contains content you weren&apos;t expecting.
            SafeReads exists to give you the facts so you can decide what&apos;s
            right for your family, without judgment.
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-parchment-600" />
            <h2 className="font-serif text-xl font-bold text-ink-900">
              How the AI Works
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            When you look up a book, SafeReads pulls metadata from Google Books
            and Open Library — including the title, author, description, and
            subject categories. This metadata is then sent to OpenAI&apos;s
            GPT-4o model, which generates a structured content review covering
            areas like violence, language, sexual content, substance use, and
            dark themes.
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            No personal information is ever sent to the AI. The review is
            based solely on publicly available book data. We&apos;re transparent
            about this because we believe you deserve to know exactly how the
            tool works.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            Our Philosophy
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            SafeReads doesn&apos;t tell you what to think. It gives you
            objective information — no bias, no agenda — and trusts you to make
            the right call for your family. Every family is different, and
            that&apos;s exactly how it should be.
          </p>
        </section>
      </div>
    </div>
  );
}
