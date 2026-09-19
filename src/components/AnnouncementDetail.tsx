"use client";

// Data-driven renderer for an announcement's detail blocks (heading / paragraph
// / image / bullets / divider / button). Shared by the site detail modal. New
// block types are additive — an unknown block simply renders nothing.
import { Box, Heading, Text, Image, Button, Link } from "@chakra-ui/react";

type Block = { type: string; [k: string]: unknown };

export default function AnnouncementDetail({
  blocks,
  accent,
}: {
  blocks: unknown[];
  accent: string;
}) {
  return (
    <Box>
      {(blocks ?? []).map((raw, i) => {
        const b = raw as Block;
        switch (b.type) {
          case "heading":
            return (
              <Heading
                key={i}
                size="sm"
                color="white"
                mt={i === 0 ? 0 : 5}
                mb={1}
              >
                {String(b.text ?? "")}
              </Heading>
            );
          case "paragraph":
            return (
              <Text
                key={i}
                color="whiteAlpha.800"
                fontSize="sm"
                lineHeight="1.6"
                mt={2}
              >
                {String(b.text ?? "")}
              </Text>
            );
          case "image":
            return b.url ? (
              <Image
                key={i}
                src={String(b.url)}
                alt={String(b.alt ?? "")}
                w="100%"
                borderRadius="lg"
                mt={4}
                objectFit="cover"
                maxH="320px"
              />
            ) : null;
          case "bullets": {
            const items = Array.isArray(b.items) ? (b.items as unknown[]) : [];
            return (
              <Box key={i} mt={3} display="flex" flexDirection="column" gap={2}>
                {items.map((it, j) => (
                  <Box key={j} display="flex" gap={2} alignItems="flex-start">
                    <Box
                      w="6px"
                      h="6px"
                      borderRadius="full"
                      bg={accent}
                      mt="7px"
                      flex="0 0 auto"
                    />
                    <Text color="whiteAlpha.800" fontSize="sm" lineHeight="1.6">
                      {String(it)}
                    </Text>
                  </Box>
                ))}
              </Box>
            );
          }
          case "divider":
            return <Box key={i} h="1px" bg="whiteAlpha.200" my={5} />;
          case "button":
            return b.target ? (
              <Link
                key={i}
                href={String(b.target)}
                _hover={{ textDecoration: "none" }}
                display="block"
                mt={5}
              >
                <Button
                  bg={accent}
                  color="#12152a"
                  fontWeight="600"
                  _hover={{ opacity: 0.9 }}
                  w="100%"
                >
                  {String(b.label ?? "Open")}
                </Button>
              </Link>
            ) : null;
          default:
            return null;
        }
      })}
    </Box>
  );
}
