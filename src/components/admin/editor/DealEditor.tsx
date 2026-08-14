"use client";

import { Box, Text, Input, Textarea, HStack, Checkbox } from "@chakra-ui/react";
import { labelProps, inputProps } from "./shared";
import type { ArticleFormatData, DealData } from "@/lib/admin/client";

/**
 * Deals core-module editor. The store link is required to publish (the format
 * gate holds the post until it's filled). Reporting-only — the "worth" note
 * states whether it's a genuine low, it never tells the reader to buy.
 */
export default function DealEditor({
  value,
  onChange,
}: {
  value: ArticleFormatData;
  onChange: (fd: ArticleFormatData) => void;
}) {
  const deal: DealData = value.deal ?? {};
  const set = (patch: Partial<DealData>) =>
    onChange({ ...value, deal: { ...deal, ...patch } });

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      p={4}
    >
      <Text {...labelProps} mb={3}>
        Deal — price box
      </Text>
      <HStack gap={2} mb={2} align="start">
        <Box flex="1">
          <Text {...labelProps}>Price now</Text>
          <Input
            value={deal.priceNow ?? ""}
            onChange={(e) => set({ priceNow: e.target.value })}
            placeholder="$23.99"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>Was</Text>
          <Input
            value={deal.priceWas ?? ""}
            onChange={(e) => set({ priceWas: e.target.value })}
            placeholder="$59.99"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>% off</Text>
          <Input
            value={deal.pct ?? ""}
            onChange={(e) => set({ pct: e.target.value })}
            placeholder="60%"
            {...inputProps}
          />
        </Box>
      </HStack>
      <HStack gap={2} mb={2} align="start">
        <Box flex="1">
          <Text {...labelProps}>Store</Text>
          <Input
            value={deal.store ?? ""}
            onChange={(e) => set({ store: e.target.value })}
            placeholder="Steam"
            {...inputProps}
          />
        </Box>
        <Box flex="1">
          <Text {...labelProps}>Ends</Text>
          <Input
            value={deal.endsAt ?? ""}
            onChange={(e) => set({ endsAt: e.target.value })}
            placeholder="Sunday 11:59pm PT"
            {...inputProps}
          />
        </Box>
      </HStack>
      <Box mb={2}>
        <Text {...labelProps}>
          Store link{" "}
          <Text as="span" color="red.300">
            (required to publish)
          </Text>
        </Text>
        <Input
          value={deal.storeUrl ?? ""}
          onChange={(e) => set({ storeUrl: e.target.value })}
          placeholder="https://store.steampowered.com/app/..."
          {...inputProps}
        />
      </Box>
      <Box mb={2}>
        <Checkbox.Root
          checked={!!deal.isHistoricalLow}
          onCheckedChange={(d) => set({ isHistoricalLow: !!d.checked })}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label color="gray.300" fontSize="sm">
            Historical low (cheapest it&apos;s been)
          </Checkbox.Label>
        </Checkbox.Root>
      </Box>
      <Box>
        <Text {...labelProps}>Worth note (report, don&apos;t push)</Text>
        <Textarea
          value={deal.worthNote ?? ""}
          onChange={(e) => set({ worthNote: e.target.value })}
          rows={2}
          placeholder="Previous floor was $29.99 — this is a genuine new low."
          {...inputProps}
        />
      </Box>
    </Box>
  );
}
