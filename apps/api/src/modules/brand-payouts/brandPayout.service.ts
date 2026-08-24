import { BrandPayoutStatus } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";

import { BASIS_POINTS_PER_PERCENT } from "./brandPayout.constants.js";
import { brandPayoutRepository } from "./brandPayout.repository.js";
import type {
  CreatePlatformCommissionRuleBody,
  ListBrandPayoutsQuery,
} from "./brandPayout.schemas.js";
import type {
  BrandPayoutSummary,
  BrandPayoutView,
  PlatformCommissionRuleView,
} from "./brandPayout.types.js";
import { toBrandPayoutView, toPlatformCommissionRuleView } from "./brandPayout.utils.js";

export const brandPayoutService = {
  async listRules(): Promise<PlatformCommissionRuleView[]> {
    const rules = await brandPayoutRepository.listRules();
    return rules.map(toPlatformCommissionRuleView);
  },

  async createRule(
    input: CreatePlatformCommissionRuleBody,
    adminId: string,
  ): Promise<PlatformCommissionRuleView> {
    const ratePercentBasisPoints = Math.round(input.ratePercent * BASIS_POINTS_PER_PERCENT);
    const rule = await brandPayoutRepository.createActiveRule(ratePercentBasisPoints, adminId);
    return toPlatformCommissionRuleView(rule);
  },

  async getSummary(brandId: string): Promise<BrandPayoutSummary> {
    const sums = await brandPayoutRepository.sumByStatusForBrand(brandId);
    const pending = sums[BrandPayoutStatus.PENDING] ?? 0;
    const available = sums[BrandPayoutStatus.AVAILABLE] ?? 0;
    const withdrawn = sums[BrandPayoutStatus.WITHDRAWN] ?? 0;

    return { totalPayouts: pending + available + withdrawn, pending, available, withdrawn };
  },

  async listForBrand(
    brandId: string,
    { cursor, limit }: ListBrandPayoutsQuery,
  ): Promise<{ items: BrandPayoutView[]; nextCursor: string | null }> {
    const rows = await brandPayoutRepository.listForBrand(brandId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return { items: pagedRows.map(toBrandPayoutView), nextCursor };
  },
};
