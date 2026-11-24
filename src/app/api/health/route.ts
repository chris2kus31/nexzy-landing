// Liveness check for the EC2 load balancer and deploy.sh. No DB or API calls:
// it only proves the Next server is up and answering.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
