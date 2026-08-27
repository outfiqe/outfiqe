import { describe, expect, it } from "vitest";

import { env } from "#config/env.config.js";

import {
  collectDesignConfigImageUrls,
  hasOnlyManagedImageUrls,
  isManagedUploadUrl,
  parseDesignConfig,
} from "./badge.utils.js";

const managed = (name: string) => `${env.API_PUBLIC_URL}/uploads/${name}`;

describe("parseDesignConfig", () => {
  it("returns the parsed config for a valid shape", () => {
    expect(parseDesignConfig({ shape: "star", primaryColor: "#f97316" })).toEqual({
      shape: "star",
      primaryColor: "#f97316",
    });
  });

  it("returns null for an unsupported shape value", () => {
    expect(parseDesignConfig({ shape: "octagon", primaryColor: "#f97316" })).toBeNull();
  });

  it("returns null when primaryColor is missing", () => {
    expect(parseDesignConfig({ shape: "circle" })).toBeNull();
  });

  it("returns null for null, undefined, or a non-object value", () => {
    expect(parseDesignConfig(null)).toBeNull();
    expect(parseDesignConfig(undefined)).toBeNull();
    expect(parseDesignConfig("circle")).toBeNull();
  });

  it("keeps a simple config's imageUrl and a studio image layer", () => {
    expect(
      parseDesignConfig({ shape: "circle", primaryColor: "#000000", imageUrl: managed("a.png") }),
    ).toMatchObject({ imageUrl: managed("a.png") });

    const studio = parseDesignConfig({
      version: 2,
      layers: [
        {
          id: "l1",
          type: "image",
          url: managed("b.png"),
          fit: "cover",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
    });
    expect(studio).not.toBeNull();
  });
});

describe("isManagedUploadUrl", () => {
  it("accepts a url under the api uploads path and rejects anything else", () => {
    expect(isManagedUploadUrl(managed("icon.png"))).toBe(true);
    expect(isManagedUploadUrl("https://evil.example.com/uploads/icon.png")).toBe(false);
    expect(isManagedUploadUrl("/uploads/icon.png")).toBe(false);
  });
});

describe("collectDesignConfigImageUrls", () => {
  it("returns the simple config's imageUrl when present, otherwise an empty list", () => {
    expect(
      collectDesignConfigImageUrls({
        shape: "circle",
        primaryColor: "#000",
        imageUrl: managed("a.png"),
      }),
    ).toEqual([managed("a.png")]);
    expect(collectDesignConfigImageUrls({ shape: "circle", primaryColor: "#000" })).toEqual([]);
  });

  it("returns every image layer url from a studio config", () => {
    expect(
      collectDesignConfigImageUrls({
        version: 2,
        layers: [
          {
            id: "bg",
            type: "background",
            shape: "circle",
            fill: "#000",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
          {
            id: "i1",
            type: "image",
            url: managed("a.png"),
            fit: "contain",
            x: 0,
            y: 0,
            width: 50,
            height: 50,
          },
          {
            id: "i2",
            type: "image",
            url: managed("b.png"),
            fit: "cover",
            x: 0,
            y: 0,
            width: 50,
            height: 50,
          },
        ],
      }),
    ).toEqual([managed("a.png"), managed("b.png")]);
  });
});

describe("hasOnlyManagedImageUrls", () => {
  it("is true when there are no image urls", () => {
    expect(hasOnlyManagedImageUrls({ shape: "circle", primaryColor: "#000" })).toBe(true);
  });

  it("is false when any image url is not managed", () => {
    expect(
      hasOnlyManagedImageUrls({
        shape: "circle",
        primaryColor: "#000",
        imageUrl: "https://evil.example.com/x.png",
      }),
    ).toBe(false);
  });
});
