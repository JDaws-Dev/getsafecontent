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

  const upgradeUrl = `https://getsafefamily.com/signup?app=safetube&email=${encodeURIComponent(user?.email || '')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Welcome Banner */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to SafeTube!
            </h1>
            <p className="text-gray-600">
              You have a Safe Family account, but SafeTube isn't part of your current plan.
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
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">
              What you'll get with SafeTube:
            </h3>
            <ul className="space-y-2">
              {[
                'YouTube video approval system',
                'Channel whitelisting',
                'Kid-safe video player',
                'Video request management',
                'Screen time tracking',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
            <p className="text-sm text-red-600 font-medium mt-1">
              Or save with the Safe Family bundle!
            </p>
          </div>

          {/* CTA Button */}
          <a
            href={upgradeUrl}
            className="block w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-bold text-lg text-center transition shadow-lg mb-4"
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
            <Link to="/support" className="text-red-600 hover:text-red-700 font-medium">
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
