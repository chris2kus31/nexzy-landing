// ============================================
// FILE: components/blog/PatchBoard.tsx
// The patch notes board (design "Option B"): header (version, title, date,
// platforms, size, impact meter) -> score row -> who it hits -> what matters
// -> Buffed / Nerfed columns grouped by category with old -> new and a big
// change number -> New and changed -> Fixed / Known issues -> what it means.
// Every section hides when it has nothing, so a 2-line hotfix stays small.
// Used by the patch_notes post box (PatchBlock) and the inline `> [!PATCH]`
// article block. Server-safe; "show more" fixes use native <details>.
// ============================================
import type { ReactNode } from "react";
import { Box, Flex, Grid, Link, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import {
  FiArrowUp,
  FiArrowDown,
  FiPlus,
  FiTool,
  FiEye,
  FiArrowUpRight,
} from "react-icons/fi";
import {
  patchDelta,
  type PatchBoardData,
  type PatchItem,
  type PatchKind,
} from "@/lib/blog/patch";

const C = {
  card: "#181c36",
  line: "rgba(255,255,255,0.08)",
  soft: "rgba(255,255,255,0.04)",
  mut: "#8b92b8",
  text: "#d5daf0",
  gold: "#FFD700",
  blue: "#4DA3FF",
  green: "#3DDC97",
  red: "#FF6B57",
  purple: "#B18CFF",
  gray: "#A9B0CF",
};

const CHIP: Record<PatchKind, { label: string; color: string }> = {
  buff: { label: "Buff", color: C.green },
  nerf: { label: "Nerf", color: C.red },
  new: { label: "New", color: C.gold },
  change: { label: "Change", color: C.gray },
  rework: { label: "Rework", color: C.blue },
  fix: { label: "Fix", color: C.blue },
  known: { label: "Known", color: C.purple },
};

const IMPACT = { minor: 2, medium: 3, major: 5 } as const;

function Kicker({
  children,
  color = C.mut,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <Text
      as="span"
      fontSize="2xs"
      fontWeight="800"
      letterSpacing="0.13em"
      textTransform="uppercase"
      color={color}
    >
      {children}
    </Text>
  );
}

function BoxHead({
  icon: Icon,
  color,
  label,
  count,
}: {
  icon: IconType;
  color: string;
  label: string;
  count?: number;
}) {
  return (
    <Flex align="center" gap={2} mb={2}>
      <Box color={color}>
        <Icon size={14} strokeWidth={2.6} />
      </Box>
      <Text
        fontSize="xs"
        fontWeight="800"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color={color}
      >
        {label}
      </Text>
      {count ? (
        <Text ml="auto" fontSize="xs" fontWeight="700" color={C.mut}>
          {count}
        </Text>
      ) : null}
    </Flex>
  );
}

/** Buff/nerf row: name, old -> new (or detail), big change on the right. */
function StatRow({ it, color }: { it: PatchItem; color: string }) {
  const pct = patchDelta(it.from, it.to);
  const big = pct ?? (it.from ? null : it.to) ?? null;
  const sub =
    it.from && it.to ? (
      <>
        <Text as="s" opacity={0.8}>
          {it.from}
        </Text>{" "}
        &rarr; {it.to}
        {it.detail ? ` · ${it.detail}` : ""}
      </>
    ) : (
      it.detail
    );
  return (
    <Grid
      templateColumns="1fr auto"
      columnGap={3}
      alignItems="center"
      bg="rgba(10,12,28,0.35)"
      borderWidth="1px"
      borderColor={C.line}
      borderRadius="10px"
      px={3}
      py={2.5}
      mb={1.5}
    >
      <Box minW={0}>
        <Text color="white" fontWeight="600" fontSize="sm" lineHeight="1.35">
          {it.name}
        </Text>
        {sub ? (
          <Text
            fontSize="xs"
            color={C.mut}
            mt={0.5}
            fontVariantNumeric="tabular-nums"
          >
            {sub}
          </Text>
        ) : null}
      </Box>
      {big ? (
        <Text
          fontFamily="heading"
          fontWeight="700"
          fontSize={{ base: "md", md: "lg" }}
          color={color}
          textAlign="right"
          whiteSpace="nowrap"
        >
          {big}
        </Text>
      ) : null}
    </Grid>
  );
}

function Column({
  kind,
  items,
}: {
  kind: "buff" | "nerf";
  items: PatchItem[];
}) {
  const color = kind === "buff" ? C.green : C.red;
  const tint = kind === "buff" ? "61,220,151" : "255,107,87";
  const groups: { name: string | null; items: PatchItem[] }[] = [];
  for (const it of items) {
    const g = it.group || null;
    const last = groups[groups.length - 1];
    if (last && last.name === g) last.items.push(it);
    else groups.push({ name: g, items: [it] });
  }
  return (
    <Box
      borderRadius="14px"
      borderWidth="1px"
      borderColor={`rgba(${tint},0.28)`}
      bgImage={`linear-gradient(180deg, rgba(${tint},0.09), rgba(${tint},0.02) 60%)`}
      p={3}
    >
      <Flex align="center" gap={2} mx={1} mb={2.5}>
        <Box color={color}>
          {kind === "buff" ? (
            <FiArrowUp size={14} strokeWidth={3} />
          ) : (
            <FiArrowDown size={14} strokeWidth={3} />
          )}
        </Box>
        <Text
          fontSize="xs"
          fontWeight="800"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color={color}
        >
          {kind === "buff" ? "Buffed" : "Nerfed"}
        </Text>
        <Text
          ml="auto"
          fontSize="xs"
          fontWeight="700"
          color={color}
          bg={`rgba(${tint},0.15)`}
          px={2}
          borderRadius="full"
        >
          {items.length}
        </Text>
      </Flex>
      {groups.map((g, i) => (
        <Box key={i} mt={i ? 3 : 0}>
          {g.name ? (
            <Box mx={1} mb={1.5}>
              <Kicker>{g.name}</Kicker>
            </Box>
          ) : null}
          {g.items.map((it, j) => (
            <StatRow key={j} it={it} color={color} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <Box
      py={1.5}
      borderTopWidth="1px"
      borderColor={C.soft}
      _first={{ borderTopWidth: 0 }}
      fontSize="sm"
      color={C.text}
      lineHeight="1.5"
    >
      {children}
    </Box>
  );
}

const lineText = (it: PatchItem) =>
  [it.name, it.to && !it.from ? it.to : null, it.detail]
    .filter(Boolean)
    .join(": ");

function ListBox({
  icon,
  color,
  label,
  items,
  show = 4,
}: {
  icon: IconType;
  color: string;
  label: string;
  items: PatchItem[];
  show?: number;
}) {
  const head = items.slice(0, show);
  const rest = items.slice(show);
  return (
    <Box
      borderWidth="1px"
      borderColor={C.line}
      borderRadius="14px"
      px={3.5}
      py={3}
      bg="rgba(255,255,255,0.02)"
    >
      <BoxHead icon={icon} color={color} label={label} count={items.length} />
      {head.map((it, i) => (
        <Line key={i}>{lineText(it)}</Line>
      ))}
      {rest.length ? (
        <Box
          as="details"
          css={{
            "& summary": { listStyle: "none", cursor: "pointer" },
            "& summary::-webkit-details-marker": { display: "none" },
            "&[open] summary": { display: "none" },
          }}
        >
          <Text
            as="summary"
            fontSize="sm"
            fontWeight="600"
            color={C.blue}
            mt={1.5}
          >
            Show {rest.length} more
          </Text>
          {rest.map((it, i) => (
            <Line key={i}>{lineText(it)}</Line>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export default function PatchBoard({ data }: { data: PatchBoardData }) {
  const by = (k: PatchKind[]) => data.items.filter((it) => k.includes(it.kind));
  const buffs = by(["buff"]);
  const nerfs = by(["nerf"]);
  const changed = by(["new", "change", "rework"]);
  const fixes = by(["fix"]);
  const known = by(["known"]);
  const counts = [
    { n: buffs.length, label: "Buffs", color: C.green },
    { n: nerfs.length, label: "Nerfs", color: C.red },
    { n: by(["new"]).length, label: "New", color: C.gold },
    { n: by(["change", "rework"]).length, label: "Changes", color: C.gray },
    { n: fixes.length, label: "Fixes", color: C.blue },
    { n: known.length, label: "Known", color: C.purple },
  ].filter((x) => x.n > 0);
  const meta = [data.date, data.platforms, data.size]
    .filter(Boolean)
    .join(" · ");
  const bars = data.impact ? IMPACT[data.impact] : 0;
  const title =
    data.title || (data.version ? `Update ${data.version}` : "Patch notes");

  return (
    <Box
      my={8}
      position="relative"
      overflow="hidden"
      borderRadius="18px"
      borderWidth="1px"
      borderColor={C.line}
      bg={C.card}
      color={C.text}
      fontSize="md"
      lineHeight="1.5"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        h: "3px",
        bgImage: `linear-gradient(90deg, ${C.green}, ${C.gold} 50%, ${C.red})`,
      }}
    >
      {/* Header */}
      <Flex
        align="center"
        gap={4}
        px={{ base: 4, md: 5 }}
        pt={5}
        pb={4}
        wrap="wrap"
      >
        {data.version ? (
          <Box
            fontFamily="heading"
            fontWeight="700"
            fontSize={{ base: "lg", md: "xl" }}
            color="#12152a"
            bg={C.gold}
            px={3}
            py={1.5}
            borderRadius="10px"
            style={{
              clipPath:
                "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)",
            }}
          >
            {data.version}
          </Box>
        ) : (
          <Flex
            w="38px"
            h="38px"
            borderRadius="10px"
            bg={C.gold}
            color="#12152a"
            align="center"
            justify="center"
          >
            <FiTool size={18} strokeWidth={2.6} />
          </Flex>
        )}
        <Box flex="1" minW="180px">
          <Text
            color="white"
            fontWeight="700"
            fontSize={{ base: "md", md: "lg" }}
            lineHeight="1.3"
          >
            {title}
          </Text>
          {meta ? (
            <Text fontSize="sm" color={C.mut} mt={0.5}>
              {meta}
            </Text>
          ) : null}
        </Box>
        {data.impact ? (
          <Box
            textAlign={{ base: "left", md: "right" }}
            w={{ base: "full", md: "auto" }}
          >
            <Kicker>Impact</Kicker>
            <Flex
              gap="3px"
              mt={1.5}
              justify={{ base: "flex-start", md: "flex-end" }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  w="18px"
                  h="8px"
                  borderRadius="2px"
                  bg={i < bars ? C.gold : "rgba(255,255,255,0.1)"}
                />
              ))}
            </Flex>
            <Text
              fontSize="xs"
              fontWeight="700"
              color={C.gold}
              mt={1}
              textTransform="capitalize"
            >
              {data.impact}
            </Text>
          </Box>
        ) : null}
      </Flex>

      {/* Score row */}
      {counts.length ? (
        <Grid
          templateColumns={`repeat(${counts.length}, 1fr)`}
          borderTopWidth="1px"
          borderBottomWidth="1px"
          borderColor={C.line}
        >
          {counts.map((x, i) => (
            <Box
              key={x.label}
              px={{ base: 2, md: 3.5 }}
              py={2.5}
              borderLeftWidth={i ? "1px" : 0}
              borderColor={C.line}
              color={x.color}
            >
              <Text
                fontFamily="heading"
                fontWeight="700"
                fontSize={{ base: "lg", md: "2xl" }}
                lineHeight="1.1"
              >
                {x.n}
              </Text>
              <Text
                fontSize={{ base: "9px", md: "2xs" }}
                fontWeight="800"
                letterSpacing={{ base: "0.06em", md: "0.12em" }}
                textTransform="uppercase"
              >
                {x.label}
              </Text>
            </Box>
          ))}
        </Grid>
      ) : null}

      {/* Who it hits */}
      {data.who?.length ? (
        <Flex
          align="center"
          gap={2}
          wrap="wrap"
          px={{ base: 4, md: 5 }}
          py={3}
          borderBottomWidth="1px"
          borderColor={C.line}
        >
          <Kicker>Who it hits</Kicker>
          {data.who.map((w) => (
            <Text
              key={w}
              as="span"
              fontSize="xs"
              px={2.5}
              py={1}
              borderRadius="full"
              bg="rgba(77,163,255,0.12)"
              color="#9cc9ff"
              borderWidth="1px"
              borderColor="rgba(77,163,255,0.3)"
            >
              {w}
            </Text>
          ))}
        </Flex>
      ) : null}

      <Box p={{ base: 3, md: 4 }} display="flex" flexDirection="column" gap={3}>
        {/* What matters */}
        {data.tldr?.length ? (
          <Box
            borderWidth="1px"
            borderColor="rgba(255,215,0,0.25)"
            bg="rgba(255,215,0,0.05)"
            borderRadius="14px"
            px={3.5}
            py={3}
          >
            <Box mb={1.5}>
              <Kicker color={C.gold}>What matters</Kicker>
            </Box>
            {data.tldr.map((t, i) => (
              <Flex key={i} gap={2.5} align="baseline" fontSize="sm" py={0.5}>
                <Box
                  flex="0 0 auto"
                  w="7px"
                  h="7px"
                  bg={C.gold}
                  borderRadius="2px"
                  transform="rotate(45deg) translateY(-1px)"
                />
                <Text color={C.text}>{t}</Text>
              </Flex>
            ))}
          </Box>
        ) : null}

        {/* Buffed / Nerfed */}
        {buffs.length || nerfs.length ? (
          <Grid
            templateColumns={{
              base: "1fr",
              md: buffs.length && nerfs.length ? "1fr 1fr" : "1fr",
            }}
            gap={3}
          >
            {buffs.length ? <Column kind="buff" items={buffs} /> : null}
            {nerfs.length ? <Column kind="nerf" items={nerfs} /> : null}
          </Grid>
        ) : null}

        {/* New and changed */}
        {changed.length ? (
          <Box
            borderWidth="1px"
            borderColor={C.line}
            borderRadius="14px"
            px={3.5}
            py={3}
            bg="rgba(255,255,255,0.02)"
          >
            <BoxHead
              icon={FiPlus}
              color={C.gold}
              label="New and changed"
              count={changed.length}
            />
            {changed.map((it, i) => {
              const ch = CHIP[it.kind];
              return (
                <Grid
                  key={i}
                  templateColumns="72px 1fr"
                  gap={2.5}
                  alignItems="baseline"
                  py={1.5}
                  borderTopWidth={i ? "1px" : 0}
                  borderColor={C.soft}
                >
                  <Text
                    as="span"
                    justifySelf="start"
                    fontSize="2xs"
                    fontWeight="800"
                    letterSpacing="0.08em"
                    textTransform="uppercase"
                    px={1.5}
                    py="1px"
                    borderRadius="5px"
                    borderWidth="1px"
                    color={ch.color}
                    borderColor={`${ch.color}66`}
                  >
                    {ch.label}
                  </Text>
                  <Text fontSize="sm" color={C.text}>
                    <Text as="span" color="white" fontWeight="600">
                      {it.name}
                    </Text>
                    {it.from && it.to
                      ? ` ${it.from} → ${it.to}`
                      : it.to
                        ? `: ${it.to}`
                        : ""}
                    {it.detail ? ` · ${it.detail}` : ""}
                  </Text>
                </Grid>
              );
            })}
          </Box>
        ) : null}

        {/* Fixed / Known issues */}
        {fixes.length || known.length ? (
          <Grid
            templateColumns={{
              base: "1fr",
              md: fixes.length && known.length ? "1fr 1fr" : "1fr",
            }}
            gap={3}
          >
            {fixes.length ? (
              <ListBox
                icon={FiTool}
                color={C.blue}
                label="Fixed"
                items={fixes}
              />
            ) : null}
            {known.length ? (
              <ListBox
                icon={FiEye}
                color={C.purple}
                label="Known issues"
                items={known}
              />
            ) : null}
          </Grid>
        ) : null}

        {/* What it means */}
        {data.metaNote ? (
          <Box
            borderWidth="1px"
            borderColor={C.line}
            borderRadius="14px"
            px={3.5}
            py={3}
          >
            <Box mb={1}>
              <Kicker color={C.gold}>What it means</Kicker>
            </Box>
            <Text fontSize="sm" color={C.text} lineHeight="1.7">
              {data.metaNote}
            </Text>
          </Box>
        ) : null}

        {data.changelogUrl ? (
          <Link
            href={data.changelogUrl}
            target="_blank"
            rel="noopener noreferrer"
            color={C.blue}
            fontSize="sm"
            fontWeight="600"
            display="inline-flex"
            alignItems="center"
            gap={1}
            alignSelf="flex-start"
          >
            Full changelog <FiArrowUpRight />
          </Link>
        ) : null}
      </Box>
    </Box>
  );
}
