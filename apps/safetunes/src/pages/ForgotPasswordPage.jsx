import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [oauthOnly, setOauthOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotFound(false);
    setOauthOnly(false);
    setLoading(true);

    try {
      const emailToSend = email.toLowerCase().trim();
      const result = await requestPasswordReset(emailToSend);

      if (!result.success) {
        if (result.code === 'OAUTH_ONLY') {
          // User signed up with Google, can't reset password
          setOauthOnly(true);
          setLoading(false);
          return;
        }
        // Generic error
        setError(result.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Success - store email for reset page and show confirmation
      localStorage.setItem('safetunes_reset_email', email);
      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

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

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {oauthOnly ? (
              // User signed up with Google OAuth
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Use Google Sign-In</h2>
                <p className="text-gray-600 mb-6">
                  This account uses Google sign-in. Please use the Google sign-in option on the login page to access your account.
                </p>

                <Link
                  to="/login"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition text-center mb-3"
                >
                  Go to Login
                </Link>

                <button
                  onClick={() => {
                    setOauthOnly(false);
                    setEmail('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Try Another Email
                </button>
              </div>
            ) : notFound ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Account Found</h2>
                <p className="text-gray-600 mb-6">
                  We couldn't find an account with <strong>{email}</strong>.
                </p>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-left">
                  <p className="text-sm">
                    <strong>Did you sign up with a different email?</strong> Try checking for typos, or try another email address you might have used.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setNotFound(false);
                    setEmail('');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition mb-3"
                >
                  Try Another Email
                </button>

                <Link
                  to="/signup"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition text-center"
                >
                  Create an Account
                </Link>
              </div>
            ) : !submitted ? (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
                  <p className="text-gray-600">
                    We'll send you a 6-digit code to reset your password
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Remember your password?{' '}
                    <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We've sent a 6-digit reset code to <strong>{email}</strong>.
                </p>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
                  <p className="text-sm">
                    <strong>Next Steps:</strong> Check your inbox for an email from Safe Family with your reset code.
                    The code will expire in 1 hour for security purposes.
                  </p>
                </div>

                <button
                  onClick={() => navigate('/reset-password')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition mb-3"
                >
                  Enter Reset Code
                </button>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Didn't receive it? Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
