import { describe, expect, it } from "vitest";

import { GLOSSARY_GROUPS } from "./glossaryTerms";

const allTerms = GLOSSARY_GROUPS.flatMap(({ terms }) => terms);

describe("GLOSSARY_GROUPS", () => {
  it("gives every term a unique id, so links land on the right one", () => {
    const termIds = allTerms.map(({ id }) => id);

    expect(new Set(termIds).size).toBe(termIds.length);
  });

  it("explains every term", () => {
    expect(allTerms.every(({ meaning }) => meaning.length > 0)).toBe(true);
  });
});
