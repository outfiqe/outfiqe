import { describe, expect, it } from "vitest";

import { parsePushMessage } from "./pushMessage";

describe("parsePushMessage", () => {
  it("reads the title, body, url, and tag the server sent", () => {
    const raw = JSON.stringify({
      title: "New like",
      body: "Someone liked your look",
      url: "/profile",
      tag: "LOOK_LIKED:look-1",
    });

    expect(parsePushMessage(raw)).toEqual({
      title: "New like",
      body: "Someone liked your look",
      url: "/profile",
      tag: "LOOK_LIKED:look-1",
    });
  });

  it("falls back to a generic notification when the body is missing", () => {
    expect(parsePushMessage(undefined).title).toBe("Outfiqe");
    expect(parsePushMessage(undefined).url).toBe("/notifications");
  });

  it("falls back when the payload is not valid json", () => {
    expect(parsePushMessage("not json").title).toBe("Outfiqe");
  });

  it("fills only the missing fields when the payload is partial", () => {
    const message = parsePushMessage(JSON.stringify({ title: "Just a title" }));

    expect(message.title).toBe("Just a title");
    expect(message.url).toBe("/notifications");
  });
});
