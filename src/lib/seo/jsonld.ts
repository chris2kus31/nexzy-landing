// Serialize JSON-LD for embedding in a <script> tag. JSON.stringify alone is
// NOT safe for inline HTML: a value containing "</script>" closes the tag and
// executes attacker-controlled markup (our titles/descriptions flow in from
// RSS sources, the AI newsroom, and IGDB/RAWG). Escaping "<" as < is
// byte-safe inside a script tag and parses back to the identical JSON, so
// Google reads exactly the same structured data.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
