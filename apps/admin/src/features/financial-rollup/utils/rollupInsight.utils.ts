import type { FinancialRollup } from "../api/financialRollupSchemas";
import { money } from "../constants/financialRollup.constants";

export type RollupInsight = {
  tone: "negative" | "neutral";
  headline: string;
  detail: string;
};

const NOTHING_COLLECTED = 0;

export const buildRollupInsight = ({ gateway, ledger }: FinancialRollup): RollupInsight => {
  const { grossCollected, netHeld } = gateway;
  const { owedToBrands, owedToCreators } = ledger;
  const totalOwed = owedToBrands + owedToCreators;

  if (grossCollected === NOTHING_COLLECTED && totalOwed === NOTHING_COLLECTED) {
    return {
      tone: "neutral",
      headline: "No money moved in this period",
      detail: "Numbers appear here once orders are paid.",
    };
  }

  if (totalOwed > netHeld) {
    return {
      tone: "negative",
      headline: "You owe more than you hold",
      detail: `You hold ${money(netHeld)} but owe ${money(totalOwed)} to brands and muses in this period.`,
    };
  }

  return {
    tone: "neutral",
    headline: `You hold ${money(netHeld)}`,
    detail: `Of that, ${money(owedToBrands)} is owed to brands and ${money(owedToCreators)} to muses.`,
  };
};
