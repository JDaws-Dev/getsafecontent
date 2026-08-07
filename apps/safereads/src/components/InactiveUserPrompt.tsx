"use client";

import Link from "next/link";
import { BookOpen, LogOut, Sparkles, Heart, Infinity, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface InactiveUserPromptProps {
  user: {
    email?: string | null;
    name?: string | null;
  } | null;
}

/**
 * InactiveUserPrompt - Shown to users who have a Safe Family account
 * but aren't entitled to SafeReads specifically.
 *
 * This is different from the trial-expired UpgradePrompt:
 * - Trial expired: User had access, it ended
 * - Inactive: User has credentials but never had this app
 */
export function InactiveUserPrompt({ user }: InactiveUserPromptProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const upgradeUrl = `https://getsafefamily.com/account?upgrade=safereads&email=${encodeURIComponent(user?.email || "")}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-brand-cream-2">
          {/* Welcome Banner */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-accent-600 to-accent-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen className="w-10 h-10 text-white" />
            </div>

            <h1 className="font-display text-2xl font-bold text-brand-navy mb-2">
              Welcome to SafeReads!
            </h1>
            <p className="text-ink-600">
              You have a Safe Family account, but SafeReads isn't part of your current plan.
            </p>
          </div>

          {/* Current account info */}
          {user?.email && (
            <div className="bg-brand-cream rounded-lg p-4 mb-6 border border-brand-cream-2">
              <p className="text-sm text-ink-600 text-center">
                Logged in as <strong className="text-brand-navy">{user.email}</strong>
              </p>
            </div>
          )}

          {/* Features preview */}
          <div className="bg-gradient-to-br from-brand-cream to-brand-cream-2 rounded-2xl p-6 mb-6 border border-brand-cream-2">
            <h3 className="font-semibold text-brand-navy mb-3 text-center flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-700" />
              What you'll get with SafeReads:
            </h3>
            <ul className="space-y-2">
              {[
                { icon: BookOpen, text: "AI-powered book content analysis" },
                { icon: Infinity, text: "Unlimited book reviews" },
                { icon: Heart, text: "Content flags for sensitive themes" },
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-ink-700">
                  <feature.icon className="w-4 h-4 text-accent-700 flex-shrink-0" />
                  {feature.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="text-center mb-6">
            <div className="inline-flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold text-brand-navy">$4.99</span>
              <span className="text-ink-500">/month</span>
            </div>
            <p className="text-sm text-accent-700 font-medium mt-1">
              Or save with the Safe Family bundle!
            </p>
          </div>

          {/* CTA Button */}
          <a
            href={upgradeUrl}
            className="btn-brand flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-lg transition shadow-lg mb-4"
          >
            Upgrade Now
            <ArrowRight className="w-5 h-5" />
          </a>

          {/* Use different account */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full bg-brand-cream-2 hover:bg-brand-cream text-ink-700 py-3 rounded-xl font-semibold text-center transition"
          >
            <LogOut className="w-4 h-4" />
            Use a Different Account
          </button>

          {/* Support link */}
          <div className="text-center mt-6 text-sm text-ink-500">
            Questions?{" "}
            <Link href="/contact" className="text-accent-700 hover:text-accent-800 font-medium">
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
