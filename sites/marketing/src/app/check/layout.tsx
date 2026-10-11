import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Device check | Safe Family",
  robots: { index: false, follow: false },
};

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
