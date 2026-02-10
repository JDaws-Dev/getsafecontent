import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Safe Family - SafeTunes, SafeTube, and SafeReads",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-navy mb-8">Privacy Policy</h1>
          <div className="prose prose-lg prose-navy max-w-none">
            <p className="text-navy/70 mb-6">
              Last updated: February 10, 2026
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">1. Introduction</h2>
              <p className="text-navy/80 mb-4">
                Safe Family (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the SafeTunes, SafeTube, and SafeReads
                applications (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our Service.
              </p>
              <p className="text-navy/80 mb-4">
                We are committed to protecting the privacy of families and children. Our Service is designed
                to give parents control over the content their children can access.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-navy mb-3">Account Information</h3>
              <p className="text-navy/80 mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Email address</li>
                <li>Password (encrypted and securely stored)</li>
                <li>Display name (optional)</li>
              </ul>

              <h3 className="text-xl font-medium text-navy mb-3">Content Preferences</h3>
              <p className="text-navy/80 mb-4">
                We store your content approval decisions:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Approved songs, albums, and artists (SafeTunes)</li>
                <li>Approved YouTube channels and videos (SafeTube)</li>
                <li>Approved books and authors (SafeReads)</li>
              </ul>

              <h3 className="text-xl font-medium text-navy mb-3">Payment Information</h3>
              <p className="text-navy/80 mb-4">
                Payment processing is handled by Stripe. We do not store your credit card information
                directly. Stripe&apos;s privacy policy applies to payment data.
              </p>

              <h3 className="text-xl font-medium text-navy mb-3">Usage Data</h3>
              <p className="text-navy/80 mb-4">
                We may collect basic usage analytics to improve our Service, including:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>App feature usage patterns</li>
                <li>Error logs for debugging</li>
                <li>Device type and browser information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">3. How We Use Your Information</h2>
              <p className="text-navy/80 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Provide and maintain the Service</li>
                <li>Process your subscription payments</li>
                <li>Sync your content approvals across devices</li>
                <li>Send important account and service updates</li>
                <li>Respond to your support requests</li>
                <li>Improve and optimize the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">4. Data Sharing</h2>
              <p className="text-navy/80 mb-4">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li><strong>Stripe:</strong> For payment processing</li>
                <li><strong>Convex:</strong> Our database provider, for storing account and content data</li>
                <li><strong>Service providers:</strong> Who assist in operating our Service</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">5. Children&apos;s Privacy</h2>
              <p className="text-navy/80 mb-4">
                While our Service is designed to help parents manage content for children,
                the parent account holder is the primary user. Children access content through
                parent-controlled apps. We do not knowingly collect personal information
                directly from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">6. Data Security</h2>
              <p className="text-navy/80 mb-4">
                We implement appropriate security measures including:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure password hashing</li>
                <li>Regular security updates</li>
                <li>Limited employee access to user data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">7. Your Rights</h2>
              <p className="text-navy/80 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="text-navy/80 mb-4">
                To exercise these rights, contact us at{" "}
                <a href="mailto:jeremiah@getsafefamily.com" className="text-indigo-600 hover:text-indigo-700">
                  jeremiah@getsafefamily.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">8. Data Retention</h2>
              <p className="text-navy/80 mb-4">
                We retain your data for as long as your account is active. When you delete your
                account, we delete your personal data within 30 days, except where we need to
                retain it for legal or business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">9. Changes to This Policy</h2>
              <p className="text-navy/80 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of
                significant changes by email or through the Service. Continued use after changes
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">10. Contact Us</h2>
              <p className="text-navy/80 mb-4">
                If you have questions about this Privacy Policy, contact us at:
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
