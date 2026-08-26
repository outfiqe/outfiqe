import { createHash } from "node:crypto";

export type JobIdParams = {
  checksum: string;
  stage: string;
  transformParams?: Record<string, string | number | boolean>;
};

const stableStringify = (value: Record<string, string | number | boolean> | undefined): string =>
  JSON.stringify(
    Object.entries(value ?? {}).sort(([firstKey], [secondKey]) =>
      firstKey.localeCompare(secondKey),
    ),
  );

export const buildIdempotentJobId = ({ checksum, stage, transformParams }: JobIdParams): string => {
  const hash = createHash("sha256")
    .update(checksum)
    .update(stableStringify(transformParams))
    .digest("hex");
  return `${stage}-${hash}`;
};
