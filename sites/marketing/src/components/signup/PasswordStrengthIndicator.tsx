"use client";

/**
 * Password Strength Indicator Component
 *
 * Displays real-time password strength feedback as users type.
 * Shows a visual progress bar, character count, and requirement checklist.
 */

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export default function PasswordStrengthIndicator({
  password,
  className = "",
}: PasswordStrengthIndicatorProps) {
  const length = password.length;

  // Password requirements
  const requirements = [
    { label: "At least 8 characters", met: length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;

  // Calculate strength level (0-4)
  const getStrengthLevel = () => {
    if (length === 0) return 0;
    if (length < 8) return 1;
    if (metCount <= 2) return 2;
    if (metCount === 3) return 3;
    return 4;
  };

  const strengthLevel = getStrengthLevel();

  // Strength labels and colors
  const strengthConfig: Record<
    number,
    { label: string; color: string; textColor: string }
  > = {
    0: { label: "", color: "bg-gray-200", textColor: "text-gray-400" },
    1: { label: "Weak", color: "bg-red-500", textColor: "text-red-600" },
    2: { label: "Fair", color: "bg-orange-500", textColor: "text-orange-600" },
    3: { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-600" },
    4: { label: "Strong", color: "bg-green-500", textColor: "text-green-600" },
  };

  const { label, color, textColor } = strengthConfig[strengthLevel];
  const progressWidth = length === 0 ? 0 : (strengthLevel / 4) * 100;

  // Don't show anything if password is empty
  if (length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-2 space-y-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Password strength: ${label || "empty"}`}
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={strengthLevel}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label="Password strength meter"
        >
          <div
            className={`h-full ${color} transition-all duration-300 ease-out`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        {label && (
          <span className={`text-xs font-medium ${textColor} min-w-[50px]`}>
            {label}
          </span>
        )}
      </div>

      {/* Character count */}
      <div className="text-xs text-gray-500">
        {length} character{length !== 1 ? "s" : ""}
        {length < 8 && (
          <span className="text-gray-400"> (need {8 - length} more)</span>
        )}
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1" aria-label="Password requirements">
        {requirements.map((req, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-xs"
            aria-label={`${req.label}: ${req.met ? "met" : "not met"}`}
          >
            {req.met ? (
              <svg
                className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-gray-300 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
              </svg>
            )}
            <span className={req.met ? "text-gray-600" : "text-gray-400"}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
