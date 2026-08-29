export const resolveLoginOrigin = (configuredWebUrl: string, currentHostname: string): string => {
  const configured = new URL(configuredWebUrl);
  const isOnConfiguredDomain =
    currentHostname === configured.hostname || currentHostname.endsWith(`.${configured.hostname}`);

  if (!isOnConfiguredDomain) return configuredWebUrl;

  const port = configured.port ? `:${configured.port}` : "";
  return `${configured.protocol}//${currentHostname}${port}`;
};
