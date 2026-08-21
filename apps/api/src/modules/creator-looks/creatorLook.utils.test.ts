import { describe, expect, it } from "vitest";

import { isLikelyBotUserAgent } from "./creatorLook.utils.js";

describe("isLikelyBotUserAgent", () => {
  it("treats a missing User-Agent as a bot", () => {
    expect(isLikelyBotUserAgent(undefined)).toBe(true);
  });

  it.each([
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "curl/8.0.1",
    "Wget/1.21",
    "python-requests/2.31.0",
    "axios/1.6.0",
    "Mozilla/5.0 (compatible; DiscordBot/2.0; +https://discordapp.com)",
    "facebookexternalhit/1.1",
  ])("flags a known crawler User-Agent: %s", (userAgent) => {
    expect(isLikelyBotUserAgent(userAgent)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  ])("allows a real browser User-Agent: %s", (userAgent) => {
    expect(isLikelyBotUserAgent(userAgent)).toBe(false);
  });
});
