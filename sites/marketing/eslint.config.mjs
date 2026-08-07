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
    // Added 2026-05-29 — Vercel build artifacts and agent worktrees
    // were producing ~2,300 false warnings (minified JS in
    // .vercel/output, duplicate src trees in .claude/worktrees).
    ".vercel/**",
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
