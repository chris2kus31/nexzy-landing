// ============================================
// FILE: app/layout.tsx
// Complete layout with Google Analytics
// ============================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import React from "react";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Better font loading performance
});

export const metadata: Metadata = {
  title: "Nexzy - AI-Powered Gaming Assistant",
  description:
    "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
  keywords:
    "gaming assistant, AI gaming help, game walkthrough, gaming rewards, game library tracker",
  authors: [{ name: "Nexzy" }],
  creator: "Nexzy",
  publisher: "Nexzy",
  metadataBase: new URL("https://landing.nexzyapp.com"),
  openGraph: {
    title: "Nexzy - AI-Powered Gaming Assistant",
    description:
      "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
    url: "https://landing.nexzyapp.com",
    siteName: "Nexzy",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Nexzy Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexzy - AI-Powered Gaming Assistant",
    description:
      "Never get stuck in a game again with your AI gaming assistant",
    images: ["/android-chrome-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      {
        rel: "manifest",
        url: "/site.webmanifest",
      },
    ],
  },
  verification: {
    // Add these when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#1a1f3a" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
