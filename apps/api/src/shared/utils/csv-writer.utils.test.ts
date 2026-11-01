import { describe, expect, it } from "vitest";

import { toCsv, toCsvField } from "./csv-writer.utils.js";

describe("toCsvField", () => {
  it("keeps plain text and numbers as they are", () => {
    expect(toCsvField("Boutique KTM")).toBe("Boutique KTM");
    expect(toCsvField(1500)).toBe("1500");
  });

  it("leaves an empty cell for a missing value", () => {
    expect(toCsvField(null)).toBe("");
  });

  it.each(["=SUM(A1)", "+977", "-1", "@cmd", "\tcell"])(
    "stops %s from running as a spreadsheet formula",
    (dangerousText) => {
      expect(toCsvField(dangerousText).replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("quotes commas, quotes and line breaks", () => {
    expect(toCsvField('Ram, "Thapa"')).toBe('"Ram, ""Thapa"""');
    expect(toCsvField("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("toCsv", () => {
  it("writes a header row then one row per record", () => {
    expect(
      toCsv(
        ["Name", "Value"],
        [
          ["Ram", 1],
          ["Sita", null],
        ],
      ),
    ).toBe("Name,Value\r\nRam,1\r\nSita,");
  });

  it("writes only the header when there are no rows", () => {
    expect(toCsv(["Name"], [])).toBe("Name");
  });
});
