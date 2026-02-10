import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * SignupPage - Redirects to central Safe Family signup
 *
 * The signup flow is now unified across all Safe Family apps.
 * This page redirects to getsafefamily.com/signup?app=safetube
 * which handles account creation and returns the user to SafeTube.
 *
 * Login remains local - see LoginPage.jsx
 */
export default function SignupPage() {
  const CENTRAL_SIGNUP_URL = 'https://getsafefamily.com/signup?app=safetube';

  useEffect(() => {
    // Redirect to central signup
    window.location.href = CENTRAL_SIGNUP_URL;
  }, []);

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">SafeTube</span>
        </Link>
      </header>

      {/* Loading/Redirect State */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Redirecting to Sign Up...
          </h1>
          <p className="text-gray-500 mb-6">
            Taking you to the Safe Family signup page.
          </p>
          <p className="text-sm text-gray-400">
            Not redirecting?{' '}
            <a
              href={CENTRAL_SIGNUP_URL}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Click here
            </a>
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
