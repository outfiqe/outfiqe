export const BOT_USER_AGENT_PATTERNS = [
  "bot",
  "spider",
  "crawler",
  "crawl",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "axios",
  "node-fetch",
  "headlesschrome",
  "phantomjs",
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "discordbot",
] as const;

export const isLikelyBotUserAgent = (userAgent: string | undefined): boolean => {
  if (!userAgent) return true;
  const normalized = userAgent.toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
};
