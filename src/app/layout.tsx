// ============================================
// FILE: app/layout.tsx
// Complete layout with Google Analytics
// ============================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Clarity from "@/components/Clarity";
import React from "react";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/storeUrls";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Better font loading performance
});

// Set NEXT_PUBLIC_SITE_URL in your env to your canonical root domain
// (e.g. https://nexzy.app). Falls back to the current subdomain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

export const metadata: Metadata = {
  // Title LEADS with the newsroom identity (what the web IS — a content site)
  // and keeps the keywords the newsroom actually earns (news, guides,
  // walkthroughs). The app-feature keywords live in the App Store listing, not
  // here — the web is the newsroom; the app is where you make it yours.
  title: "Nexzy — Gaming News, Guides & Walkthroughs",
  description:
    "Nexzy is the independent gaming newsroom — news, guides, and walkthroughs for the games you play, updated all day. Get the app to make it yours: track the games you play, get updates tuned to you, and Ask Nexzy when you're stuck.",
  keywords:
    "gaming news, video game guides, game walkthroughs, how to beat, game news site, gaming news today, game lists, AI game assistant",
  authors: [{ name: "Nexzy" }],
  creator: "Nexzy",
  publisher: "Nexzy",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nexzy — Gaming News, Guides & Walkthroughs",
    description:
      "The independent gaming newsroom — news, guides, and walkthroughs for the games you play. Get the app to make it yours.",
    url: SITE_URL,
    siteName: "Nexzy",
    // og:image is generated automatically by app/opengraph-image.tsx (1200x630)
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexzy — Gaming News, Guides & Walkthroughs",
    description:
      "The independent gaming newsroom for the games you play. Get the app to make it yours.",
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
      description:
        "Nexzy is an independent gaming newsroom — game news, guides, and walkthroughs for the games you play — paired with a companion app that makes it yours, including an AI assistant (Ask Nexzy) to help you beat any game. For players of every age.",
      foundingDate: "2026-06",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [APP_STORE_URL, GOOGLE_PLAY_URL],
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
        <Clarity />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
