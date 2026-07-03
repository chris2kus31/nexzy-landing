import NextLink from "next/link";
import { Flex, Button, Text } from "@chakra-ui/react";

/**
 * Simple server-rendered, SEO-friendly pagination (?page=N) — Prev / Next plus
 * a "Page X of Y" indicator. No infinite scroll: each page is its own crawlable
 * URL. Renders nothing when there's only one page.
 */
export default function Pager({
  basePath,
  page,
  total,
  pageSize,
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <Flex align="center" justify="center" gap={4} mt={10}>
      <Button
        asChild={hasPrev}
        size="sm"
        variant="outline"
        color="nexzy.white"
        borderColor="whiteAlpha.300"
        _hover={{ bg: "whiteAlpha.100" }}
        disabled={!hasPrev}
      >
        {hasPrev ? (
          <NextLink href={href(page - 1)} rel="prev">
            ← Newer
          </NextLink>
        ) : (
          <span>← Newer</span>
        )}
      </Button>

      <Text color="gray.400" fontSize="sm">
        Page {page} of {totalPages}
      </Text>

      <Button
        asChild={hasNext}
        size="sm"
        variant="outline"
        color="nexzy.white"
        borderColor="whiteAlpha.300"
        _hover={{ bg: "whiteAlpha.100" }}
        disabled={!hasNext}
      >
        {hasNext ? (
          <NextLink href={href(page + 1)} rel="next">
            Older →
          </NextLink>
        ) : (
          <span>Older →</span>
        )}
      </Button>
    </Flex>
  );
}
