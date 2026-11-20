import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMyResultsHtml } from "./parser";

describe("parseMyResultsHtml", () => {
  it("parses a RaceTec myresults fixture with splits", () => {
    const html = readFileSync(
      join(process.cwd(), "src/fixtures/detailed_splits.html"),
      "utf8",
    );
    const athlete = parseMyResultsHtml(html, { uid: "16648-117-1-42147" });
    expect(athlete.name).toContain("Palici");
    expect(athlete.bib).toBe("1");
    expect(athlete.finishTime).toBe("03:29:24");
    expect(athlete.status).toBe("finished");
    expect(athlete.splits.length).toBe(3);
    expect(athlete.splits[1].name).toBe("KM 28,7");
    expect(athlete.splits[1].legTime).toBe("01:15:27");
  });
});
