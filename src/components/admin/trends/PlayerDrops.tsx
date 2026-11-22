"use client";
// Admin > Trends > Player drops: drops players started. Reported and hidden
// ones first. Per drop: keep it (clears its reports and shows it on the
// Players tab again), set its end date or make it permanent, put it on the
// website, or take it down with every build in it. Rules (API
// player-drops.service.ts): 30 days, rolling on 7 days at a time while it
// gets builds; 3 reports hide it from the Players tab until reviewed.
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import {
  listPlayerDrops,
  removePlayerDrop,
  updatePlayerDrop,
  type AdminPlayerDrop,
  type PlayerDropFilter,
} from "@/lib/admin/client-trends";
import { StatusChip, inputProps, num, outlineBtn, yellowBtn } from "./ui";

const FILTERS: ReadonlyArray<readonly [PlayerDropFilter, string]> = [
  ["all", "All"],
  ["reported", "Reported"],
  ["hidden", "Hidden"],
  ["web", "On the website"],
];

const REASON: Record<string, string> = {
  hate: "Hate",
  harassment: "Targets a person",
  sexual: "Sexual",
  spam: "Spam",
  other: "Other",
};

const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No end";

/** yyyy-mm-dd for a date input (local day). */
const inputDay = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 30 * 864e5);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function PlayerDrops({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<PlayerDropFilter>("all");
  const [rows, setRows] = useState<AdminPlayerDrop[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPlayerDrops(filter));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Run an action, then reload the list (the server is the truth). */
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(done);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="flex-end" mb={4} gap={3} wrap="wrap">
        <Box>
          <Button size="xs" {...outlineBtn} onClick={onBack} mb={2}>
            <FiArrowLeft /> Trends
          </Button>
          <Heading size="md" color="nexzy.white">
            Player drops
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600" maxW="640px">
            Drops players started. They run 30 days and roll on a week at a time
            while people keep building. 3 reports hide one from the Players tab
            until you keep it or remove it. They show on the website only when
            you turn that on.
          </Text>
        </Box>
        <Button size="sm" {...outlineBtn} onClick={load} loading={loading}>
          Refresh
        </Button>
      </Flex>

      <HStack gap={2} mb={3} wrap="wrap">
        {FILTERS.map(([key, label]) => (
          <Button
            key={key}
            size="xs"
            borderRadius="full"
            onClick={() => setFilter(key)}
            bg={filter === key ? "whiteAlpha.300" : "transparent"}
            color={filter === key ? "white" : "nexzy.gray.100"}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            {label}
          </Button>
        ))}
      </HStack>

      {error && (
        <Text color="red.300" mb={3} role="alert">
          {error}
        </Text>
      )}
      {msg && (
        <Text color="green.300" mb={3}>
          {msg}
        </Text>
      )}

      {!rows && loading ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : !rows?.length ? (
        <Text color="whiteAlpha.600" py={6}>
          {filter === "all"
            ? "No player drops yet."
            : "No player drops in this list."}
        </Text>
      ) : (
        <Flex direction="column" gap={3}>
          {rows.map((d) => (
            <PlayerDropRow key={d.id} drop={d} act={act} />
          ))}
        </Flex>
      )}
    </Box>
  );
}

function PlayerDropRow({
  drop: d,
  act,
}: {
  drop: AdminPlayerDrop;
  act: (fn: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  const [endDay, setEndDay] = useState(inputDay(d.endsAt));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    await act(fn, done);
    setBusy(false);
    setConfirm(false);
  };
  const ended = !!d.endsAt && Date.parse(d.endsAt) <= Date.now();
  return (
    <Box
      bg="whiteAlpha.50"
      borderWidth="1px"
      borderColor={d.hiddenAt ? "red.400" : "whiteAlpha.200"}
      borderRadius="xl"
      p={4}
    >
      <Flex justify="space-between" gap={3} wrap="wrap">
        <Box minW={0} flex="1">
          <HStack gap={2} wrap="wrap">
            <Text color="nexzy.yellow" fontWeight="800">
              #{d.hashtag}
            </Text>
            <StatusChip status={ended ? "ended" : (d.status as "live")} />
            {d.hiddenAt && (
              <Text fontSize="xs" color="red.300" fontWeight="700">
                Hidden by reports
              </Text>
            )}
            {d.webVisible && (
              <Text fontSize="xs" color="green.300" fontWeight="700">
                On the website
              </Text>
            )}
          </HStack>
          <Text fontSize="sm" color="nexzy.white">
            {d.title}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
            by @{d.startedBy ?? "deleted"} · {num(d.entryCount)} builds ·{" "}
            {num(d.weekCount)} this week · started {day(d.createdAt)} ·{" "}
            {ended ? "ended" : "ends"} {day(d.endsAt)}
          </Text>
          {d.reportCount > 0 && (
            <Text fontSize="xs" color="red.200" mt={1}>
              {d.reportCount} report{d.reportCount === 1 ? "" : "s"}:{" "}
              {d.reasons
                .map((r) => `${REASON[r.reason] ?? r.reason} ${r.count}`)
                .join(", ")}
            </Text>
          )}
        </Box>
        <Button size="xs" {...outlineBtn} asChild>
          <a href={`/drops/${d.slug}`} target="_blank" rel="noreferrer">
            Open <FiExternalLink />
          </a>
        </Button>
      </Flex>

      <Flex gap={2} mt={3} wrap="wrap" align="center">
        {d.reportCount > 0 && (
          <Button
            size="xs"
            {...yellowBtn}
            disabled={busy}
            onClick={() =>
              run(
                () => updatePlayerDrop(d.id, { keep: true }),
                `Kept #${d.hashtag}. Its reports are cleared.`,
              )
            }
          >
            Keep it
          </Button>
        )}
        <Input
          {...inputProps}
          type="date"
          w="150px"
          size="xs"
          value={endDay}
          min={inputDay(new Date(Date.now() + 864e5).toISOString())}
          onChange={(e) => setEndDay(e.target.value)}
          aria-label={`End date for #${d.hashtag}`}
        />
        <Button
          size="xs"
          {...outlineBtn}
          disabled={busy || !endDay}
          onClick={() =>
            run(
              () =>
                updatePlayerDrop(d.id, {
                  // End of that day, local time.
                  endsAt: new Date(`${endDay}T23:59:00`).toISOString(),
                }),
              `#${d.hashtag} now ends ${endDay}.`,
            )
          }
        >
          Set end date
        </Button>
        <Button
          size="xs"
          {...outlineBtn}
          disabled={busy || d.endsAt === null}
          onClick={() =>
            run(
              () => updatePlayerDrop(d.id, { endsAt: null }),
              `#${d.hashtag} has no end date now.`,
            )
          }
        >
          No end date
        </Button>
        <Button
          size="xs"
          {...outlineBtn}
          disabled={busy}
          onClick={() =>
            run(
              () => updatePlayerDrop(d.id, { webVisible: !d.webVisible }),
              d.webVisible
                ? `#${d.hashtag} is off the website.`
                : `#${d.hashtag} is on the website.`,
            )
          }
        >
          {d.webVisible ? "Take off the website" : "Put on the website"}
        </Button>
        {confirm ? (
          <>
            <Button
              size="xs"
              bg="red.500"
              color="white"
              _hover={{ bg: "red.600" }}
              disabled={busy}
              onClick={() =>
                run(
                  () => removePlayerDrop(d.id),
                  `Removed #${d.hashtag} and its builds.`,
                )
              }
            >
              Remove the drop and {num(d.entryCount)} builds
            </Button>
            <Button size="xs" {...outlineBtn} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            variant="outline"
            color="red.300"
            borderColor="red.400"
            _hover={{ bg: "whiteAlpha.100" }}
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            Remove
          </Button>
        )}
      </Flex>
    </Box>
  );
}
