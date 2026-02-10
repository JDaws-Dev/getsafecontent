import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Safe Family - SafeTunes, SafeTube, and SafeReads",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-navy mb-8">Terms of Service</h1>
          <div className="prose prose-lg prose-navy max-w-none">
            <p className="text-navy/70 mb-6">
              Last updated: February 10, 2026
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">1. Agreement to Terms</h2>
              <p className="text-navy/80 mb-4">
                By accessing or using Safe Family&apos;s services—including SafeTunes, SafeTube, and SafeReads
                (collectively, the &quot;Service&quot;)—you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree to these Terms, do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">2. Description of Service</h2>
              <p className="text-navy/80 mb-4">
                Safe Family provides parental control applications that allow parents to:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li><strong>SafeTunes:</strong> Control which songs and artists their children can listen to via Apple Music</li>
                <li><strong>SafeTube:</strong> Control which YouTube channels and videos their children can watch</li>
                <li><strong>SafeReads:</strong> Control which books their children can read and discover</li>
              </ul>
              <p className="text-navy/80 mb-4">
                The Service requires a subscription. Features and availability may change over time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">3. Account Registration</h2>
              <p className="text-navy/80 mb-4">
                You must create an account to use the Service. You agree to:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <p className="text-navy/80 mb-4">
                You must be at least 18 years old to create an account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">4. Subscription and Payment</h2>

              <h3 className="text-xl font-medium text-navy mb-3">Pricing</h3>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Safe Family Bundle: $9.99/month or $99/year (includes all three apps)</li>
                <li>Individual apps: $4.99/month (SafeTunes), $4.99/month (SafeTube), $2.99/month (SafeReads)</li>
              </ul>

              <h3 className="text-xl font-medium text-navy mb-3">Free Trial</h3>
              <p className="text-navy/80 mb-4">
                New subscribers receive a 7-day free trial. You will not be charged until the trial ends.
                You may cancel at any time during the trial without charge.
              </p>

              <h3 className="text-xl font-medium text-navy mb-3">Billing</h3>
              <p className="text-navy/80 mb-4">
                Subscriptions are billed in advance on a recurring basis (monthly or yearly, depending on
                your plan). Your subscription will automatically renew unless cancelled before the renewal date.
              </p>

              <h3 className="text-xl font-medium text-navy mb-3">Cancellation</h3>
              <p className="text-navy/80 mb-4">
                You may cancel your subscription at any time through your account settings. Upon cancellation:
              </p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>You will retain access until the end of your current billing period</li>
                <li>No partial refunds are provided for unused time (except as described in our Refund Policy)</li>
                <li>Your content approvals will be preserved if you resubscribe later</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">5. Acceptable Use</h2>
              <p className="text-navy/80 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Share your account credentials with others</li>
                <li>Reverse engineer or attempt to extract the source code of the Service</li>
                <li>Use the Service to circumvent content restrictions on third-party platforms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">6. Third-Party Services</h2>
              <p className="text-navy/80 mb-4">
                The Service integrates with third-party platforms (Apple Music, YouTube). Your use of
                these platforms is subject to their respective terms of service. We are not responsible
                for the content, policies, or availability of third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">7. Intellectual Property</h2>
              <p className="text-navy/80 mb-4">
                The Service and its original content, features, and functionality are owned by Safe Family
                and are protected by copyright, trademark, and other intellectual property laws. You may not
                copy, modify, or distribute any part of the Service without our permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-navy/80 mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED,
                SECURE, OR ERROR-FREE.
              </p>
              <p className="text-navy/80 mb-4">
                While we strive to help parents manage content, we cannot guarantee that all inappropriate
                content will be blocked or that our content classifications are always accurate. Parents
                remain ultimately responsible for supervising their children&apos;s media consumption.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">9. Limitation of Liability</h2>
              <p className="text-navy/80 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAFE FAMILY SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
                INTANGIBLE LOSSES.
              </p>
              <p className="text-navy/80 mb-4">
                Our total liability to you for any claims arising from or related to the Service shall
                not exceed the amount you paid us in the past twelve (12) months.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">10. Changes to Terms</h2>
              <p className="text-navy/80 mb-4">
                We may modify these Terms at any time. We will notify you of material changes by email
                or through the Service. Your continued use of the Service after changes take effect
                constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">11. Termination</h2>
              <p className="text-navy/80 mb-4">
                We may suspend or terminate your access to the Service at any time for violation of
                these Terms or for any other reason at our discretion. Upon termination, your right
                to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">12. Governing Law</h2>
              <p className="text-navy/80 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-navy mb-4">13. Contact Us</h2>
              <p className="text-navy/80 mb-4">
                If you have questions about these Terms, contact us at:
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
