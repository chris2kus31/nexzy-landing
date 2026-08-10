// Base /api/comments route — handles comment CREATE (POST with no sub-path),
// which the [...path] catch-all can't match (it requires ≥1 path segment).
// Forwards to nexzy-api POST /comments, injecting the reader's cookie token.
import { NextRequest, NextResponse } from "next/server";
import { USER_API_URL, USER_AT_COOKIE, clientIp } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(USER_AT_COOKIE)?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": clientIp(req),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body = await req.text();

  let apiRes: Response;
  try {
    apiRes = await fetch(`${USER_API_URL}/comments`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the comments API" },
      { status: 502 },
    );
  }

  const text = await apiRes.text();
  return new NextResponse(text, {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
