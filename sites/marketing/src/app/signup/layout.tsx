import type { Metadata } from "next";

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = {
  title: "Start your free trial",
  description: "Create your Safe Family account: SafeTunes, SafeTube and SafeStudy with a 7-day free trial.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
