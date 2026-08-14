import { Box, Text, HStack, Table } from "@chakra-ui/react";
import type { PublicPost } from "@/lib/blog/api";

type Spec = NonNullable<NonNullable<PublicPost["formatData"]>["hardwareSpec"]>;

/**
 * Hardware core module: the spec face-off table (this vs. a rival, or a single-
 * column spec sheet) + "who it's for" chips. Reporting-only — states specs and
 * who each suits; the reader gives the buy verdict via the poll.
 */
export default function HardwareSpecBlock({
  spec,
  whoFor,
}: {
  spec?: Spec | null;
  whoFor?: string[] | null;
}) {
  const rows = spec?.rows ?? [];
  if (rows.length === 0) return null;
  const hasB =
    !!spec?.compareLabels?.b || rows.some((r) => !!r.b && r.b.trim());
  const labelA = spec?.compareLabels?.a || "";
  const labelB = spec?.compareLabels?.b || "";
  const chips = (whoFor ?? []).filter(Boolean);

  return (
    <Box my={8}>
      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        overflow="hidden"
      >
        <Table.Root size="sm" variant="line">
          <Table.Header>
            <Table.Row bg="whiteAlpha.100">
              <Table.ColumnHeader color="gray.400">Spec</Table.ColumnHeader>
              <Table.ColumnHeader color="white">{labelA}</Table.ColumnHeader>
              {hasB && (
                <Table.ColumnHeader color="gray.300">
                  {labelB}
                </Table.ColumnHeader>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r, i) => (
              <Table.Row key={i}>
                <Table.Cell color="gray.500">{r.k}</Table.Cell>
                <Table.Cell color="white" fontWeight="600">
                  {r.a}
                </Table.Cell>
                {hasB && <Table.Cell color="gray.300">{r.b || "—"}</Table.Cell>}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {chips.length > 0 && (
        <Box mt={4}>
          <Text
            fontFamily="title"
            fontSize="xs"
            letterSpacing="wide"
            textTransform="uppercase"
            color="gray.400"
            mb={2}
          >
            Who it&apos;s for
          </Text>
          <HStack gap={2} flexWrap="wrap">
            {chips.map((c, i) => (
              <Box
                key={i}
                bg="purple.400/15"
                color="purple.200"
                border="1px solid"
                borderColor="purple.400/30"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="sm"
              >
                {c}
              </Box>
            ))}
          </HStack>
        </Box>
      )}
    </Box>
  );
}
