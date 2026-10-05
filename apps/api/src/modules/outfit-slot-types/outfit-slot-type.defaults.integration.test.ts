import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { templateDatabaseUrl } from "#test/integration/workerPool.js";

const DEFAULT_SLOT_KEYS = ["top", "bottom", "full-outfit", "footwear", "accessory", "extra"];
const FOOTWEAR_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

const migratedTemplateClient = new Client({
  connectionString: templateDatabaseUrl(process.env.TEST_DATABASE_URL ?? ""),
});

beforeAll(async () => {
  await migratedTemplateClient.connect();
});

afterAll(async () => {
  await migratedTemplateClient.end();
});

const listLinkedProductTypeSlugs = async (slotKey: string): Promise<string[]> => {
  const { rows } = await migratedTemplateClient.query<{ slug: string }>(
    `SELECT product_type.slug
       FROM outfit_slot_type_product_types link
       JOIN outfit_slot_types slot_type ON slot_type.id = link.slot_type_id
       JOIN product_types product_type ON product_type.id = link.product_type_id
      WHERE slot_type.key = $1
      ORDER BY product_type.slug`,
    [slotKey],
  );
  return rows.map((row) => row.slug);
};

describe("the Outfit Build migration's starting data", () => {
  it("ships the six default slot types in order", async () => {
    const { rows } = await migratedTemplateClient.query<{
      key: string;
      max_items: number;
      accepts_any_product_type: boolean;
    }>(
      `SELECT key, max_items, accepts_any_product_type
         FROM outfit_slot_types
        WHERE key = ANY($1)
        ORDER BY sort_order`,
      [DEFAULT_SLOT_KEYS],
    );

    expect(rows.map((row) => row.key)).toEqual(DEFAULT_SLOT_KEYS);
    expect(rows.find((row) => row.key === "extra")).toMatchObject({
      max_items: 3,
      accepts_any_product_type: true,
    });
  });

  it("links each slot to its garment types", async () => {
    expect(await listLinkedProductTypeSlugs("top")).toEqual(["outerwear", "tops"]);
    expect(await listLinkedProductTypeSlugs("bottom")).toEqual(["bottoms", "pants"]);
    expect(await listLinkedProductTypeSlugs("full-outfit")).toEqual([
      "dresses",
      "kurta-set",
      "lehenga",
      "saree",
    ]);
    expect(await listLinkedProductTypeSlugs("footwear")).toEqual(["footwear"]);
    expect(await listLinkedProductTypeSlugs("accessory")).toEqual(["accessories", "headwear"]);
  });

  it("makes Full Outfit block Top and Bottom", async () => {
    const { rows } = await migratedTemplateClient.query<{ key: string }>(
      `SELECT blocked.key
         FROM outfit_slot_type_blocks block
         JOIN outfit_slot_types blocking ON blocking.id = block.slot_type_id
         JOIN outfit_slot_types blocked ON blocked.id = block.blocked_slot_type_id
        WHERE blocking.key = 'full-outfit'
        ORDER BY blocked.key`,
    );

    expect(rows.map((row) => row.key)).toEqual(["bottom", "top"]);
  });

  it("ships sizes for the new garment types", async () => {
    const { rows } = await migratedTemplateClient.query<{ label: string }>(
      `SELECT size_option.label
         FROM size_options size_option
         JOIN product_types product_type ON product_type.id = size_option.product_type_id
        WHERE product_type.slug = 'footwear'
        ORDER BY size_option.sort_order`,
    );

    expect(rows.map((row) => row.label)).toEqual(FOOTWEAR_SIZES);
  });
});
