"use client";

import { useState, useRef, FormEvent } from "react";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";

export type AppSelection = {
  safetunes: boolean;
  safetube: boolean;
  safereads: boolean;
};

export type AccountFormData = {
  name: string;
  email: string;
  password: string;
  couponCode?: string;
};

interface AccountFormProps {
  /** Selected apps from AppSelector */
  selectedApps: AppSelection;
  /** Monthly price to display */
  monthlyPrice: number;
  /** Callback when form is submitted with email/password */
  onSubmit: (data: AccountFormData) => Promise<void>;
  /** Callback when Google sign-in is clicked */
  onGoogleSignIn: () => Promise<void>;
  /** External error message to display */
  error?: string;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Whether to show promo code field */
  showPromoCode?: boolean;
  /** Lifetime promo codes that unlock free access */
  lifetimeCodes?: string[];
}

const APP_LABELS: Record<keyof AppSelection, string> = {
  safetunes: "SafeTunes",
  safetube: "SafeTube",
  safereads: "SafeReads",
};

export default function AccountForm({
  selectedApps,
  monthlyPrice,
  onSubmit,
  onGoogleSignIn,
  error: externalError,
  isLoading = false,
  showPromoCode = true,
  lifetimeCodes = ["DAWSFRIEND", "DEWITT"],
}: AccountFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    couponCode: "",
  });
  const [localError, setLocalError] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCouponField, setShowCouponField] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Refs for accessibility - focus management on errors
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Check if entered coupon is a valid lifetime code
  const couponTrimmed = formData.couponCode.trim().toUpperCase();
  const isLifetimeCode = lifetimeCodes.includes(couponTrimmed);
  const hasInvalidCode = couponTrimmed.length > 0 && !isLifetimeCode;

  // Get selected app names for display
  const selectedAppNames = Object.entries(selectedApps)
    .filter(([_, selected]) => selected)
    .map(([key]) => APP_LABELS[key as keyof AppSelection]);

  const error = externalError || localError;
  const loading = isLoading || googleLoading || submitLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value,
    };
    setFormData(newFormData);

    // Clear local error when user starts typing
    if (localError) {
      setLocalError("");
    }

    // Real-time password mismatch validation
    if (name === "password" || name === "confirmPassword") {
      const password = name === "password" ? value : newFormData.password;
      const confirmPassword =
        name === "confirmPassword" ? value : newFormData.confirmPassword;
      // Only show mismatch if confirm field has content
      setPasswordMismatch(
        confirmPassword.length > 0 && password !== confirmPassword
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (formData.password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      passwordInputRef.current?.focus();
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match");
      confirmPasswordInputRef.current?.focus();
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        couponCode: formData.couponCode || undefined,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      if (message.includes("already exists") || message.includes("registered")) {
        setLocalError("This email is already registered. Please log in instead.");
        emailInputRef.current?.focus();
      } else {
        setLocalError(message);
      }
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLocalError("");

    try {
      await onGoogleSignIn();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-up failed. Please try again.";
      setLocalError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="card-soft p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-navy mb-2">
          {isLifetimeCode ? "Get Lifetime Access" : "Start Your Free Trial"}
        </h1>
        <p className="text-navy/60">
          {isLifetimeCode
            ? "Your code unlocks free access forever!"
            : "7 days free. No credit card required."}
        </p>
      </div>

      {/* Selected apps summary */}
      {selectedAppNames.length > 0 && (
        <div className="bg-cream rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {selectedAppNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-white text-sm font-medium text-navy shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-navy">
                ${monthlyPrice.toFixed(2)}/mo
              </div>
              <div className="text-xs text-navy/50">after trial</div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          id="form-error"
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
        >
          {error}
        </div>
      )}

      {/* Google Sign Up Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full min-h-[48px] flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {googleLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {googleLoading ? "Creating account..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            or sign up with email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-peach-start focus:border-transparent text-lg"
            placeholder="Sarah"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            ref={emailInputRef}
            type="email"
            id="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            aria-invalid={
              error?.includes("email") || error?.includes("registered")
                ? "true"
                : undefined
            }
            aria-describedby={
              error?.includes("email") || error?.includes("registered")
                ? "form-error"
                : undefined
            }
            className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-peach-start focus:border-transparent text-lg"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Create Password
          </label>
          <div className="relative">
            <input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              aria-invalid={
                error?.includes("Password") && error?.includes("8")
                  ? "true"
                  : undefined
              }
              aria-describedby={
                error?.includes("Password") && error?.includes("8")
                  ? "form-error"
                  : undefined
              }
              className="w-full min-h-[44px] px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-peach-start focus:border-transparent text-lg"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          <PasswordStrengthIndicator password={formData.password} />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm Password
          </label>
          <input
            ref={confirmPasswordInputRef}
            type={showPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={formData.confirmPassword}
            onChange={handleChange}
            aria-invalid={
              passwordMismatch || error?.includes("match") ? "true" : undefined
            }
            aria-describedby={
              passwordMismatch
                ? "password-mismatch-error"
                : error?.includes("match")
                  ? "form-error"
                  : undefined
            }
            className={`w-full min-h-[44px] px-4 py-3 border rounded-lg focus:ring-2 focus:ring-peach-start focus:border-transparent text-lg ${
              passwordMismatch ? "border-red-300 bg-red-50" : "border-gray-300"
            }`}
            placeholder="Confirm your password"
          />
          {passwordMismatch && (
            <p
              id="password-mismatch-error"
              role="alert"
              className="mt-1 text-sm text-red-600"
            >
              Passwords do not match
            </p>
          )}
        </div>

        {/* Promo code section */}
        {showPromoCode &&
          (!showCouponField ? (
            <button
              type="button"
              onClick={() => setShowCouponField(true)}
              className="text-sm text-peach-start hover:text-peach-end font-medium"
            >
              Have a promo code?
            </button>
          ) : (
            <div>
              <label
                htmlFor="couponCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Promo Code
              </label>
              <input
                type="text"
                id="couponCode"
                name="couponCode"
                value={formData.couponCode}
                onChange={handleChange}
                className={`w-full min-h-[44px] px-4 py-3 border rounded-lg focus:ring-2 focus:ring-peach-start focus:border-transparent text-lg uppercase ${
                  isLifetimeCode
                    ? "border-green-500 bg-green-50"
                    : hasInvalidCode
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                }`}
                placeholder="Enter code"
              />
              {isLifetimeCode && (
                <div className="mt-2 flex items-center gap-2 text-green-600">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Lifetime access unlocked!</span>
                </div>
              )}
              {hasInvalidCode && (
                <div className="mt-2 flex items-center gap-2 text-red-600">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">
                    Invalid code - you&apos;ll start with a 7-day trial
                  </span>
                </div>
              )}
            </div>
          ))}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full min-h-[48px] text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 ${
            isLifetimeCode ? "bg-green-600 hover:bg-green-700" : "btn-peach"
          }`}
        >
          {submitLoading
            ? "Creating Account..."
            : isLifetimeCode
              ? "Get Lifetime Access"
              : "Start Free Trial"}
        </button>
      </form>

      {/* Trust signals */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg
            className="w-4 h-4 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          No credit card
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="w-4 h-4 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Cancel anytime
        </span>
      </div>

      {/* Login link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-peach-start hover:text-peach-end font-medium"
          >
            Sign in
          </a>
        </p>
      </div>

      {/* Terms */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          By signing up, you agree to our{" "}
          <a
            href="https://getsafetunes.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-peach-start hover:text-peach-end"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="https://getsafetunes.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-peach-start hover:text-peach-end"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
