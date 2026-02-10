"use client";

import Link from "next/link";
import { Shield, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-navy">Safe Family</span>
      </Link>

      {/* 404 */}
      <div className="text-center">
        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-navy mb-4">
          Page not found
        </h2>
        <p className="text-lg text-navy/60 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="btn-peach inline-flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-navy/20 text-navy rounded-full font-medium hover:bg-navy/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-navy/40">
          Need help?{" "}
          <a
            href="mailto:jeremiah@getsafefamily.com"
            className="text-indigo-600 hover:text-indigo-700"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
