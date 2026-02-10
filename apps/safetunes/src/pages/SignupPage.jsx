import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useIsNativeApp } from '../hooks/useIsNativeApp';

/**
 * SignupPage - Redirects to central Safe Family signup
 *
 * For web users: Redirects to getsafefamily.com/signup?app=safetunes
 * For iOS app users: Shows a message to use the web version (or implement local signup later)
 *
 * After central signup + payment, users will:
 * 1. Be directed to success page on getsafefamily.com
 * 2. Come back to SafeTunes and log in with their email
 * 3. The webhook will have already granted them access
 */
function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const isNativeApp = useIsNativeApp();

  // Get current user to check if already logged in
  const currentUser = useQuery(api.userSync.getCurrentUser);

  // Redirect to onboarding if already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser && !isPending) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, currentUser, isPending, navigate]);

  // Central signup URL
  const centralSignupUrl = 'https://getsafefamily.com/signup?app=safetunes';

  // Redirect web users to central signup immediately
  useEffect(() => {
    // Don't redirect if in native app (they need different handling)
    // Don't redirect if already authenticated
    if (!isNativeApp && !isAuthenticated && !isPending) {
      window.location.href = centralSignupUrl;
    }
  }, [isNativeApp, isAuthenticated, isPending]);

  // For iOS native app, show a message (since they can't easily redirect to external URLs)
  if (isNativeApp) {
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
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Sign Up on the Web
                </h1>
                <p className="text-gray-600 mb-6">
                  To create an account, please visit SafeTunes on your web browser.
                  Your subscription will work across all your devices.
                </p>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-purple-700 font-medium mb-2">
                    Visit this URL:
                  </p>
                  <p className="text-purple-900 font-mono text-sm break-all">
                    getsafetunes.com
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  After creating your account on the web, return here and log in.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <p className="text-center text-gray-600 mb-4">
                  Already have an account?
                </p>
                <Link
                  to="/login"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg text-center transition"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Web users see a loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-gray-600">Redirecting to signup...</p>
        <p className="text-sm text-gray-500 mt-2">
          If you're not redirected,{' '}
          <a href={centralSignupUrl} className="text-purple-600 hover:text-purple-700 underline">
            click here
          </a>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
