import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">SafeTube</span>
          </Link>
          <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 14, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using SafeTube ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeTube is a parental control service that allows parents to create whitelists of approved
              YouTube channels and videos for their children. The Service provides a separate viewing interface
              where children can only access parent-approved content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You must be at least 18 years old to create a parent account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You agree to provide accurate and complete information when creating an account</li>
              <li>You are responsible for reviewing and approving content for your children</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Content and YouTube</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeTube accesses YouTube content through YouTube's official API. All video content remains the
              property of YouTube and its content creators. We do not host, modify, or claim ownership of any
              YouTube videos. Your use of YouTube content through our Service is subject to YouTube's Terms of
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Subscriptions and Payments</h2>
            <div className="space-y-3 text-gray-600 leading-relaxed">
              <p>
                SafeTube offers subscription plans that provide access to the full Service. By subscribing,
                you agree to pay the applicable subscription fees.
              </p>
              <p>
                Subscriptions automatically renew unless cancelled before the renewal date. You may cancel
                your subscription at any time through your account settings.
              </p>
              <p>
                Refunds may be available at our discretion. Contact support for refund requests.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeTube is provided "as is" without warranties of any kind. While we strive to provide a safe
              viewing experience, we cannot guarantee that all content will be appropriate for all children.
              Parents remain ultimately responsible for supervising their children's media consumption.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              We are not liable for any damages arising from the use of our Service, including but not limited
              to content viewed, service interruptions, or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Prohibited Uses</h2>
            <p className="text-gray-600 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to circumvent any security features of the Service</li>
              <li>Share your account credentials with others</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these
              terms or for any other reason at our discretion. You may also delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may modify these Terms of Service at any time. We will notify users of significant changes
              by posting a notice on our website. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:jeremiah@getsafefamily.com" className="text-red-500 hover:text-red-600">
                jeremiah@getsafefamily.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700">Privacy Policy</Link>
          <Link to="/support" className="text-gray-500 hover:text-gray-700">Contact Support</Link>
          <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
        </div>
      </main>
    </div>
  );
}
