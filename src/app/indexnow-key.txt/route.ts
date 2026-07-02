// Serves the IndexNow key for ownership verification. IndexNow requires the key
// to be retrievable on the host; we point keyLocation here from the ping.
import { indexNowKey } from "@/lib/seo/indexnow";

export const dynamic = "force-static";

export function GET(): Response {
  const key = indexNowKey() || "";
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
