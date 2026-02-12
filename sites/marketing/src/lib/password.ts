/**
 * Password hashing utilities for Safe Family
 *
 * Uses Scrypt from lucia package to match Convex Auth's Password provider.
 * This ensures password hashes are compatible across the central auth system
 * and individual apps.
 *
 * IMPORTANT: Must use the same hashing algorithm as @convex-dev/auth
 */

import { Scrypt } from "lucia";

// Create a singleton instance for reuse
const scrypt = new Scrypt();

/**
 * Hash a password using Scrypt
 *
 * @param password - Plain text password
 * @returns Promise<string> - Scrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  return scrypt.hash(password);
}

/**
 * Verify a password against a Scrypt hash
 *
 * @param hash - Scrypt hash from database
 * @param password - Plain text password to verify
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return scrypt.verify(hash, password);
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Object with valid boolean and optional error message
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  // Additional strength checks could be added here:
  // - Has uppercase
  // - Has lowercase
  // - Has number
  // - Has special character

  return { valid: true };
}
