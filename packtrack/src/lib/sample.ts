import type { Athlete, Pack } from "./types";
import { myresultsUrl } from "./parser";

const SEED_UID = "16387-6650-1-182993";

const now = () => new Date().toISOString();

function sampleAthlete(partial: Partial<Athlete> & Pick<Athlete, "id" | "name">): Athlete {
  return {
    uid: null,
    sourceUrl: null,
    bib: null,
    event: "Team Event",
    eventDate: null,
    raceName: "Race Timing Solutions · RId 6650",
    category: null,
    gender: null,
    team: "PackTrack Crew",
    status: "on_course",
    finishTime: null,
    posOverall: null,
    posCategory: null,
    posGender: null,
    splits: [],
    isSample: true,
    updatedAt: now(),
    ...partial,
  };
}

/** Sample pack so the board is usable before you paste live RaceTec HTML. */
export function createSamplePack(): Pack {
  const members: Athlete[] = [
    sampleAthlete({
      id: SEED_UID,
      uid: SEED_UID,
      sourceUrl: myresultsUrl(SEED_UID),
      name: "Seed athlete (your link)",
      bib: "—",
      category: "Awaiting paste",
      status: "unknown",
      splits: [],
      isSample: true,
    }),
    sampleAthlete({
      id: "sample-a",
      name: "Alex Chen",
      bib: "102",
      category: "Open",
      gender: "Male",
      status: "on_course",
      posOverall: "18",
      splits: [
        { name: "CP1", timeFromStart: "00:42:10", legTime: "00:42:10", timeOfDay: null, posOverall: "22", posCategory: null, posGender: null },
        { name: "CP2", timeFromStart: "01:28:44", legTime: "00:46:34", timeOfDay: null, posOverall: "19", posCategory: null, posGender: null },
        { name: "CP3", timeFromStart: "02:11:05", legTime: "00:42:21", timeOfDay: null, posOverall: "18", posCategory: null, posGender: null },
      ],
    }),
    sampleAthlete({
      id: "sample-b",
      name: "Mei Wong",
      bib: "214",
      category: "Open",
      gender: "Female",
      status: "on_course",
      posOverall: "31",
      splits: [
        { name: "CP1", timeFromStart: "00:45:02", legTime: "00:45:02", timeOfDay: null, posOverall: "40", posCategory: null, posGender: null },
        { name: "CP2", timeFromStart: "01:34:18", legTime: "00:49:16", timeOfDay: null, posOverall: "35", posCategory: null, posGender: null },
        { name: "CP3", timeFromStart: "02:18:50", legTime: "00:44:32", timeOfDay: null, posOverall: "31", posCategory: null, posGender: null },
      ],
    }),
    sampleAthlete({
      id: "sample-c",
      name: "Jordan Lee",
      bib: "088",
      category: "Open",
      gender: "Male",
      status: "finished",
      finishTime: "03:02:41",
      posOverall: "12",
      splits: [
        { name: "CP1", timeFromStart: "00:39:55", legTime: "00:39:55", timeOfDay: null, posOverall: "14", posCategory: null, posGender: null },
        { name: "CP2", timeFromStart: "01:21:10", legTime: "00:41:15", timeOfDay: null, posOverall: "13", posCategory: null, posGender: null },
        { name: "CP3", timeFromStart: "02:01:33", legTime: "00:40:23", timeOfDay: null, posOverall: "12", posCategory: null, posGender: null },
        { name: "Finish", timeFromStart: "03:02:41", legTime: "01:01:08", timeOfDay: null, posOverall: "12", posCategory: null, posGender: null },
      ],
    }),
  ];

  return {
    id: "pack-default",
    name: "PackTrack Crew",
    raceLabel: "RTS · CId 16387 · RId 6650",
    notes:
      "Live splits live on Race Timing Solutions (RaceTec). This board starts with sample teammates — paste myresults HTML to replace with your pack.",
    seedUid: SEED_UID,
    members,
    createdAt: now(),
    updatedAt: now(),
  };
}

export { SEED_UID };
