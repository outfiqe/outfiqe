import type { Deal } from "../api/pipelineSchemas";

const MILLISECONDS_PER_DAY = 86_400_000;
const NO_DAYS = 0;
const SINGLE_DAY = 1;
const OPEN_DEAL_STATUS = "OPEN";

const toDaysInStage = (stageEnteredAt: string, now: Date): number =>
  Math.floor((now.getTime() - new Date(stageEnteredAt).getTime()) / MILLISECONDS_PER_DAY);

export const toDaysInStageLabel = (
  { status, stageEnteredAt }: Pick<Deal, "status" | "stageEnteredAt">,
  now = new Date(),
): string | null => {
  if (status !== OPEN_DEAL_STATUS) return null;

  const daysInStage = toDaysInStage(stageEnteredAt, now);
  if (daysInStage <= NO_DAYS) return "New in this stage";
  return daysInStage === SINGLE_DAY ? "1 day in this stage" : `${daysInStage} days in this stage`;
};
