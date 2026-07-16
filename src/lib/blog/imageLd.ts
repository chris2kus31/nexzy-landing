import type { PublicPost } from "./api";

/**
 * Schema.org ImageObject for a post's hero — richer than a bare URL: carries the
 * alt as `caption` and the attribution as `creditText`, which is what Google's
 * image guidelines want. Returns undefined when there's no image so callers can
 * spread it into JSON-LD as `image: imageObjectLd(post)`.
 */
export function imageObjectLd(
  post: Pick<PublicPost, "heroImageUrl" | "imageAlt" | "imageCredit" | "title">,
) {
  if (!post.heroImageUrl) return undefined;
  return [
    {
      "@type": "ImageObject",
      url: post.heroImageUrl,
      caption: post.imageAlt || post.title,
      ...(post.imageCredit ? { creditText: post.imageCredit } : {}),
    },
  ];
}
