import { Link } from 'react-router-dom';

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 14, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeTube ("we", "our", or "us") is committed to protecting your privacy and the privacy of your children.
              This Privacy Policy explains how we collect, use, and safeguard information when you use our YouTube
              parental control service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <div>
                <h3 className="font-medium text-gray-800">Account Information</h3>
                <p>When you create an account, we collect your email address and password (securely hashed).</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Kid Profile Information</h3>
                <p>
                  We store kid profile names and display colors that you create. We do not collect any personal
                  information directly from children.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Usage Data</h3>
                <p>
                  We track which approved videos are watched, video requests from kids, and search queries
                  (for parental visibility). This data is only visible to you as the parent.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>To provide and maintain the SafeTube service</li>
              <li>To allow parents to manage approved content for their children</li>
              <li>To show parents what their children are watching and searching</li>
              <li>To process video requests from kids to parents</li>
              <li>To communicate with you about your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">COPPA Compliance</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeTube is designed to be compliant with the Children's Online Privacy Protection Act (COPPA).
              We do not knowingly collect personal information from children under 13. All account management
              is done by parents. Children access content through a family code without creating accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
              <li>Service providers who help us operate SafeTube (hosting, database services)</li>
              <li>YouTube's API to fetch video information (subject to YouTube's Terms of Service)</li>
              <li>Law enforcement if required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We use industry-standard security measures to protect your data, including encrypted connections
              (HTTPS), secure password hashing, and secure cloud infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to access, update, or delete your account and all associated data at any time.
              Contact us at <a href="mailto:jeremiah@getsafefamily.com" className="text-red-500 hover:text-red-600">jeremiah@getsafefamily.com</a> to
              exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:jeremiah@getsafefamily.com" className="text-red-500 hover:text-red-600">
                jeremiah@getsafefamily.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-gray-500 hover:text-gray-700">Terms of Service</Link>
          <Link to="/support" className="text-gray-500 hover:text-gray-700">Contact Support</Link>
          <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
        </div>
      </main>
    </div>
  );
}
