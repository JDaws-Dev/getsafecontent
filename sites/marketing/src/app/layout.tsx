import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// Initialize Sentry on the client side
import "../../sentry.client.config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Safe Family — SafeTunes, SafeTube, SafeReads",
    template: "%s | Safe Family",
  },
  description:
    "Three apps that let you approve every song, video, and book before your kids see it. Get all 3 for $9.99/month.",
  keywords: [
    "parental controls",
    "safe content",
    "kids",
    "family",
    "music",
    "youtube",
    "books",
    "SafeTunes",
    "SafeTube",
    "SafeReads",
  ],
  authors: [{ name: "Safe Family" }],
  creator: "Safe Family",
  publisher: "Safe Family",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Safe Family — Music, Video, Books. All Parent-Approved.",
    description:
      "Three apps that let you approve every song, video, and book before your kids see it. Get all 3 for $9.99/month.",
    url: siteUrl,
    siteName: "Safe Family",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Safe Family - Parent-approved content for your kids",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safe Family — Music, Video, Books. All Parent-Approved.",
    description:
      "Three apps that let you approve every song, video, and book before your kids see it. Get all 3 for $9.99/month.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  verification: {
    google: "m0SyxtsEhTIrJ7KGMXJjThIC1MTRLeEgvHP-YNx1AhE",
  },
  other: {
    "theme-color": "#4F46E5",
    "p:domain_verify": "0c626a8d2f5246656e2e45a968e60c60",
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
        <body
          className={`${inter.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <ConvexClientProvider>
              {children}
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
