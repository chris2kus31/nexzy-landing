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

// Set NEXT_PUBLIC_SITE_URL in your env to your canonical root domain
// (e.g. https://nexzy.app). Falls back to the current subdomain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  title: "Nexzy - AI-Powered Gaming Assistant",
  description:
    "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
  keywords:
    "gaming assistant, AI gaming help, game walkthrough, gaming rewards, game library tracker",
  authors: [{ name: "Nexzy" }],
  creator: "Nexzy",
  publisher: "Nexzy",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nexzy - AI-Powered Gaming Assistant",
    description:
      "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
    url: SITE_URL,
    siteName: "Nexzy",
    // og:image is generated automatically by app/opengraph-image.tsx (1200x630)
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexzy - AI-Powered Gaming Assistant",
    description:
      "Never get stuck in a game again with your AI gaming assistant",
    // twitter:image is generated automatically by app/twitter-image.tsx
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
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION (from Google Search Console)
  // to verify ownership and unlock organic search reporting.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// Site-wide entity graph: helps Google (and AI answer engines) understand who
// publishes Nexzy News and enables the sitelinks search box.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Nexzy",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Nexzy",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
