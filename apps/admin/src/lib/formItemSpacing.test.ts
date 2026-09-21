import { describe, expect, it } from "vitest";

const SOURCES_BY_PATH = import.meta.glob("/src/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FORM_ITEM_WITHOUT_RESET = /<FormItem(?!\s+className=(?:"mt-0[ "]|\{`mt-0 ))/;

describe("FormItem spacing", () => {
  it("resets the stacked top margin on every admin form field so fields in a row stay level", () => {
    const offendingFiles = Object.entries(SOURCES_BY_PATH)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, source]) => FORM_ITEM_WITHOUT_RESET.test(source))
      .map(([path]) => path);

    expect(offendingFiles).toEqual([]);
  });
});
