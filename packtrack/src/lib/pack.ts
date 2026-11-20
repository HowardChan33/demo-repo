import type { Athlete, Pack } from "./types";
import { parseTimeToSeconds } from "./time";

const STORAGE_KEY = "packtrack.v1";

export function loadPack(): Pack | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pack;
  } catch {
    return null;
  }
}

export function savePack(pack: Pack): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
}

export function upsertMember(pack: Pack, athlete: Athlete): Pack {
  const idx = pack.members.findIndex(
    (m) => m.id === athlete.id || (athlete.uid && m.uid === athlete.uid),
  );
  const members = [...pack.members];
  if (idx >= 0) {
    members[idx] = { ...members[idx], ...athlete, isSample: false };
  } else {
    members.push(athlete);
  }

  const raceName =
    athlete.raceName ??
    members.find((m) => m.raceName && !m.isSample)?.raceName ??
    pack.raceLabel;

  return {
    ...pack,
    raceLabel: raceName,
    members,
    updatedAt: new Date().toISOString(),
  };
}

export function removeMember(pack: Pack, id: string): Pack {
  return {
    ...pack,
    members: pack.members.filter((m) => m.id !== id),
    updatedAt: new Date().toISOString(),
  };
}

export function clearSampleMembers(pack: Pack): Pack {
  return {
    ...pack,
    members: pack.members.filter((m) => !m.isSample),
    updatedAt: new Date().toISOString(),
  };
}

export function checkpointOrder(pack: Pack): string[] {
  const counts = new Map<string, number>();
  for (const m of pack.members) {
    m.splits.forEach((s, i) => {
      counts.set(s.name, (counts.get(s.name) ?? 0) + (i + 1));
    });
  }
  return [...counts.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

export function progressRatio(athlete: Athlete, checkpoints: string[]): number {
  if (!checkpoints.length) return 0;
  if (athlete.status === "finished") return 1;
  if (!athlete.splits.length) return 0;
  const last = athlete.splits[athlete.splits.length - 1]?.name;
  const idx = checkpoints.indexOf(last);
  if (idx < 0) return athlete.splits.length / checkpoints.length;
  return (idx + 1) / checkpoints.length;
}

export function sortMembers(members: Athlete[], checkpoints: string[]): Athlete[] {
  return [...members].sort((a, b) => {
    const statusRank = (s: Athlete["status"]) =>
      s === "finished" ? 0 : s === "on_course" ? 1 : s === "unknown" ? 2 : 3;
    const ra = statusRank(a.status);
    const rb = statusRank(b.status);
    if (ra !== rb) return ra - rb;

    const pa = progressRatio(a, checkpoints);
    const pb = progressRatio(b, checkpoints);
    if (pb !== pa) return pb - pa;

    const lastA = a.splits.at(-1)?.timeFromStart ?? a.finishTime;
    const lastB = b.splits.at(-1)?.timeFromStart ?? b.finishTime;
    const sa = parseTimeToSeconds(lastA) ?? Number.POSITIVE_INFINITY;
    const sb = parseTimeToSeconds(lastB) ?? Number.POSITIVE_INFINITY;
    return sa - sb;
  });
}

export function exportPackJson(pack: Pack): string {
  return JSON.stringify(pack, null, 2);
}

export function importPackJson(raw: string): Pack {
  const data = JSON.parse(raw) as Pack;
  if (!data?.members || !Array.isArray(data.members)) {
    throw new Error("Invalid pack JSON");
  }
  return {
    ...data,
    updatedAt: new Date().toISOString(),
  };
}
