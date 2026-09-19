import { NextResponse } from "next/server";

// Public, unauthenticated proxy for the active announcement banner. The site
// banner (a client component) calls this after hydration, so pages stay
// static/ISR and scrapers that don't run JS never hit it. Returns the banner
// object or null.
const API_BASE_URL = process.env.API_BASE_URL || "https://api.nexzy.app";
const API_SECRET_KEY = process.env.API_SECRET_KEY;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE_URL}/announcements/active`, {
      headers: { "X-API-Key": API_SECRET_KEY ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json(null);
    const text = await res.text();
    return NextResponse.json(text ? JSON.parse(text) : null);
  } catch {
    return NextResponse.json(null);
  }
}
