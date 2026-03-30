import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [loading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">SafeNet</span>
        </Link>
      </header>

      {/* Signup content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Start your free trial</h1>
          <p className="text-gray-500 text-center mb-8">
            7 days free, then $4.99/month. Cancel anytime.
          </p>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              SafeNet is part of the Safe Family suite. Sign up at our central site to get started with all Safe Family apps.
            </p>
          </div>

          <a
            href="https://getsafefamily.com/signup?app=safenet"
            className="btn-brand w-full min-h-[48px] rounded-lg flex items-center justify-center gap-2 text-center"
          >
            {loading ? 'Redirecting...' : (
              <>
                Continue to Sign Up
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </a>

          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
