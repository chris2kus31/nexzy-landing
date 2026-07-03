// Author personas for E-E-A-T: named bylines, bio pages, and Person schema.
// The API stores the display name ("Chuy" / "Eli") on each article; we resolve
// it to the full persona here. Drop headshots at /public/authors/<slug>.jpg and
// set `avatar` to that path — until then the byline shows a clean initials chip.

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar: string | null; // e.g. "/authors/chuy.jpg" once you add the headshot
  x?: string | null; // full profile URLs, used for sameAs in schema
  instagram?: string | null;
}

export const AUTHORS: Record<string, Author> = {
  chuy: {
    slug: "chuy",
    name: "Chuy",
    role: "Senior Staff Writer",
    bio: "Chuy covers the big beats for Nexzy — game news, console hardware, and patch notes. He's been playing, breaking, and writing about games for over a decade.",
    avatar: "/authors/chuy.jpg",
    x: null,
    instagram: null,
  },
  eli: {
    slug: "eli",
    name: "Eli",
    role: "Senior Staff Writer",
    bio: "Eli covers the culture side of gaming for Nexzy — game adaptations on screen, the best deals worth your money, and reviews. She's a lifelong fan with a soft spot for a good bargain, a bad movie, and calling hype exactly what it is.",
    avatar: "/authors/eli.jpg",
    x: null,
    instagram: null,
  },
};

/** Resolve a stored byline (display name) to a persona; null if not a named author. */
export function getAuthorByName(
  name: string | null | undefined,
): Author | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return AUTHORS[key] ?? null;
}

/** Persona by slug (for /author/[slug] pages). */
export function getAuthorBySlug(slug: string): Author | null {
  return AUTHORS[slug.toLowerCase()] ?? null;
}

/** Initials for the fallback avatar chip. */
export function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
