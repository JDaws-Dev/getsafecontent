import { Link } from 'react-router-dom';

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900">SafeTunes</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Delete Your Account</h1>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Delete Your SafeTunes Account</h2>

          <p className="text-gray-600 mb-6">
            To request deletion of your SafeTunes account and all associated data, please email us at:
          </p>

          <a
            href="mailto:jeremiah@getsafefamily.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20SafeTunes%20account.%0A%0AEmail%20address%20on%20account%3A%20%0A%0AThank%20you."
            className="btn-brand inline-block rounded-lg mb-6"
          >
            Email: jeremiah@getsafefamily.com
          </a>

          <p className="text-gray-600 mb-4">
            Please include the email address associated with your SafeTunes account in your request.
          </p>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">What happens when your account is deleted:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span><strong>Permanently deleted:</strong> Your account, kid profiles, approved music library, playlists, listening history, and all preferences</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span><strong>Permanently deleted:</strong> All pending and reviewed music requests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span><strong>Permanently deleted:</strong> Blocked search history and parental monitoring data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span><strong>Retained for 30 days:</strong> Subscription and payment records (for legal and accounting purposes)</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Processing Time</h3>
            <p className="text-gray-600">
              Account deletion requests are typically processed within 7 business days. You will receive a confirmation email once your account has been deleted.
            </p>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>
            Questions? <a href="mailto:jeremiah@getsafefamily.com" className="text-purple-600 hover:underline">Contact Support</a>
          </p>
          <p className="mt-2">
            <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
            {' • '}
            <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
