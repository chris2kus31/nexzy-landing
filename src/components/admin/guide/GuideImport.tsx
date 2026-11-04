"use client";

// Admin -> Guides -> Import / Export. Paste JSON or pick a CSV, check it with
// a dry run (nothing is written), then import. Rows are matched by slug, so
// importing again updates instead of duplicating. Link fields use slugs.
import { useState } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import type { HubTemplateConfig } from "@/lib/hub-engine/types";
import {
  errorLines,
  exportEngineEntries,
  importEngineEntries,
  type ImportReport,
} from "@/lib/admin/client-hub-engine";
import {
  C,
  Card,
  Gold,
  LongIn,
  Plain,
  Problems,
} from "@/components/admin/guide/ui";

/** Minimal RFC 4180 CSV reader (quotes, escaped quotes, commas, newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/**
 * CSV columns: type, title, slug, summary, status, spoilerStage, eras
 * (a|b), sortOrder, map, x, y, and one column per field named field.<key>.
 * Multi values (pick many, links) are separated with |.
 */
function csvToRows(text: string, config: HubTemplateConfig): unknown[] {
  const [head, ...body] = parseCsv(text.replace(/^﻿/, ""));
  if (!head) return [];
  const h = head.map((x) => x.trim());
  return body.map((cells) => {
    const get = (k: string) => {
      const i = h.indexOf(k);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };
    const type = config.types.find((t) => t.key === get("type"));
    const fields: Record<string, unknown> = {};
    for (const fd of type?.fields ?? []) {
      const raw = get(`field.${fd.key}`);
      if (!raw) continue;
      if (fd.kind === "multiselect" || fd.kind === "entries")
        fields[fd.key] = raw
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
      else if (fd.kind === "number") fields[fd.key] = Number(raw);
      else if (fd.kind === "boolean")
        fields[fd.key] = /^(yes|true|1)$/i.test(raw);
      else fields[fd.key] = raw;
    }
    const map = get("map");
    const x = get("x");
    const y = get("y");
    return {
      type: get("type"),
      title: get("title"),
      ...(get("slug") ? { slug: get("slug") } : {}),
      ...(get("summary") ? { summary: get("summary") } : {}),
      ...(get("status") ? { status: get("status") } : {}),
      ...(get("spoilerStage") ? { spoilerStage: get("spoilerStage") } : {}),
      ...(get("eras")
        ? {
            eras: get("eras")
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
      ...(get("sortOrder") ? { sortOrder: Number(get("sortOrder")) } : {}),
      fields,
      ...(map && x && y ? { pins: [{ map, x: Number(x), y: Number(y) }] } : {}),
    };
  });
}

export default function GuideImport({
  gameId,
  gameSlug,
  config,
}: {
  gameId: string;
  gameSlug: string;
  config: HubTemplateConfig;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const parse = (): unknown[] | null => {
    setErr([]);
    const t = text.trim();
    if (!t) return null;
    try {
      if (t.startsWith("[") || t.startsWith("{")) {
        const v = JSON.parse(t) as unknown;
        const list = Array.isArray(v)
          ? v
          : (v as { entries?: unknown[] }).entries;
        if (!Array.isArray(list))
          throw new Error(
            "JSON must be a list of entries, or { entries: [...] }",
          );
        return list;
      }
      return csvToRows(t, config);
    } catch (e) {
      setErr([(e as Error).message]);
      return null;
    }
  };

  const run = async (dryRun: boolean) => {
    const list = rows ?? parse();
    if (!list) return;
    setRows(list);
    setBusy(true);
    setErr([]);
    try {
      setReport(await importEngineEntries(gameId, list, dryRun));
    } catch (e) {
      setErr(errorLines(e));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setErr([]);
    try {
      const data = await exportEngineEntries(gameId);
      if (data.truncated)
        setErr([
          "This game is over the export cap, so the file is incomplete. Tell Claude before using it to rebuild anything.",
        ]);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${gameSlug}-guide-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      setErr(errorLines(e));
    }
  };

  const fieldCols = config.types.flatMap((t) =>
    t.fields.map((f) => `field.${f.key}`),
  );
  const header = [
    "type",
    "title",
    "slug",
    "summary",
    "status",
    "spoilerStage",
    "eras",
    "sortOrder",
    "map",
    "x",
    "y",
    ...new Set(fieldCols),
  ].join(",");

  return (
    <Stack gap={4}>
      <Card
        title="Export"
        aside={
          <Plain onClick={() => void download()}>
            Download all entries (JSON)
          </Plain>
        }
      >
        <Text fontSize="sm" color={C.muted}>
          A full backup in the same format the importer takes. Edit it and
          import it back to change many entries at once.
        </Text>
      </Card>
      <Card title="Import">
        <Stack gap={3}>
          <Text fontSize="sm" color={C.muted}>
            Paste JSON (a list of entries) or CSV, or pick a file. Rows match by
            slug: same slug updates, new slug creates. New rows without a status
            come in as Draft. Pins in a row replace that entry&apos;s pins. Up
            to 500 rows at a time.
          </Text>
          <Box bg={C.raised} borderRadius="8px" p={3}>
            <Text fontSize="xs" color={C.muted} mb={1}>
              CSV header for this game (multi values separated with |, links use
              slugs):
            </Text>
            <Text
              fontSize="xs"
              color={C.text}
              fontFamily="mono"
              wordBreak="break-all"
            >
              {header}
            </Text>
          </Box>
          <label
            style={{
              fontSize: 13,
              color: C.text,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Pick a .json or .csv file
            <input
              type="file"
              accept=".json,.csv,application/json,text/csv"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 4 * 1024 * 1024)
                  return setErr([
                    "File is over 4 MB; split it into smaller files.",
                  ]);
                setText(await f.text());
                setRows(null);
                setReport(null);
              }}
            />
          </label>
          <LongIn
            rows={10}
            value={text}
            onChange={(v) => {
              setText(v);
              setRows(null);
              setReport(null);
            }}
            placeholder='[{"type":"gold-skulltula","title":"Kakariko watchtower","status":"unconfirmed","fields":{"how":"Climb the watchtower at night"},"pins":[{"map":"overworld","x":2410,"y":1180}]}]'
          />
          <Flex gap={2}>
            <Plain
              onClick={() => void run(true)}
              disabled={busy || !text.trim()}
            >
              Check (dry run)
            </Plain>
            <Gold
              onClick={() => void run(false)}
              loading={busy}
              disabled={!report || report.errors.length > 0 || !report.dryRun}
            >
              Import{" "}
              {report && !report.errors.length && report.dryRun
                ? `(${report.created} new, ${report.updated} updated)`
                : ""}
            </Gold>
          </Flex>
          <Problems lines={err} />
          {report && (
            <Box bg={C.raised} borderRadius="8px" p={3}>
              <Text
                color={report.errors.length ? C.bad : C.good}
                fontWeight="700"
              >
                {report.errors.length
                  ? `${report.errors.length} row(s) have problems. Nothing was written.`
                  : report.dryRun
                    ? `Looks good: ${report.created} new, ${report.updated} updated, ${report.pinsReplaced} with pins. Nothing written yet.`
                    : `Imported: ${report.created} new, ${report.updated} updated, ${report.pinsReplaced} with pins.`}
              </Text>
              {report.errors.slice(0, 50).map((r, i) => (
                <Text key={i} fontSize="sm" color={C.bad}>
                  Row {r.row}
                  {r.slug ? ` (${r.slug})` : ""}: {r.errors.join("; ")}
                </Text>
              ))}
            </Box>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
