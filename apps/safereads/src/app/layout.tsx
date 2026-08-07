import type { Metadata } from "next";
import { Fredoka, Quicksand, Libre_Baskerville } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ClientNavWrapper } from "@/components/ClientNavWrapper";
import "./globals.css";

// Safe Family "glow-up" type system (shared across all 5 apps):
// Quicksand = body, Fredoka = display/headings.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  display: "swap",
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

// Retained for legacy bookish serif accents (parent/marketing surfaces).
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
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${quicksand.variable} ${fredoka.variable} ${libreBaskerville.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ConvexClientProvider>
            <ClientNavWrapper>{children}</ClientNavWrapper>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
