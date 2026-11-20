import type { Athlete, MemberStatus, Split } from "./types";

function textOf(doc: Document, selector: string): string | null {
  const el = doc.querySelector(selector);
  if (!el) return null;
  const t = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return t || null;
}

function mapStatus(raw: string | null): MemberStatus {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s.includes("finish")) return "finished";
  if (s.includes("dnf") || s.includes("did not finish")) return "dnf";
  if (s.includes("dq") || s.includes("disqual")) return "dq";
  if (s.includes("not start") || s.includes("dns")) return "not_started";
  if (s.includes("start") || s.includes("racing") || s.includes("on course")) {
    return "on_course";
  }
  return "unknown";
}

function parsePos(raw: string | null): { pos: string | null; field: string | null } {
  if (!raw) return { pos: null, field: null };
  const [pos, field] = raw.split("/").map((p) => p.trim());
  return { pos: pos || null, field: field || null };
}

function parseBio(doc: Document): Record<string, string> {
  const out: Record<string, string> = {};
  const rows = doc.querySelectorAll("#ctl00_Content_Main_grdBio tr");
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td")).map((td) =>
      (td.textContent ?? "").replace(/\s+/g, " ").trim(),
    );
    if (cells.length < 2) return;
    const key = cells[0].replace(/:$/, "").trim().toLowerCase();
    const value = cells[1];
    if (key && value && !key.includes("favourite")) out[key] = value;
  });
  return out;
}

function firstLine(cell: string): string {
  return cell.split("\n")[0].replace(/\s+/g, " ").trim();
}

function extractParen(cell: string): string | null {
  const m = cell.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : null;
}

function parseSplits(doc: Document): Split[] {
  const table = doc.querySelector("#ctl00_Content_Main_divSplitGrid table");
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].querySelectorAll("td, th")).map((c) =>
    (c.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase(),
  );

  const nameIdx = headerCells.findIndex((h) => h.includes("name"));
  const timeIdx = headerCells.findIndex((h) => h.startsWith("time") || h.includes("time of day"));
  const legIdx = headerCells.findIndex((h) => h.includes("leg"));
  const posIdx = headerCells.findIndex((h) => h.startsWith("pos") || h.includes("c/pos"));
  const gPosIdx = headerCells.findIndex((h) => h.includes("g/pos") || h === "g/pos");

  const splits: Split[] = [];
  for (const row of rows.slice(1)) {
    const cells = Array.from(row.querySelectorAll("td, th")).map((c) =>
      (c.textContent ?? "").replace(/\u00a0/g, " ").trim(),
    );
    if (!cells.length) continue;
    const name = nameIdx >= 0 ? firstLine(cells[nameIdx] ?? "") : firstLine(cells[0] ?? "");
    if (!name || /^name$/i.test(name)) continue;

    const timeCell = timeIdx >= 0 ? cells[timeIdx] ?? "" : cells[1] ?? "";
    const timeFromStart = firstLine(timeCell) || null;
    const timeOfDay = extractParen(timeCell);
    const legTime =
      legIdx >= 0 ? firstLine(cells[legIdx] ?? "") || null : null;

    let posOverall: string | null = null;
    let posCategory: string | null = null;
    if (posIdx >= 0) {
      const posCell = cells[posIdx] ?? "";
      const lines = posCell.split("\n").map((l) => l.trim()).filter(Boolean);
      posOverall = lines[0]?.replace(/[()]/g, "") || null;
      const cat = extractParen(posCell) ?? lines[1]?.replace(/[()]/g, "");
      posCategory = cat || null;
    }

    const posGender =
      gPosIdx >= 0 ? firstLine(cells[gPosIdx] ?? "") || null : null;

    splits.push({
      name,
      timeFromStart,
      legTime,
      timeOfDay,
      posOverall,
      posCategory,
      posGender,
    });
  }
  return splits;
}

function extractUid(html: string, fallback: string | null): string | null {
  const m =
    html.match(/uid=([0-9]+-[0-9]+-[0-9]+-[0-9]+)/i) ||
    html.match(/myresults\.aspx\?uid=([0-9-]+)/i);
  return m?.[1] ?? fallback;
}

export function parseUidParts(uid: string): {
  clubId: string;
  raceId: string;
  eventId: string;
  entryId: string;
} | null {
  const parts = uid.split("-");
  if (parts.length !== 4) return null;
  return {
    clubId: parts[0],
    raceId: parts[1],
    eventId: parts[2],
    entryId: parts[3],
  };
}

export function myresultsUrl(uid: string): string {
  return `https://results.racetimingsolutions.com/myresults.aspx?uid=${uid}`;
}

export function resultsListUrl(uid: string): string | null {
  const p = parseUidParts(uid);
  if (!p) return null;
  return `https://results.racetimingsolutions.com/Results.aspx?CId=${p.clubId}&RId=${p.raceId}&EId=${p.eventId}`;
}

/** Parse a RaceTec / Race Timing Solutions myresults.aspx HTML page. */
export function parseMyResultsHtml(
  html: string,
  opts: { uid?: string | null; isSample?: boolean } = {},
): Athlete {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const bio = parseBio(doc);
  const uid = extractUid(html, opts.uid ?? null);
  const splits = parseSplits(doc);

  const oPos = parsePos(textOf(doc, "#ctl00_Content_Main_lblOPos1, #ctl00_Content_Main_lblOPos2"));
  const cPos = parsePos(textOf(doc, "#ctl00_Content_Main_lblCPos1, #ctl00_Content_Main_lblCPos2"));
  const gPos = parsePos(textOf(doc, "#ctl00_Content_Main_lblGPos1, #ctl00_Content_Main_lblGPos2"));

  const statusRaw = bio.status ?? null;
  let status = mapStatus(statusRaw);
  const finishTime =
    textOf(doc, "#ctl00_Content_Main_lblTime1Large, #ctl00_Content_Main_lblTime2Large") ??
    textOf(doc, "#ctl00_Content_Main_lblTime1Small, #ctl00_Content_Main_lblTime2Small");

  if (status === "unknown") {
    if (finishTime) status = "finished";
    else if (splits.length > 0) status = "on_course";
  }

  const name =
    textOf(doc, "#ctl00_Content_Main_lblName") ??
    "Unknown athlete";

  return {
    id: uid ?? `local-${crypto.randomUUID()}`,
    uid,
    sourceUrl: uid ? myresultsUrl(uid) : null,
    name,
    bib: textOf(doc, "#ctl00_Content_Main_lblRaceNo") ?? bio["race no"] ?? null,
    event: textOf(doc, "#ctl00_Content_Main_lblEvent"),
    eventDate: textOf(doc, "#ctl00_Content_Main_lblEventDate"),
    raceName: textOf(doc, "#ctl00_lblRaceName"),
    category: bio.category ?? null,
    gender: bio.gender ?? null,
    team: bio.team || null,
    status,
    finishTime,
    posOverall: oPos.pos,
    posCategory: cPos.pos,
    posGender: gPos.pos,
    splits,
    isSample: Boolean(opts.isSample),
    updatedAt: new Date().toISOString(),
  };
}

/** Best-effort parse of pasted plain text / TSV from a results page. */
export function parseLoosePaste(
  text: string,
  opts: { uid?: string | null; name?: string } = {},
): Athlete {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const splits: Split[] = [];
  for (const line of lines) {
    // e.g. "KM 14,2  01:05:22  01:05:08" or "CP1\t1:05:22"
    const m = line.match(
      /^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:\s+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?$/,
    );
    if (!m) continue;
    const maybeName = m[1].trim();
    if (/^(name|pos|bib|time|net)/i.test(maybeName)) continue;
    splits.push({
      name: maybeName,
      timeFromStart: m[2],
      legTime: m[3] ?? null,
      timeOfDay: null,
      posOverall: null,
      posCategory: null,
      posGender: null,
    });
  }

  const uid = opts.uid ?? null;
  return {
    id: uid ?? `local-${crypto.randomUUID()}`,
    uid,
    sourceUrl: uid ? myresultsUrl(uid) : null,
    name: opts.name ?? "Pasted athlete",
    bib: null,
    event: null,
    eventDate: null,
    raceName: null,
    category: null,
    gender: null,
    team: null,
    status: splits.length ? "on_course" : "unknown",
    finishTime: null,
    posOverall: null,
    posCategory: null,
    posGender: null,
    splits,
    isSample: false,
    updatedAt: new Date().toISOString(),
  };
}

export function looksLikeHtml(input: string): boolean {
  return /<html|<span|<table|ctl00_Content_Main/i.test(input);
}
