const fallbackSiteUrl = "http://localhost:3000";

export const siteUrl = (process.env.SITE_URL ?? fallbackSiteUrl).replace(/\/$/, "");

export const siteName = "Outfiqe";

export const siteTagline = "Nepali fashion, worn by real creators";

export const siteDescription =
  "Outfiqe is a Nepali fashion marketplace. It pairs every brand with real creator looks so you can see the fit before you buy, then lets you shop across brands in one cart with delivery anywhere in Nepal.";

export const organization = {
  legalName: "Outfiqe",
  foundingCountry: "NP",
  areaServed: "Nepal",
  languages: ["en", "ne"],
} as const;

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export const socialProfileUrls = (process.env.NEXT_PUBLIC_SOCIAL_URLS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

export const absoluteUrl = (path: string): string => {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

export const logoUrl = absoluteUrl("/logo.svg");
