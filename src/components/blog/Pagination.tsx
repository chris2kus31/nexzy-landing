import NextLink from "next/link";
import { HStack, Button } from "@chakra-ui/react";

function href(page: number, beat: string, q: string): string {
  const params = new URLSearchParams();
  if (beat && beat !== "all") params.set("beat", beat);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

/** Windowed numbered pagination: ‹ Prev 1 2 3 … N Next ›. URL-driven. */
export default function Pagination({
  page,
  pageSize,
  total,
  beat,
  q,
}: {
  page: number;
  pageSize: number;
  total: number;
  beat: string;
  q: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // Window of page numbers around the current page, always including 1 + last.
  const pages: (number | "…")[] = [];
  const add = (n: number) => pages.push(n);
  const window = 1;
  const lo = Math.max(2, page - window);
  const hi = Math.min(totalPages - 1, page + window);
  add(1);
  if (lo > 2) pages.push("…");
  for (let i = lo; i <= hi; i++) add(i);
  if (hi < totalPages - 1) pages.push("…");
  if (totalPages > 1) add(totalPages);

  const pill = (
    label: React.ReactNode,
    to: number,
    active = false,
    ariaLabel?: string,
  ) => (
    <Button
      asChild
      size="sm"
      minW="36px"
      borderRadius="lg"
      variant={active ? "solid" : "outline"}
      bg={active ? "nexzy.blue" : "transparent"}
      color="white"
      borderColor="nexzy.blue/30"
      _hover={{ bg: active ? "nexzy.blue" : "whiteAlpha.100" }}
    >
      <NextLink
        href={href(to, beat, q)}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </NextLink>
    </Button>
  );

  return (
    <HStack
      as="nav"
      aria-label="Pagination"
      gap={2}
      justify="center"
      mt={12}
      flexWrap="wrap"
    >
      {page > 1 && pill("‹ Prev", page - 1, false, "Previous page")}
      {pages.map((p, i) =>
        p === "…" ? (
          <Button
            key={`gap-${i}`}
            size="sm"
            variant="ghost"
            color="gray.500"
            pointerEvents="none"
            aria-hidden="true"
          >
            …
          </Button>
        ) : (
          <span key={p}>{pill(p, p, p === page, `Page ${p}`)}</span>
        ),
      )}
      {page < totalPages && pill("Next ›", page + 1, false, "Next page")}
    </HStack>
  );
}
