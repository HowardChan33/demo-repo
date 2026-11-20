import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  checkpointOrder,
  clearSampleMembers,
  exportPackJson,
  importPackJson,
  loadPack,
  progressRatio,
  removeMember,
  savePack,
  sortMembers,
  upsertMember,
} from "./lib/pack";
import {
  looksLikeHtml,
  myresultsUrl,
  parseLoosePaste,
  parseMyResultsHtml,
  parseUidParts,
  resultsListUrl,
} from "./lib/parser";
import { createSamplePack, SEED_UID } from "./lib/sample";
import { formatGap, formatSeconds, parseTimeToSeconds } from "./lib/time";
import type { Athlete, Pack } from "./lib/types";

type Toast = { kind: "ok" | "err"; text: string } | null;

function statusLabel(status: Athlete["status"]): string {
  switch (status) {
    case "on_course":
      return "On course";
    case "finished":
      return "Finished";
    case "dnf":
      return "DNF";
    case "dq":
      return "DQ";
    case "not_started":
      return "Not started";
    default:
      return "Awaiting data";
  }
}

function lastSplit(athlete: Athlete) {
  return athlete.splits.at(-1) ?? null;
}

export default function App() {
  const [pack, setPack] = useState<Pack>(() => loadPack() ?? createSamplePack());
  const [paste, setPaste] = useState("");
  const [uidInput, setUidInput] = useState(SEED_UID);
  const [nameHint, setNameHint] = useState("");
  const [packName, setPackName] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [showImport, setShowImport] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    savePack(pack);
  }, [pack]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const checkpoints = useMemo(() => checkpointOrder(pack), [pack]);
  const ranked = useMemo(
    () => sortMembers(pack.members, checkpoints),
    [pack.members, checkpoints],
  );

  const hasSample = pack.members.some((m) => m.isSample);
  const liveCount = pack.members.filter((m) => !m.isSample).length;
  const onCourse = pack.members.filter((m) => m.status === "on_course").length;
  const finished = pack.members.filter((m) => m.status === "finished").length;

  const leader = ranked.find((m) => m.splits.length > 0 || m.finishTime);

  function notify(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
  }

  function applyAthlete(athlete: Athlete, wipeSamples = false) {
    setPack((prev) => {
      let next = wipeSamples ? clearSampleMembers(prev) : prev;
      next = upsertMember(next, athlete);
      if (packName.trim()) next = { ...next, name: packName.trim() };
      return next;
    });
  }

  function handleImportPaste() {
    const raw = paste.trim();
    if (!raw) {
      notify("err", "Paste RaceTec myresults HTML (or split lines) first.");
      return;
    }
    try {
      const athlete = looksLikeHtml(raw)
        ? parseMyResultsHtml(raw, { uid: uidInput.trim() || SEED_UID })
        : parseLoosePaste(raw, {
            uid: uidInput.trim() || null,
            name: nameHint.trim() || undefined,
          });
      if (!athlete.splits.length && !athlete.finishTime && athlete.name === "Unknown athlete") {
        notify("err", "Could not find athlete data in that paste.");
        return;
      }
      applyAthlete(athlete, hasSample);
      setPaste("");
      setShowImport(false);
      notify("ok", `Updated ${athlete.name}`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Parse failed");
    }
  }

  function handleAddUidPlaceholder() {
    const uid = uidInput.trim();
    const parts = parseUidParts(uid);
    if (!parts) {
      notify("err", "UID should look like 16387-6650-1-182993");
      return;
    }
    const athlete: Athlete = {
      id: uid,
      uid,
      sourceUrl: myresultsUrl(uid),
      name: nameHint.trim() || `Athlete ${parts.entryId}`,
      bib: null,
      event: null,
      eventDate: null,
      raceName: pack.raceLabel,
      category: null,
      gender: null,
      team: pack.name,
      status: "unknown",
      finishTime: null,
      posOverall: null,
      posCategory: null,
      posGender: null,
      splits: [],
      isSample: false,
      updatedAt: new Date().toISOString(),
    };
    applyAthlete(athlete, false);
    notify("ok", "Added to pack — paste their myresults HTML to fill splits.");
  }

  function handleResetSample() {
    const fresh = createSamplePack();
    if (packName.trim()) fresh.name = packName.trim();
    setPack(fresh);
    setShowImport(true);
    notify("ok", "Restored sample pack");
  }

  function handleExport() {
    const blob = new Blob([exportPackJson(pack)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pack.name.replace(/\s+/g, "-").toLowerCase()}-packtrack.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const next = importPackJson(text);
      setPack(next);
      setShowImport(false);
      notify("ok", "Pack imported");
    } catch {
      notify("err", "Could not read that pack JSON");
    }
  }

  const seedUrl = myresultsUrl(SEED_UID);
  const listUrl = resultsListUrl(SEED_UID);

  return (
    <div className="app">
      <header className="hero">
        <h1 className="brand">PACKTRACK</h1>
        <p className="tagline">
          Track your crew through RaceTec checkpoints — last known split, pack gaps,
          and who is still on course.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={() => setShowImport(true)}>
            Paste myresults
          </button>
          <a className="btn btn-amber" href={seedUrl} target="_blank" rel="noreferrer">
            Open seed result
          </a>
          {listUrl ? (
            <a className="btn btn-ghost" href={listUrl} target="_blank" rel="noreferrer">
              Race results list
            </a>
          ) : null}
        </div>
        <div className="meta-strip">
          <span>
            Pack <strong>{pack.name}</strong>
          </span>
          <span>
            Race <strong>{pack.raceLabel}</strong>
          </span>
          <span>
            Seed UID <strong>{SEED_UID}</strong>
          </span>
        </div>
        {hasSample ? (
          <div className="sample-banner">
            Showing <strong>sample data</strong> so the board isn’t empty. Live splits are on{" "}
            <a href={seedUrl} target="_blank" rel="noreferrer">
              Race Timing Solutions / RaceTec
            </a>
            . Open that page, View Source / copy the HTML, and paste it below to replace the samples.
          </div>
        ) : null}
      </header>

      <section className="board">
        <div className="summary">
          <div className="stat">
            <div className="stat-label">In pack</div>
            <div className="stat-value">{pack.members.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Live imports</div>
            <div className="stat-value">{liveCount}</div>
          </div>
          <div className="stat">
            <div className="stat-label">On course</div>
            <div className="stat-value">{onCourse}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Finished</div>
            <div className="stat-value">{finished}</div>
          </div>
        </div>

        <h2 className="section-title">Crew board</h2>
        <div className="roster">
          {ranked.map((member, index) => {
            const last = lastSplit(member);
            const ratio = progressRatio(member, checkpoints);
            const leaderLast = leader ? lastSplit(leader) : null;
            const gap =
              leader && member.id !== leader.id
                ? formatGap(last?.timeFromStart ?? member.finishTime, leaderLast?.timeFromStart ?? leader.finishTime)
                : "lead";
            return (
              <article className="member" key={member.id} style={{ animationDelay: `${index * 0.04}s` }}>
                <div className="member-head">
                  <h3 className="member-name">{member.name}</h3>
                  <p className="member-sub">
                    {member.bib ? `#${member.bib}` : "No bib"}
                    {member.category ? ` · ${member.category}` : ""}
                    {member.posOverall ? ` · Overall ${member.posOverall}` : ""}
                  </p>
                  <span className={`badge ${member.status}`}>
                    {statusLabel(member.status)}
                    {member.isSample ? <span className="badge sample">Sample</span> : null}
                  </span>
                </div>

                <div className="progress-wrap">
                  <div className="progress-meta">
                    <span>
                      {last
                        ? `Last: ${last.name}`
                        : member.finishTime
                          ? "Finish"
                          : "No splits yet"}
                    </span>
                    <strong>
                      {member.finishTime ??
                        last?.timeFromStart ??
                        formatSeconds(parseTimeToSeconds(null))}
                    </strong>
                  </div>
                  <div className="track" aria-hidden>
                    <span style={{ width: `${Math.max(ratio * 100, member.splits.length ? 8 : 0)}%` }} />
                  </div>
                  <div className="checkpoints">
                    {checkpoints.map((cp) => {
                      const hit = member.splits.find((s) => s.name === cp);
                      return (
                        <span className={`chip ${hit ? "done" : ""}`} key={cp}>
                          {cp}
                          {hit?.timeFromStart ? ` ${hit.timeFromStart}` : ""}
                        </span>
                      );
                    })}
                    {!checkpoints.length ? <span className="chip">Awaiting checkpoints</span> : null}
                  </div>
                  <div className="progress-meta" style={{ marginTop: "0.55rem" }}>
                    <span>Gap to pack lead</span>
                    <span>{gap}</span>
                  </div>
                </div>

                <div className="member-actions">
                  {member.sourceUrl ? (
                    <a className="btn btn-ghost" href={member.sourceUrl} target="_blank" rel="noreferrer">
                      RaceTec
                    </a>
                  ) : null}
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setUidInput(member.uid ?? "");
                      setNameHint(member.name);
                      setShowImport(true);
                    }}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setPack((p) => removeMember(p, member.id));
                      notify("ok", `Removed ${member.name}`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {checkpoints.length > 0 ? (
          <>
            <h2 className="section-title">Split matrix</h2>
            <div className="matrix">
              <table>
                <thead>
                  <tr>
                    <th>Athlete</th>
                    {checkpoints.map((cp) => (
                      <th key={cp}>{cp}</th>
                    ))}
                    <th>Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((member) => (
                    <tr key={`row-${member.id}`}>
                      <td>
                        {member.name}
                        {member.isSample ? " · sample" : ""}
                      </td>
                      {checkpoints.map((cp) => {
                        const hit = member.splits.find((s) => s.name === cp);
                        return (
                          <td className="time" key={`${member.id}-${cp}`}>
                            {hit?.timeFromStart ?? "—"}
                          </td>
                        );
                      })}
                      <td className="time">{member.finishTime ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {showImport ? (
          <>
            <h2 className="section-title">Import athlete</h2>
            <div className="panel">
              <p>
                Race Timing Solutions pages are Cloudflare-protected from this host, so PackTrack
                cannot auto-pull live splits. On your phone/laptop: open the myresults link → copy
                page HTML (or select the splits table text) → paste here.
              </p>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="uid">RaceTec UID</label>
                  <input
                    id="uid"
                    value={uidInput}
                    onChange={(e) => setUidInput(e.target.value)}
                    placeholder="16387-6650-1-182993"
                  />
                </div>
                <div className="field">
                  <label htmlFor="nameHint">Name hint (optional)</label>
                  <input
                    id="nameHint"
                    value={nameHint}
                    onChange={(e) => setNameHint(e.target.value)}
                    placeholder="Used for plain-text pastes"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="packName">Pack name</label>
                <input
                  id="packName"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder={pack.name}
                />
              </div>
              <div className="field">
                <label htmlFor="paste">myresults HTML or split lines</label>
                <textarea
                  id="paste"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={"Paste page HTML, or lines like:\nCP1  00:42:10\nCP2  01:28:44"}
                />
              </div>
              <div className="cta-row">
                <button className="btn btn-primary" type="button" onClick={handleImportPaste}>
                  Parse &amp; add to pack
                </button>
                <button className="btn btn-ghost" type="button" onClick={handleAddUidPlaceholder}>
                  Add UID placeholder
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowImport(false)}>
                  Hide
                </button>
              </div>
            </div>
          </>
        ) : null}

        <h2 className="section-title">Pack tools</h2>
        <div className="panel">
          <div className="cta-row">
            <button className="btn btn-ghost" type="button" onClick={handleExport}>
              Export JSON
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleResetSample}>
              Reset sample pack
            </button>
            {hasSample ? (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setPack((p) => clearSampleMembers(p));
                  notify("ok", "Cleared sample athletes");
                }}
              >
                Clear samples
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <p className="footer-note">
        Data source: Race Timing Solutions (RaceTec Live-to-Web). Pack saved in this browser.
        Last local update {new Date(pack.updatedAt).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" })}{" "}
        (Hong Kong time).
      </p>

      {toast ? <div className="toast">{toast.text}</div> : null}
    </div>
  );
}
