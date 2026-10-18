import { describe, expect, it } from "vitest";

import { CsvParseError, parseCsv } from "./csv.utils.js";

describe("parseCsv", () => {
  it("splits rows and fields", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles Windows line endings, a byte order mark and a trailing newline", () => {
    expect(parseCsv("﻿ref,status\r\nPX-1,Delivered\r\n")).toEqual([
      ["ref", "status"],
      ["PX-1", "Delivered"],
    ]);
  });

  it("keeps commas, quotes and line breaks inside quoted values", () => {
    expect(
      parseCsv('ref,reason\nPX-1,"Gate locked, called twice"\nPX-2,"Said ""later""\nnext day"'),
    ).toEqual([
      ["ref", "reason"],
      ["PX-1", "Gate locked, called twice"],
      ["PX-2", 'Said "later"\nnext day'],
    ]);
  });

  it("keeps empty fields and drops blank lines", () => {
    expect(parseCsv("a,,c\n\n,,\n1,,3")).toEqual([
      ["a", "", "c"],
      ["1", "", "3"],
    ]);
  });

  it("returns no rows for empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("rejects a quoted value that is never closed", () => {
    expect(() => parseCsv('a,"b\nc')).toThrow(CsvParseError);
  });
});
