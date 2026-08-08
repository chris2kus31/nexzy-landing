/**
 * The public URL PATH prefix for a post by its content type — one source of
 * truth so a typed post never gets a dead /blog/<slug> link. Mirrors the API's
 * publicPathForType (nexzy-api/src/newsroom/newsroom.constants.ts).
 *
 * guide → /guides, list → /lists, walkthrough → /walkthroughs,
 * review → /reviews, everything else → /blog.
 */
export function publicPathForType(type?: string | null): string {
  switch (type) {
    case "guide":
      return "/guides";
    case "list":
      return "/lists";
    case "walkthrough":
      return "/walkthroughs";
    case "review":
      return "/reviews";
    case "rewind":
      return "/rewind";
    default:
      return "/blog";
  }
}
