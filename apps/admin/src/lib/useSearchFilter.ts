import { useNavigate, useSearch } from "@tanstack/react-router";

export type SearchFilterConfig<T extends string> = {
  fallback: T;
  parse: (raw: string | undefined) => T;
};

export const oneOfFilter = <T extends string>(
  allowedValues: readonly T[],
  fallback: T,
): SearchFilterConfig<T> => {
  const allowed = new Set<string>(allowedValues);
  return {
    fallback,
    parse: (raw) => (raw !== undefined && allowed.has(raw) ? (raw as T) : fallback),
  };
};

export const rawTextFilter: SearchFilterConfig<string> = {
  fallback: "",
  parse: (raw) => raw ?? "",
};

export const useSearchFilter = <T extends string>(
  key: string,
  { fallback, parse }: SearchFilterConfig<T>,
): readonly [T, (next: T) => void] => {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const rawValue = search[key];
  const value = parse(typeof rawValue === "string" ? rawValue : undefined);

  const setValue = (next: T) => {
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        [key]: next === fallback ? undefined : next,
      }),
      replace: true,
    });
  };

  return [value, setValue] as const;
};
