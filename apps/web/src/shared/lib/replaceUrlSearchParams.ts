const STATE_THAT_LETS_NEXT_SYNC_THE_URL = null;

export const replaceUrlSearchParams = (updateSearchParams: (params: URLSearchParams) => void) => {
  const nextParams = new URLSearchParams(window.location.search);
  updateSearchParams(nextParams);
  const { pathname, hash } = window.location;
  const nextSearch = nextParams.toString();
  window.history.replaceState(
    STATE_THAT_LETS_NEXT_SYNC_THE_URL,
    "",
    `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`,
  );
};
