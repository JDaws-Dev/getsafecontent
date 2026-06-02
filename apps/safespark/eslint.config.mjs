import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Added 2026-05-29 — agent worktrees contain duplicate copies of
    // convex/ + src/ that were producing ~35+ false errors.
    ".claude/worktrees/**",
    ".vercel/**",
  ]),
]);

export default eslintConfig;
