"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiPlus, FiTrash2, FiUnlock, FiSearch } from "react-icons/fi";
import {
  addReservedUsername,
  getReservedConflicts,
  getReservedUsernames,
  releaseReservedUsername,
  removeReservedUsername,
  renameUserAccount,
  type ReservedCategory,
  type ReservedConflict,
  type ReservedMatchType,
  type ReservedUsernameRow,
} from "@/lib/admin/client";

const CATEGORIES: ReservedCategory[] = [
  "nexzy",
  "system",
  "platform",
  "publisher",
  "press",
  "franchise",
  "creator",
  "other",
];

const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  size: "sm" as const,
};
const nativeControl: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "#EAF0FA",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 14,
  outline: "none",
};
const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.gray.100",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const card = {
  borderWidth: "1px",
  borderColor: "whiteAlpha.200",
  borderRadius: "10px",
  p: 4,
};

/**
 * Admin → Usernames (owner). "nexzy" is blocked anywhere in a username;
 * system words only as the exact name; brands as the bare name or joined with
 * official/hq/team/staff/support/news/verified/app. Everything else goes
 * through impersonation reports + the rename tool here.
 */
export default function UsernamesPanel() {
  const [rows, setRows] = useState<ReservedUsernameRow[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    getReservedUsernames()
      .then(setRows)
      .catch((e: Error) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const grouped = useMemo(() => {
    const m = new Map<string, ReservedUsernameRow[]>();
    for (const r of rows ?? []) {
      m.set(r.category, [...(m.get(r.category) ?? []), r]);
    }
    return CATEGORIES.filter((c) => m.has(c)).map(
      (c) => [c, m.get(c)!] as const,
    );
  }, [rows]);

  return (
    <VStack align="stretch" gap={6} maxW="900px">
      <Box>
        <Heading size="md" color="nexzy.white" mb={1}>
          Reserved usernames
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.600">
          Anywhere: blocked inside any username (nexzy). Exact: blocked only as
          the whole name (admin, support). Brand: the name alone or with
          official, hq, team, staff, support, news, verified or app
          (&quot;ign&quot;, &quot;ign_official&quot;), while &quot;ign2&quot;
          and &quot;lucy_official&quot; are fine. Capitals, dots and underscores
          are ignored. Existing accounts are never changed. Team accounts can
          use any of these.
        </Text>
      </Box>

      <AddForm onAdded={load} />

      {err && (
        <Text color="red.300" fontSize="sm">
          {err}
        </Text>
      )}

      {!rows ? (
        <Spinner color="nexzy.blue" />
      ) : !rows.length ? (
        <Box {...card}>
          <Text color="whiteAlpha.700" fontSize="sm">
            No reserved names yet. Run the seed once on the server:{" "}
            <code>php streamnest-cron usernames:seed-reserved</code>
          </Text>
        </Box>
      ) : (
        <VStack align="stretch" gap={4}>
          <Text fontSize="xs" color="whiteAlpha.500">
            {rows.length} reserved names
          </Text>
          {grouped.map(([cat, list]) => (
            <Box key={cat} {...card}>
              <Text
                color="nexzy.white"
                fontWeight="600"
                fontSize="sm"
                mb={2}
                textTransform="capitalize"
              >
                {cat} ({list.length})
              </Text>
              <VStack align="stretch" gap={1}>
                {list.map((r) => (
                  <ReservedRow key={r.id} row={r} onChanged={load} />
                ))}
              </VStack>
            </Box>
          ))}
        </VStack>
      )}

      <Conflicts />
      <RenameTool />
    </VStack>
  );
}

function AddForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<ReservedMatchType>("brand");
  const [category, setCategory] = useState<ReservedCategory>("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const saved = await addReservedUsername({
        name: name.trim(),
        matchType,
        category,
        note: note.trim() || undefined,
      });
      setMsg(`Reserved "${saved.name}".`);
      setName("");
      setNote("");
      onAdded();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box {...card}>
      <Text color="nexzy.white" fontWeight="600" fontSize="sm" mb={2}>
        Add a name
      </Text>
      <Flex gap={2} wrap="wrap" align="center">
        <Input
          {...inputProps}
          maxW="200px"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value as ReservedMatchType)}
          style={nativeControl}
          aria-label="Match"
        >
          <option value="brand" style={{ color: "#000" }}>
            Brand (name, or name + official/hq...)
          </option>
          <option value="exact" style={{ color: "#000" }}>
            Exact name only
          </option>
          <option value="contains" style={{ color: "#000" }}>
            Anywhere in a username
          </option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ReservedCategory)}
          style={nativeControl}
          aria-label="Category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ color: "#000" }}>
              {c}
            </option>
          ))}
        </select>
        <Input
          {...inputProps}
          maxW="220px"
          placeholder="note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
        />
        <Button
          size="sm"
          {...primaryBtn}
          onClick={() => void submit()}
          loading={busy}
          disabled={!name.trim()}
        >
          <FiPlus /> Reserve
        </Button>
      </Flex>
      {msg && (
        <Text fontSize="xs" color="whiteAlpha.700" mt={2}>
          {msg}
        </Text>
      )}
    </Box>
  );
}

function ReservedRow({
  row,
  onChanged,
}: {
  row: ReservedUsernameRow;
  onChanged: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseTo, setReleaseTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      setReleasing(false);
      setConfirmRemove(false);
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box py={1} borderBottom="1px solid" borderColor="whiteAlpha.100">
      <Flex gap={2} align="center" wrap="wrap">
        <Text color="nexzy.white" fontSize="sm" fontFamily="mono" minW="160px">
          {row.name}
        </Text>
        <Badge
          size="sm"
          colorPalette={
            row.matchType === "contains"
              ? "orange"
              : row.matchType === "brand"
                ? "blue"
                : "gray"
          }
        >
          {row.matchType === "contains"
            ? "Anywhere"
            : row.matchType === "brand"
              ? "Brand"
              : "Exact"}
        </Badge>
        {row.releasedToUsername && (
          <Badge size="sm" colorPalette="green">
            Released to @{row.releasedToUsername}
          </Badge>
        )}
        {row.note && (
          <Text fontSize="xs" color="whiteAlpha.500">
            {row.note}
          </Text>
        )}
        <Box flex="1" />
        {row.releasedToUserId ? (
          <Button
            size="xs"
            {...outlineBtn}
            onClick={() =>
              void run(() => releaseReservedUsername(row.id, null))
            }
            loading={busy}
          >
            Undo release
          </Button>
        ) : (
          <Button
            size="xs"
            {...outlineBtn}
            onClick={() => setReleasing((v) => !v)}
          >
            <FiUnlock /> Release
          </Button>
        )}
        {confirmRemove ? (
          <>
            <Button
              size="xs"
              bg="red.500"
              color="white"
              _hover={{ bg: "red.600" }}
              onClick={() => void run(() => removeReservedUsername(row.id))}
              loading={busy}
            >
              Confirm remove
            </Button>
            <Button
              size="xs"
              {...outlineBtn}
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            {...outlineBtn}
            onClick={() => setConfirmRemove(true)}
            aria-label={`Remove ${row.name}`}
          >
            <FiTrash2 />
          </Button>
        )}
      </Flex>
      {releasing && (
        <HStack mt={2} gap={2}>
          <Input
            {...inputProps}
            maxW="220px"
            placeholder="username of the verified account"
            value={releaseTo}
            onChange={(e) => setReleaseTo(e.target.value)}
          />
          <Button
            size="xs"
            {...primaryBtn}
            disabled={!releaseTo.trim()}
            loading={busy}
            onClick={() =>
              void run(() => releaseReservedUsername(row.id, releaseTo.trim()))
            }
          >
            Release to this account
          </Button>
        </HStack>
      )}
      {err && (
        <Text color="red.300" fontSize="xs" mt={1}>
          {err}
        </Text>
      )}
    </Box>
  );
}

function Conflicts() {
  const [list, setList] = useState<ReservedConflict[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const check = async () => {
    setBusy(true);
    setErr("");
    try {
      setList(await getReservedConflicts());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box {...card}>
      <Flex align="center" gap={3} mb={2}>
        <Text color="nexzy.white" fontWeight="600" fontSize="sm">
          Existing accounts using a reserved name
        </Text>
        <Button
          size="xs"
          {...outlineBtn}
          onClick={() => void check()}
          loading={busy}
        >
          <FiSearch /> Check
        </Button>
      </Flex>
      <Text fontSize="xs" color="whiteAlpha.500" mb={2}>
        Nothing is changed automatically. Rename one below only if it&apos;s
        pretending to be someone.
      </Text>
      {err && (
        <Text color="red.300" fontSize="xs">
          {err}
        </Text>
      )}
      {list &&
        (list.length === 0 ? (
          <Text fontSize="sm" color="whiteAlpha.700">
            None.
          </Text>
        ) : (
          <VStack align="stretch" gap={1}>
            {list.map((c) => (
              <Flex
                key={`${c.userId}:${c.reservedName}`}
                gap={3}
                fontSize="sm"
                color="nexzy.gray.100"
              >
                <Text color="nexzy.white" minW="180px">
                  @{c.username}
                </Text>
                <Text>
                  matches &quot;{c.reservedName}&quot; ({c.matchType})
                </Text>
                <Text color="whiteAlpha.500">
                  joined {new Date(c.createdAt).toLocaleDateString()}
                </Text>
              </Flex>
            ))}
          </VStack>
        ))}
    </Box>
  );
}

function RenameTool() {
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await renameUserAccount({
        username: username.trim(),
        newUsername: newUsername.trim(),
      });
      setMsg(`Renamed to @${res.username}.`);
      setUsername("");
      setNewUsername("");
      setConfirm(false);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ready = !!username.trim() && !!newUsername.trim();

  return (
    <Box {...card}>
      <Text color="nexzy.white" fontWeight="600" fontSize="sm" mb={1}>
        Rename an account
      </Text>
      <Text fontSize="xs" color="whiteAlpha.500" mb={2}>
        For impersonation, or to hand a released name to a verified brand. Skips
        the reserved check; the new name must not be taken.
      </Text>
      <Flex gap={2} wrap="wrap" align="center">
        <Input
          {...inputProps}
          maxW="200px"
          placeholder="current username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setConfirm(false);
          }}
        />
        <Input
          {...inputProps}
          maxW="200px"
          placeholder="new username"
          value={newUsername}
          onChange={(e) => {
            setNewUsername(e.target.value);
            setConfirm(false);
          }}
          maxLength={30}
        />
        {confirm ? (
          <>
            <Button
              size="sm"
              bg="red.500"
              color="white"
              _hover={{ bg: "red.600" }}
              onClick={() => void submit()}
              loading={busy}
            >
              Confirm rename
            </Button>
            <Button size="sm" {...outlineBtn} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            {...primaryBtn}
            disabled={!ready}
            onClick={() => setConfirm(true)}
          >
            Rename
          </Button>
        )}
      </Flex>
      {msg && (
        <Text fontSize="xs" color="whiteAlpha.700" mt={2}>
          {msg}
        </Text>
      )}
    </Box>
  );
}
