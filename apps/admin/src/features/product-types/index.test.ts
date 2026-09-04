import { describe, expect, it } from "vitest";

import { productTypesApi, productTypeSchema, ProductTypesPage } from "./index";

describe("product-types barrel", () => {
  it("re-exports the page, the api client and the schema", () => {
    expect(typeof ProductTypesPage).toBe("function");
    expect(typeof productTypesApi.list).toBe("function");
    expect(productTypeSchema.safeParse({}).success).toBe(false);
  });
});
