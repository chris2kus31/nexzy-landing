import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import type { ArticleImage } from "@/lib/blog/api";

/**
 * The article IMAGE gallery — a responsive photo strip rendered from a post's
 * `images`. Its OWN component, wholly separate from MediaGallery (videos) and the
 * Rewind screenshot rail. Renders nothing when there are no images, so text-only
 * and legacy articles are completely unchanged. Uses a plain <img> (not
 * next/image) because pasted URLs can be any host; uploaded images are already
 * AVIF-optimized on our S3, and alt text is emitted for accessibility + image SEO.
 */
export default function ArticleGallery({
  images,
}: {
  images?: ArticleImage[] | null;
}) {
  const ordered = [...(images || [])]
    .filter((im) => im?.url)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (ordered.length === 0) return null;

  return (
    <Box as="section" my={10}>
      <SimpleGrid columns={{ base: 1, sm: ordered.length > 1 ? 2 : 1 }} gap={4}>
        {ordered.map((im, i) => (
          <Box as="figure" key={`${im.url}-${i}`} m={0}>
            <Box borderRadius="lg" overflow="hidden" bg="blackAlpha.400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={im.url}
                alt={im.alt ?? ""}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>
            {(im.caption || im.credit) && (
              <Text as="figcaption" fontSize="xs" color="gray.400" mt={2}>
                {im.caption}
                {im.caption && im.credit ? " · " : ""}
                {im.credit && (
                  <Text as="span" color="gray.500">
                    {im.credit}
                  </Text>
                )}
              </Text>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
