// ============================================
// FILE: app/layout.tsx
// Complete layout with Google Analytics
// ============================================
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexzy - AI-Powered Gaming Assistant",
  description:
    "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
  openGraph: {
    title: "Nexzy - AI-Powered Gaming Assistant",
    description:
      "Never get stuck in a game again. Your personal AI gaming assistant helps you beat any level, find hidden secrets, and earn rewards daily.",
    url: "https://landing.nexzyapp.com",
    siteName: "Nexzy",
    images: [
      {
        url: "/NexzyLogo.png",
        width: 1200,
        height: 630,
        alt: "Nexzy Logo",
      },
    ],
    locale: "en_US",
    type: "website",
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/NexzyLogo.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
