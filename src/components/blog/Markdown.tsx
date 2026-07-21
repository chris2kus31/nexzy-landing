import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NextLink from "next/link";
import { Heading, Text, Link, List, Box, Image } from "@chakra-ui/react";

/**
 * Unfilled guide screenshot markers (`> 📷 SHOT: ...`) — placeholders the guide
 * writer leaves for a human to fill in the admin. If one is still unfilled at
 * render time we drop the whole line so a forgotten marker never ships to a
 * reader (the admin screen is where they get filled).
 */
// Deliberately requires the 📷 — this component is shared by every beat (news,
// lists, guides, walkthroughs), so we only ever strip the guide writer's exact
// marker, never an ordinary "> SHOT:" blockquote a news article might contain.
const SHOT_MARKER_LINE = /^>[ \t]*📷[ \t]*SHOT:.*$/gim;
function stripUnfilledShotMarkers(md: string): string {
  if (!md.includes("📷")) return md;
  return md.replace(SHOT_MARKER_LINE, "").replace(/\n{3,}/g, "\n\n");
}

/**
 * Renders article markdown into themed Chakra elements (server-rendered for
 * SEO). Raw HTML in markdown is ignored by react-markdown by default, so this
 * is XSS-safe.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <Box color="gray.200" lineHeight="1.8" fontSize="lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <Heading as="h1" size="2xl" color="white" mt={8} mb={4}>
              {children}
            </Heading>
          ),
          h2: ({ children }) => (
            <Heading as="h2" size="xl" color="white" mt={8} mb={3}>
              {children}
            </Heading>
          ),
          h3: ({ children }) => (
            <Heading as="h3" size="lg" color="white" mt={6} mb={2}>
              {children}
            </Heading>
          ),
          p: ({ children }) => <Text mb={4}>{children}</Text>,
          a: ({ href, children }) => {
            // Internal links (/blog/...) navigate in-tab via Next's router;
            // external links open in a new tab.
            const isInternal = typeof href === "string" && href.startsWith("/");
            if (isInternal) {
              return (
                <Link
                  asChild
                  color="nexzy.lightBlue"
                  textDecoration="underline"
                >
                  <NextLink href={href}>{children}</NextLink>
                </Link>
              );
            }
            return (
              <Link
                href={href}
                color="nexzy.lightBlue"
                textDecoration="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </Link>
            );
          },
          ul: ({ children }) => (
            <List.Root mb={4} pl={6}>
              {children}
            </List.Root>
          ),
          ol: ({ children }) => (
            <List.Root as="ol" mb={4} pl={6}>
              {children}
            </List.Root>
          ),
          li: ({ children }) => <List.Item mb={2}>{children}</List.Item>,
          strong: ({ children }) => (
            <Text as="strong" color="white" fontWeight="700">
              {children}
            </Text>
          ),
          em: ({ children }) => <Text as="em">{children}</Text>,
          blockquote: ({ children }) => (
            <Box
              borderLeft="3px solid"
              borderColor="nexzy.blue"
              pl={4}
              my={4}
              color="gray.300"
              fontStyle="italic"
            >
              {children}
            </Box>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              <Box as="figure" my={6}>
                <Image
                  src={src}
                  alt={alt || ""}
                  w="full"
                  maxH="560px"
                  objectFit="contain"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  bg="blackAlpha.400"
                  loading="lazy"
                />
                {alt ? (
                  <Text
                    as="figcaption"
                    fontSize="sm"
                    color="gray.400"
                    textAlign="center"
                    mt={2}
                  >
                    {alt}
                  </Text>
                ) : null}
              </Box>
            ) : null,
        }}
      >
        {stripUnfilledShotMarkers(children)}
      </ReactMarkdown>
    </Box>
  );
}
