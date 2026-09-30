// ============================================
// FILE: app/delete-account/page.tsx
// Account deletion instructions. This is the "Delete account URL" and
// "Delete data URL" on the Google Play Data safety form, so it must name the
// app, show the steps, and say what is deleted or kept (Play policy).
// Steps mirror the mobile flow: Settings > Delete Account > emailed 6-digit
// code (15 min) > Delete My Account. What is deleted/kept mirrors
// nexzy-api AuthService.deleteAccount.
// ============================================
import type { Metadata } from "next";
import DeleteAccountContent from "./DeleteAccountContent";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexzyapp.com";

const TITLE = "Delete your Nexzy account";
const DESCRIPTION =
  "How to delete your Nexzy account and data, in the app or by email, and what is deleted or kept.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/delete-account" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/delete-account`,
    type: "website",
  },
};

export default function DeleteAccountPage() {
  return <DeleteAccountContent />;
}
