import { Link } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';

/**
 * UpgradePrompt - Shown to users who have a Safe Family account
 * but aren't entitled to this specific app.
 *
 * This is different from the trial-expired upgrade page:
 * - Trial expired: User had access, it ended
 * - Inactive: User has credentials but never had this app
 */
export default function UpgradePrompt({ user, onLogout }) {
  const { signOut } = useAuthActions();

  const handleLogout = async () => {
    await signOut();
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/login';
    }
  };

  const upgradeUrl = `https://getsafefamily.com/signup?app=safetunes&email=${encodeURIComponent(user?.email || '')}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Welcome Banner */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to SafeTunes!
            </h1>
            <p className="text-gray-600">
              You have a Safe Family account, but SafeTunes isn't part of your current plan.
            </p>
          </div>

          {/* Current account info */}
          {user?.email && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 text-center">
                Logged in as <strong>{user.email}</strong>
              </p>
            </div>
          )}

          {/* Features preview */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">
              What you'll get with SafeTunes:
            </h3>
            <ul className="space-y-2">
              {[
                'Family-safe music streaming',
                'Parent-approved albums only',
                'Unlimited children profiles',
                'Hide explicit album artwork',
                'Search monitoring alerts',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">$4.99</span>
              <span className="text-gray-500">/month</span>
            </div>
            <p className="text-sm text-purple-600 font-medium mt-1">
              Or save with the Safe Family bundle!
            </p>
          </div>

          {/* CTA Button */}
          <a
            href={upgradeUrl}
            className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-bold text-lg text-center transition shadow-lg mb-4"
          >
            Upgrade Now
          </a>

          {/* Use different account */}
          <button
            onClick={handleLogout}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-center transition"
          >
            Use a Different Account
          </button>

          {/* Support link */}
          <div className="text-center mt-6 text-sm text-gray-500">
            Questions?{' '}
            <Link to="/support" className="text-purple-600 hover:text-purple-700 font-medium">
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
