import { Link } from 'react-router-dom';

function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: November 17, 2025</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using SafeTunes ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                SafeTunes is a parental control service for Apple Music that allows parents to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Create profiles for their children</li>
                <li>Approve specific albums for children to listen to</li>
                <li>Hide album artwork to prevent exposure to inappropriate images</li>
                <li>Monitor blocked search attempts</li>
                <li>Control what content children can access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
              <p className="text-gray-700 mb-4">
                You must be at least 18 years old and a parent or legal guardian to create an account. By creating an account, you represent that you have the legal authority to consent to these Terms on behalf of yourself and any children whose profiles you create.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Apple Music Requirement</h2>
              <p className="text-gray-700 mb-4">
                SafeTunes requires an active Apple Music subscription. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Maintaining your Apple Music subscription</li>
                <li>Complying with Apple's Terms and Conditions</li>
                <li>Any fees charged by Apple for their service</li>
              </ul>
              <p className="text-gray-700 mb-4">
                SafeTunes is not affiliated with, endorsed by, or sponsored by Apple Inc.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Account Security</h2>
              <p className="text-gray-700 mb-4">You are responsible for:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>Keeping your family code and child PINs secure</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription and Payment</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Pricing</h3>
              <p className="text-gray-700 mb-4">
                SafeTunes costs $4.99 per month. New users receive a 7-day free trial. Pricing is subject to change with 30 days notice.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Billing</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Subscriptions automatically renew monthly unless cancelled</li>
                <li>You will be charged on the same day each month</li>
                <li>All payments are processed through Stripe</li>
                <li>Failed payments may result in service suspension</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Cancellation</h3>
              <p className="text-gray-700 mb-4">
                You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. No refunds are provided for partial months.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.4 Coupon Codes</h3>
              <p className="text-gray-700 mb-4">
                Promotional coupon codes may provide discounted or free access. Coupon terms are specified at the time of use and may not be combined with other offers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to circumvent content filtering or parental controls</li>
                <li>Share your account with others outside your family</li>
                <li>Reverse engineer or attempt to access the Service's source code</li>
                <li>Use automated tools to scrape or download content</li>
                <li>Interfere with the Service's operation or security</li>
                <li>Impersonate others or provide false information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Content Filtering Limitations</h2>
              <p className="text-gray-700 mb-4">
                While SafeTunes provides content filtering and monitoring tools, we cannot guarantee that all inappropriate content will be blocked. Parents are ultimately responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Reviewing and approving content for their children</li>
                <li>Monitoring their children's listening habits</li>
                <li>Using additional parental control tools as needed</li>
                <li>Supervising their children's device usage</li>
              </ul>
              <p className="text-gray-700 mb-4">
                SafeTunes is a tool to assist parents, not a replacement for parental supervision.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                SafeTunes and all related materials are owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
              </p>
              <p className="text-gray-700 mb-4">
                Music content is owned by respective artists and labels. Album artwork and metadata are provided by Apple Music.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Service is subject to our <Link to="/privacy" className="text-purple-600 hover:text-purple-700 font-medium">Privacy Policy</Link>, which is incorporated into these Terms by reference.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties that the Service will be uninterrupted or error-free</li>
                <li>Warranties regarding content accuracy or completeness</li>
                <li>Warranties that all inappropriate content will be blocked</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING FROM:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Your use or inability to use the Service</li>
                <li>Content that was not blocked by our filters</li>
                <li>Unauthorized access to your account</li>
                <li>Service interruptions or errors</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify, defend, and hold harmless SafeTunes, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights, including intellectual property rights</li>
                <li>Any content or data you submit through the Service</li>
                <li>Your breach of any representation or warranty in these Terms</li>
                <li>Any harm caused to your children while using the Service</li>
              </ul>
              <p className="text-gray-700 mb-4">
                This indemnification obligation will survive termination of your account and these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. User-Generated Content and Data</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">14.1 Your Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of any data you submit to SafeTunes, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Account information and profile data</li>
                <li>Kid profile names, avatars, and preferences</li>
                <li>Music library selections and approved content lists</li>
                <li>Playlist names and custom settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.2 License Grant</h3>
              <p className="text-gray-700 mb-4">
                By submitting content to SafeTunes, you grant us a worldwide, non-exclusive, royalty-free license to use, store, process, and display your content solely for the purpose of:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Providing and improving the Service</li>
                <li>Backing up and securing your data</li>
                <li>Complying with legal obligations</li>
                <li>Enforcing these Terms</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We will not share your personal content with third parties except as described in our Privacy Policy or as required by law.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">14.3 Content Responsibility</h3>
              <p className="text-gray-700 mb-4">
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>The accuracy and appropriateness of content you approve for your children</li>
                <li>Ensuring content complies with applicable laws and regulations</li>
                <li>Backing up any critical data you store in the Service</li>
                <li>Content selections made under your account by you or members of your family</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Termination and Account Deletion</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">15.1 Your Right to Terminate</h3>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Canceling your subscription in account settings</li>
                <li>Contacting us to request account deletion</li>
                <li>Simply stopping use of the Service (though you remain responsible for any outstanding fees)</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Upon cancellation, you will retain access until the end of your current billing period. After that, your access will cease and your data will be scheduled for deletion within 30 days.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">15.2 Our Right to Terminate</h3>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate your account immediately, without notice, for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Material violation of these Terms</li>
                <li>Fraudulent activity or payment disputes</li>
                <li>Illegal activity or conduct harmful to other users</li>
                <li>Repeated failed payment attempts</li>
                <li>Violation of applicable laws or regulations</li>
                <li>Abuse of the Service or attempts to circumvent security measures</li>
              </ul>
              <p className="text-gray-700 mb-4">
                We may also terminate your account with 30 days' advance notice for any reason or no reason, including discontinuation of the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">15.3 Effect of Termination</h3>
              <p className="text-gray-700 mb-4">
                Upon termination:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Your right to access and use the Service immediately ceases</li>
                <li>You remain responsible for any fees incurred before termination</li>
                <li>No refunds will be provided for partial billing periods</li>
                <li>Your data will be deleted within 30 days (except as required by law)</li>
                <li>Sections of these Terms that by their nature should survive (indemnification, limitation of liability, dispute resolution) will remain in effect</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Warranty Disclaimers</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-gray-700 font-semibold mb-2">IMPORTANT - PLEASE READ CAREFULLY:</p>
                <p className="text-gray-700 text-sm">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE AND ALL CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">16.1 No Warranty of Service Quality</h3>
              <p className="text-gray-700 mb-4">
                WE EXPRESSLY DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Merchantability:</strong> The Service is fit for any particular purpose</li>
                <li><strong>Fitness for Purpose:</strong> The Service will meet your specific requirements</li>
                <li><strong>Non-Infringement:</strong> The Service does not violate third-party rights</li>
                <li><strong>Accuracy:</strong> Content filtering is 100% accurate or complete</li>
                <li><strong>Reliability:</strong> The Service will be uninterrupted, timely, or error-free</li>
                <li><strong>Security:</strong> The Service is completely secure or free from viruses</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">16.2 Third-Party Content</h3>
              <p className="text-gray-700 mb-4">
                SafeTunes integrates with Apple Music and other third-party services. We make no warranties regarding:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Availability or accuracy of Apple Music content</li>
                <li>Appropriateness of music content for children</li>
                <li>Album artwork or metadata accuracy</li>
                <li>Continued compatibility with third-party services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">16.3 Parental Responsibility</h3>
              <p className="text-gray-700 mb-4">
                <strong>SafeTunes is a tool to assist parents, not a substitute for parental supervision.</strong> We do not guarantee that our content filters will block all inappropriate content. Parents remain solely responsible for monitoring their children's media consumption and device usage.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Dispute Resolution and Arbitration</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-gray-700 font-semibold mb-2">PLEASE READ THIS SECTION CAREFULLY:</p>
                <p className="text-gray-700 text-sm">
                  This section affects your legal rights and requires that disputes be resolved through binding arbitration instead of courts.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">17.1 Informal Dispute Resolution</h3>
              <p className="text-gray-700 mb-4">
                Before filing a claim, you agree to contact us at <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a> to attempt to resolve the dispute informally. We will attempt to resolve any disputes within 60 days of receiving notice.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">17.2 Binding Arbitration</h3>
              <p className="text-gray-700 mb-4">
                If we cannot resolve a dispute informally, any claims arising from or relating to these Terms or the Service must be resolved through binding arbitration, except:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Claims in small claims court (if they qualify)</li>
                <li>Claims for injunctive or equitable relief regarding intellectual property rights</li>
                <li>Claims for violations of applicable law that cannot be arbitrated</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Arbitration will be conducted by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration will take place in Georgia, USA, or another mutually agreed location. The arbitrator's decision will be final and binding, and judgment may be entered in any court of competent jurisdiction.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">17.3 Class Action Waiver</h3>
              <p className="text-gray-700 mb-4">
                <strong>YOU AND SAFETUNES AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</strong>
              </p>
              <p className="text-gray-700 mb-4">
                Unless both you and SafeTunes agree otherwise, the arbitrator may not consolidate more than one person's claims and may not preside over any form of representative or class proceeding.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">17.4 Arbitration Costs</h3>
              <p className="text-gray-700 mb-4">
                We will pay all AAA filing, administration, and arbitrator fees for claims under $10,000, unless the arbitrator finds the claim frivolous. For claims over $10,000, fees will be allocated according to AAA rules. Each party is responsible for their own attorney's fees unless a statute or these Terms provide otherwise.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">17.5 Opt-Out Right</h3>
              <p className="text-gray-700 mb-4">
                You may opt out of this arbitration agreement by sending written notice to <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a> within 30 days of first accepting these Terms. Your notice must include your name, email address, and a clear statement that you wish to opt out of this arbitration agreement. Opting out does not affect any other terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">18. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We may update these Terms at any time. Material changes will be communicated through:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Email notification to your registered email address</li>
                <li>Prominent notice on the Service</li>
                <li>In-app notification when you next log in</li>
              </ul>
              <p className="text-gray-700 mb-4">
                The updated Terms will be effective immediately for new users. For existing users, changes will take effect 30 days after notification, except for changes required by law which may take effect immediately. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
              </p>
              <p className="text-gray-700 mb-4">
                If you do not agree to the updated Terms, you must stop using the Service and may cancel your account before the effective date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">19. Governing Law and Jurisdiction</h2>
              <p className="text-gray-700 mb-4">
                These Terms and any disputes arising from them are governed by the laws of the State of Georgia, United States, without regard to conflict of law principles. However, the Federal Arbitration Act governs the interpretation and enforcement of the arbitration provisions in Section 17.
              </p>
              <p className="text-gray-700 mb-4">
                For any disputes not subject to arbitration, you agree to submit to the exclusive jurisdiction of the state and federal courts located in Georgia. You waive any objection to venue in these courts and any claim that these courts are an inconvenient forum.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">20. Miscellaneous</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">20.1 Entire Agreement</h3>
              <p className="text-gray-700 mb-4">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and SafeTunes regarding the Service and supersede any prior agreements.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">20.2 Severability</h3>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect. The invalid provision will be modified to the minimum extent necessary to make it valid and enforceable.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">20.3 Waiver</h3>
              <p className="text-gray-700 mb-4">
                Our failure to enforce any right or provision in these Terms will not constitute a waiver of that right or provision. Any waiver must be in writing and signed by an authorized representative.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">20.4 Assignment</h3>
              <p className="text-gray-700 mb-4">
                You may not assign or transfer these Terms or your account to anyone without our prior written consent. We may assign these Terms to any affiliate, successor, or acquirer without restriction.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">20.5 Force Majeure</h3>
              <p className="text-gray-700 mb-4">
                We will not be liable for any delay or failure to perform resulting from causes outside our reasonable control, including acts of God, war, terrorism, natural disasters, labor disputes, or internet service failures.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">20.6 Survival</h3>
              <p className="text-gray-700 mb-4">
                Sections that by their nature should survive termination will survive, including: indemnification, warranty disclaimers, limitation of liability, dispute resolution, and governing law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">21. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms, legal notices, or to exercise your rights under these Terms, contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}`} className="text-purple-600 hover:text-purple-700 font-medium">{import.meta.env.VITE_SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Legal Notices:</strong> For formal legal notices, use "Legal Notice" in the subject line
                </p>
                <p className="text-gray-700">
                  <strong>Arbitration Opt-Out:</strong> Use "Arbitration Opt-Out" in the subject line
                </p>
              </div>
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

export default TermsPage;
