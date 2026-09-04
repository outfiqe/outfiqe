const HOST_SEPARATOR = ",";

const toHostname = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).hostname;
  } catch {
    return trimmed;
  }
};

export const toImageHosts = (
  configuredHosts: string | undefined,
  apiOrigin: string | undefined,
): string[] => {
  const candidates = [...(configuredHosts ?? "").split(HOST_SEPARATOR), apiOrigin ?? ""];

  return [...new Set(candidates.map(toHostname).filter(Boolean))];
};
