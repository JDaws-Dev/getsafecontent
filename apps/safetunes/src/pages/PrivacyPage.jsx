import { Link } from 'react-router-dom';

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
              <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">SafeTunes</span>
        </Link>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: November 17, 2025</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to SafeTunes ("we," "our," or "us"). We are committed to protecting your privacy and the privacy of your children. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Email address, name, password (encrypted)</li>
                <li><strong>Kid Profile Information:</strong> Child's name, avatar, color preference, optional PIN, age range, music preferences</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
                <li><strong>Music Preferences:</strong> Approved albums, playlists, and music listening history</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the service</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                <li><strong>Apple Music Data:</strong> Album information, track details, playback history (when using Apple Music integration)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Provide and maintain the SafeTunes service</li>
                <li>Process your subscription payments</li>
                <li>Authenticate and authorize Apple Music access</li>
                <li>Store your approved music library and preferences</li>
                <li>Monitor and track content filtering (blocked searches)</li>
                <li>Send important service updates and notifications</li>
                <li>Improve our service and develop new features</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Storage and Security</h2>
              <p className="text-gray-700 mb-4">
                Your data is stored securely using Convex, a modern backend platform with enterprise-grade security. We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Bcrypt password hashing</li>
                <li>Secure authentication tokens</li>
                <li>Regular security audits</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We use the following third-party services:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Apple Music:</strong> For music streaming and catalog access (subject to Apple's privacy policy)</li>
                <li><strong>Stripe:</strong> For payment processing (subject to Stripe's privacy policy)</li>
                <li><strong>Convex:</strong> For database and backend services</li>
                <li><strong>Vercel:</strong> For web hosting</li>
              </ul>
              <p className="text-gray-700 mb-4">
                These services may collect and process data according to their own privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                SafeTunes is designed for families with children. We take children's privacy seriously and comply with the Children's Online Privacy Protection Act (COPPA).
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>We only collect minimal information about children (name, avatar, preferences)</li>
                <li>Children cannot create accounts - only parents can</li>
                <li>Parents have full control over their children's profiles and data</li>
                <li>We do not sell or share children's data with third parties</li>
                <li>Parents can delete children's profiles and data at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your data for as long as your account is active. When you delete your account, we permanently delete your personal information within 30 days, except where required by law to retain it longer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking Technologies</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Types of Cookies We Use</h3>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through our cookie consent banner.
              </p>

              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-2">Essential Cookies (Always Active)</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and site functionality</li>
                  <li>Cookie consent preferences</li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-2">Analytics Cookies (Optional - Requires Consent)</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Error tracking and monitoring (Sentry)</li>
                  <li>Performance monitoring and optimization</li>
                  <li>Feature usage analytics</li>
                  <li>Technical diagnostics</li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-2">Marketing Cookies (Optional - Requires Consent)</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Facebook Pixel for ad measurement</li>
                  <li>Conversion tracking and attribution</li>
                  <li>Retargeting and personalized advertising</li>
                  <li>Campaign effectiveness measurement</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">9.2 Local Storage</h3>
              <p className="text-gray-700 mb-4">
                We use browser localStorage to maintain your login session, user preferences, and cookie consent choices. This data is stored locally on your device and can be cleared through your browser settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">9.3 Managing Your Cookie Preferences</h3>
              <p className="text-gray-700 mb-4">
                You can change your cookie preferences at any time by clearing your browser's cookies and revisiting our site. Most browsers also allow you to refuse cookies or alert you when cookies are being sent. However, blocking essential cookies may prevent you from using certain features of our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers (GDPR)</h2>
              <p className="text-gray-700 mb-4">
                SafeTunes operates globally and may process your data in countries outside your country of residence, including the United States. We ensure appropriate safeguards are in place for international data transfers through:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Service providers certified under EU-U.S. Data Privacy Framework</li>
                <li>Adequate security measures to protect data during transfer and storage</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Your Rights Under GDPR (EU Residents)</h3>
              <p className="text-gray-700 mb-4">If you are located in the European Economic Area (EEA), you have the following rights:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                <li><strong>Right to Restriction:</strong> Request limitation of data processing</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise any of these rights, contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a>. We will respond to your request within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. California Privacy Rights (CCPA/CPRA)</h2>
              <p className="text-gray-700 mb-4">
                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Your California Privacy Rights</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Right to Know:</strong> Request disclosure of personal information we collect, use, disclose, and sell</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt-out of sale or sharing of personal information (Note: We do not sell personal information)</li>
                <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
                <li><strong>Right to Limit Use:</strong> Limit use and disclosure of sensitive personal information</li>
                <li><strong>Right to Non-Discrimination:</strong> Exercise privacy rights without discriminatory treatment</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Categories of Personal Information We Collect</h3>
              <p className="text-gray-700 mb-4">Under CCPA, we collect the following categories of personal information:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Identifiers (name, email, account credentials)</li>
                <li>Commercial information (subscription status, payment history)</li>
                <li>Internet activity (browsing history, search queries, usage data)</li>
                <li>Geolocation data (general location based on IP address)</li>
                <li>Audio/visual information (approved music library, listening history)</li>
                <li>Inferences (music preferences, content filtering preferences)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Data Retention Policy</h3>
              <p className="text-gray-700 mb-4">
                We retain personal information for as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Account Data:</strong> Retained while account is active, deleted within 30 days of account deletion</li>
                <li><strong>Payment Records:</strong> Retained for 7 years for tax and accounting purposes</li>
                <li><strong>Usage Logs:</strong> Retained for 90 days for security and analytics purposes</li>
                <li><strong>Marketing Data:</strong> Retained until consent is withdrawn or account is deleted</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">How to Exercise Your California Rights</h3>
              <p className="text-gray-700 mb-4">
                To exercise your California privacy rights, send a verifiable consumer request to <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a> with "California Privacy Request" in the subject line. We will verify your identity and respond within 45 days. You may designate an authorized agent to make requests on your behalf.
              </p>

              <p className="text-gray-700 mb-4">
                <strong>Important:</strong> We do not sell or share your personal information with third parties for monetary or other valuable consideration. We do not knowingly sell personal information of minors under 16 years of age.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Do Not Track Signals</h2>
              <p className="text-gray-700 mb-4">
                Some browsers include a "Do Not Track" (DNT) feature that signals websites that you do not want your online activities tracked. Because there is no consistent industry standard for how to respond to DNT signals, we do not currently respond to DNT browser signals. However, you can control tracking through our cookie consent banner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Posting a prominent notice on our website</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Updating the "Last Updated" date at the top of this policy</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Your continued use of SafeTunes after changes are posted constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy, our data practices, or wish to exercise your privacy rights, contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days (45 days for California residents)
                </p>
                <p className="text-gray-700">
                  <strong>Data Protection Officer:</strong> For GDPR-related inquiries, email us with "GDPR Request" in the subject line
                </p>
              </div>
              <p className="text-gray-700 text-sm italic">
                For EU residents: If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;
