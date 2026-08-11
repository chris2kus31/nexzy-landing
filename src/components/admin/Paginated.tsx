"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Flex, Button, Text } from "@chakra-ui/react";

/**
 * Client-side pager for admin lists that are already fetched fully (server caps
 * these at ~100 rows), so we just slice the in-memory array — no backend change.
 * Render-prop: give it the full array + a render fn for the current page slice.
 */
export default function Paginated<T>({
  items,
  pageSize = 20,
  children,
}: {
  items: T[];
  pageSize?: number;
  children: (pageItems: T[]) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  return (
    <>
      {children(pageItems)}
      {pages > 1 ? (
        <Flex justify="center" align="center" gap={3} mt={4} wrap="wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            Prev
          </Button>
          <Text fontSize="sm" color="gray.500">
            Page {safePage + 1} of {pages} · {items.length} total
          </Text>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
          >
            Next
          </Button>
        </Flex>
      ) : null}
    </>
  );
}
