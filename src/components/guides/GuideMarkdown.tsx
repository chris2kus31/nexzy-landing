"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NextLink from "next/link";
import { Heading, Text, Link, Box, Image } from "@chakra-ui/react";

/**
 * GUIDE-ONLY markdown renderer. A separate component from the shared
 * `Markdown` (news/blog) on purpose: guides can restyle freely — numbered-step
 * pills, framed screenshot figures, the Nexzy brand palette — with zero risk to
 * any other beat. News/blog keep using `components/blog/Markdown`.
 */

// Only ever strip the guide writer's exact unfilled marker (with the camera).
const SHOT_MARKER_LINE = /^>[ \t]*📷[ \t]*SHOT:.*$/gim;
function stripUnfilledShotMarkers(md: string): string {
  if (!md.includes("📷")) return md;
  return md.replace(SHOT_MARKER_LINE, "").replace(/\n{3,}/g, "\n\n");
}

export default function GuideMarkdown({ children }: { children: string }) {
  return (
    <Box color="gray.200" fontSize="lg" lineHeight="1.8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <Heading
              as="h2"
              fontFamily="heading"
              size="xl"
              color="white"
              mt={9}
              mb={3}
            >
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
          strong: ({ children }) => (
            <Text as="strong" color="white" fontWeight="700">
              {children}
            </Text>
          ),
          em: ({ children }) => <Text as="em">{children}</Text>,
          ul: ({ children }) => (
            <Box
              as="ul"
              pl={6}
              mb={4}
              css={{ "& > li": { listStyleType: "disc" } }}
            >
              {children}
            </Box>
          ),
          // Numbered steps as pills — the counter lives on the <ol> and targets
          // only its DIRECT <li> children, so nested bullets stay plain.
          ol: ({ children }) => (
            <Box
              as="ol"
              m={0}
              mb={4}
              p={0}
              listStyleType="none"
              css={{
                counterReset: "gstep",
                "& > li": {
                  position: "relative",
                  paddingLeft: "48px",
                  minHeight: "32px",
                  counterIncrement: "gstep",
                },
                "& > li::before": {
                  content: "counter(gstep)",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  color: "#4DA3FF",
                  background: "rgba(0,123,255,0.14)",
                  border: "1px solid rgba(0,123,255,0.34)",
                },
              }}
            >
              {children}
            </Box>
          ),
          li: ({ children }) => (
            <Box as="li" mb={3.5} lineHeight="1.7">
              {children}
            </Box>
          ),
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
                  borderRadius="xl"
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
                    fontStyle="italic"
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
