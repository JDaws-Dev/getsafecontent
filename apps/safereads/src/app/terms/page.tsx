import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using SafeReads.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-ink-900">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: January 2026</p>

      <div className="mt-8 space-y-8 text-ink-600">
        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            AI Review Disclaimer
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            SafeReads provides AI-generated content reviews for informational
            purposes only. These reviews are based on publicly available book
            metadata and AI interpretation. They are not a guarantee of
            completeness or accuracy. We recommend using SafeReads as one of
            several resources when evaluating books for your family.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            No Liability
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            SafeReads and its creators are not liable for decisions made based on
            the content reviews provided. The service is offered &ldquo;as
            is&rdquo; without warranties of any kind. You acknowledge that AI
            reviews may not capture every element of a book&apos;s content.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            User Responsibilities
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            You agree to use SafeReads for its intended purpose — evaluating
            book content for your family. You will not attempt to abuse, reverse
            engineer, or interfere with the service. You are responsible for
            maintaining the security of your account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            Age Requirement
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            You must be at least 18 years old or a parent/legal guardian to use
            SafeReads. This service is designed for adults making reading
            decisions for their children.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            Changes to These Terms
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            We may update these terms from time to time. Continued use of
            SafeReads after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-ink-900">
            Contact
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Questions about these terms? Email us at{" "}
            <a
              href="mailto:jedaws@gmail.com"
              className="text-parchment-700 hover:text-parchment-800"
            >
              jedaws@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
