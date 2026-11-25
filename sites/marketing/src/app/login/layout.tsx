import type { Metadata } from "next";

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = {
  title: "Parent sign in",
  description: "Sign in to your Safe Family parent dashboard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
