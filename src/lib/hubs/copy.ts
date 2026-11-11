// Mega hub wording from the API (GET /game-hubs/:slug/copy): every label on
// the hub page, set in Admin > Mega hubs > Wording (per game, over the
// default wording, over the API's built-in catalog). Nothing here defines
// wording: it only fills tokens and reads keys.
//
// A key the API didn't send renders as "" (callers skip empty labels), never
// as code text. Values are plain text: React escapes them like any string.

export interface HubCopy {
  version: string;
  copy: Record<string, string>;
  lists: Record<string, string[]>;
}

export type CopyVars = Record<string, string | number | null | undefined>;

/** One run of a filled label: plain text, or a token's value (so a caller
 *  can style it, e.g. a gold score inside a sentence). */
export type CopyPart = { text: string; token?: string };

const TOKEN_RE = /\{([a-zA-Z]+)\}/g;

export interface HubT {
  (key: string, vars?: CopyVars): string;
  /** The label split around its tokens, for styled values. */
  parts: (key: string, vars?: CopyVars) => CopyPart[];
  /** A list's item keys in the API's order (bands, criteria, platforms...). */
  list: (name: string) => string[];
}

const val = (vars: CopyVars | undefined, token: string) => {
  const v = vars?.[token];
  return v == null ? "" : String(v);
};

export function makeHubT(copy: HubCopy): HubT {
  const raw = (key: string) => copy.copy[key] ?? "";
  const t = ((key: string, vars?: CopyVars) =>
    raw(key).replace(TOKEN_RE, (_m, token: string) =>
      val(vars, token),
    )) as HubT;
  t.parts = (key, vars) => {
    const out: CopyPart[] = [];
    const s = raw(key);
    let last = 0;
    for (const m of s.matchAll(TOKEN_RE)) {
      const at = m.index ?? 0;
      if (at > last) out.push({ text: s.slice(last, at) });
      out.push({ text: val(vars, m[1]), token: m[1] });
      last = at + m[0].length;
    }
    if (last < s.length) out.push({ text: s.slice(last) });
    return out;
  };
  t.list = (name) => copy.lists[name] ?? [];
  return t;
}
