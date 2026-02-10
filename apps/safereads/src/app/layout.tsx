import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getsafereads.com"),
  title: {
    default: "SafeReads",
    template: "%s — SafeReads",
  },
  description:
    "AI-powered book content reviews for parents. Search books, get objective content reviews to make informed decisions.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SafeReads",
    description:
      "Know what's in the book before your kid reads it. AI-powered content reviews for parents.",
    url: "https://getsafereads.com",
    siteName: "SafeReads",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeReads",
    description:
      "Know what's in the book before your kid reads it. AI-powered content reviews for parents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body className={`${inter.variable} ${libreBaskerville.variable} font-sans antialiased`}>
          <ConvexClientProvider>
            <Navbar />
            <main className="pb-20 sm:pb-0">{children}</main>
            <BottomNav />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
