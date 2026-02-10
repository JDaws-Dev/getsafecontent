import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund Policy for Safe Family - 30-day money-back guarantee",
};

export default function RefundPage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-navy mb-8">Refund Policy</h1>
          <div className="prose prose-lg prose-navy max-w-none">
            <p className="text-navy/70 mb-6">
              Last updated: February 10, 2026
            </p>

            {/* Highlight box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-emerald-800 mb-2">
                30-Day Money-Back Guarantee
              </h2>
              <p className="text-emerald-700 mb-0">
                We offer a full refund within 30 days of your first payment, no questions asked.
                If Safe Family isn&apos;t right for your family, we&apos;ll refund your subscription.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">How Our Guarantee Works</h2>
              <p className="text-navy/80 mb-4">
                We want you to love Safe Family. If you&apos;re not satisfied within the first 30 days
                after your initial payment (after any free trial), simply contact us and we&apos;ll
                issue a full refund.
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>The 30-day period starts from your first paid charge</li>
                <li>Free trial periods are separate from the 30-day guarantee</li>
                <li>This applies to both monthly and yearly subscriptions</li>
                <li>No questions asked—we respect your decision</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">After 30 Days</h2>
              <p className="text-navy/80 mb-4">
                After the initial 30-day period, our standard refund policy applies:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>
                  <strong>Monthly subscriptions:</strong> No partial refunds for the current billing period.
                  When you cancel, you retain access until the end of your paid period.
                </li>
                <li>
                  <strong>Yearly subscriptions:</strong> If you cancel within 6 months, we&apos;ll provide a
                  prorated refund for unused months. After 6 months, no refunds are provided but you
                  retain access for the remainder of your subscription.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">How to Request a Refund</h2>
              <p className="text-navy/80 mb-4">
                To request a refund, simply email us at{" "}
                <a href="mailto:jeremiah@getsafefamily.com" className="text-indigo-600 hover:text-indigo-700">
                  jeremiah@getsafefamily.com
                </a>{" "}
                with:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Your account email address</li>
                <li>The reason for cancellation (optional, but helps us improve)</li>
              </ul>
              <p className="text-navy/80 mb-4">
                We aim to process refund requests within 2-3 business days. Refunds are issued to
                the original payment method and may take 5-10 business days to appear on your statement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">Exceptions</h2>
              <p className="text-navy/80 mb-4">
                Refunds may not be available in certain circumstances:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Accounts terminated due to Terms of Service violations</li>
                <li>Promotional or discounted subscriptions (may have different terms)</li>
                <li>Gift subscriptions (refund goes to original purchaser)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">Account After Refund</h2>
              <p className="text-navy/80 mb-4">
                When a refund is processed:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Your subscription will be cancelled immediately</li>
                <li>Your account will remain but with limited (free) access</li>
                <li>Your content approval lists will be preserved</li>
                <li>You can resubscribe at any time to restore full access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">Contact Us</h2>
              <p className="text-navy/80 mb-4">
                Have questions about our refund policy? We&apos;re here to help:
              </p>
              <p className="text-navy/80">
                Email:{" "}
                <a href="mailto:jeremiah@getsafefamily.com" className="text-indigo-600 hover:text-indigo-700">
                  jeremiah@getsafefamily.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
