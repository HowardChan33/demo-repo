export type MemberStatus =
  | "unknown"
  | "not_started"
  | "on_course"
  | "finished"
  | "dnf"
  | "dq";

export interface Split {
  name: string;
  /** Cumulative time from start, e.g. 01:15:27 */
  timeFromStart: string | null;
  /** Leg / segment time */
  legTime: string | null;
  timeOfDay: string | null;
  posOverall: string | null;
  posCategory: string | null;
  posGender: string | null;
}

export interface Athlete {
  id: string;
  uid: string | null;
  sourceUrl: string | null;
  name: string;
  bib: string | null;
  event: string | null;
  eventDate: string | null;
  raceName: string | null;
  category: string | null;
  gender: string | null;
  team: string | null;
  status: MemberStatus;
  finishTime: string | null;
  posOverall: string | null;
  posCategory: string | null;
  posGender: string | null;
  splits: Split[];
  isSample: boolean;
  updatedAt: string;
}

export interface Pack {
  id: string;
  name: string;
  raceLabel: string;
  notes: string;
  seedUid: string;
  members: Athlete[];
  createdAt: string;
  updatedAt: string;
}
