import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Detect if running in native SafeTunes app
const isNativeApp = typeof window !== 'undefined' && (
  window.isInSafeTunesApp ||
  /SafeTunesApp/.test(navigator.userAgent)
);

function UpgradePage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const createCheckoutSession = useAction(api.stripeActions.createCheckoutSession);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get current user from Convex Auth
  const currentUser = useQuery(api.userSync.getCurrentUser);

  const isTrialExpired = searchParams.get('trial_expired') === 'true';
  const isSubscriptionRequired = searchParams.get('subscription_required') === 'true';

  const handleSubscribe = async () => {
    if (!currentUser?.email) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const priceId = import.meta.env.VITE_STRIPE_PRICE_ID;

      if (!priceId) {
        setError('Payment configuration error. Please contact support.');
        setLoading(false);
        return;
      }

      const { url } = await createCheckoutSession({
        email: currentUser.email,
        priceId: priceId,
      });

      window.location.href = url;
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  // Native app version - direct to website for subscription
  if (isNativeApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <Link to="/admin" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">SafeTunes</span>
          </Link>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Icon */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {isTrialExpired ? 'Your Trial Has Ended' : 'Subscribe to Continue'}
                </h1>
                <p className="text-gray-600">
                  We hope you're loving SafeTunes! To continue protecting your kids' music, please subscribe on our website.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">How to subscribe:</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <span>Open Safari or your browser</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <span>Visit <strong>getsafetunes.com</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <span>Log in with your account and subscribe</span>
                  </li>
                </ol>
              </div>

              {/* Pricing info */}
              <div className="text-center mb-6">
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">$4.99</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Cancel anytime</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {[
                  'Unlimited children',
                  'Unlimited approved albums',
                  'Hide album artwork',
                  'Inappropriate search alerts',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Log out button - can't go back to dashboard since trial expired */}
              <button
                onClick={() => window.location.href = '/login'}
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-center transition"
              >
                Log Out
              </button>

              {/* Support link */}
              <div className="text-center mt-4 text-sm text-gray-500">
                Questions?{' '}
                <Link to="/support" className="text-purple-600 hover:text-purple-700 font-medium">
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {isTrialExpired ? (
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isTrialExpired ? 'Your Trial Has Ended' : 'Upgrade to Continue'}
              </h1>
              <p className="text-gray-600">
                {isTrialExpired
                  ? "We hope you loved SafeTunes! Subscribe to keep protecting your kids' ears."
                  : "Subscribe to continue using SafeTunes."}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold">$4.99</div>
                <div className="text-purple-200">/month</div>
              </div>

              <ul className="space-y-2 mb-6">
                {[
                  'Unlimited children',
                  'Unlimited approved albums',
                  'Hide album artwork',
                  'Inappropriate search alerts',
                  'Cancel anytime'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleSubscribe}
                disabled={loading || !isAuthenticated || !currentUser}
                className="w-full bg-white text-purple-600 hover:bg-gray-100 py-3 rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Subscribe Now'}
              </button>
            </div>

            {/* Not logged in message */}
            {(!isAuthenticated || !currentUser) && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Please{' '}
                  <Link to="/login" className="font-medium underline">log in</Link>
                  {' '}to subscribe.
                </p>
              </div>
            )}

            {/* What you've built */}
            {currentUser && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Don't lose your setup!</strong> You've already configured SafeTunes. Subscribe to keep your approved albums and settings.
                </p>
              </div>
            )}

            {/* Links */}
            <div className="text-center text-sm text-gray-500">
              <p>
                Questions?{' '}
                <Link to="/support" className="text-purple-600 hover:text-purple-700 font-medium">
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradePage;
