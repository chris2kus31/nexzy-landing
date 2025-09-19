import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexzy - Talk Easily, Organized and Fast",
  description:
    "Stay connected with people from all over the world with Nexzy app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
