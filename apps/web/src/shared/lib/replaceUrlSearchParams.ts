export const replaceUrlSearchParams = (updateSearchParams: (params: URLSearchParams) => void) => {
  const nextParams = new URLSearchParams(window.location.search);
  updateSearchParams(nextParams);
  const { pathname, hash } = window.location;
  const nextSearch = nextParams.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`,
  );
};
