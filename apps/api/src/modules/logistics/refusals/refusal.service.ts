import { PLATFORM_DEFAULT_COUNTRY_CODE } from "#constants/country.constants.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import {
  type CashOnDeliveryEligibility,
  checkCashOnDeliveryEligibility,
} from "./refusal.eligibility.js";
import { type CustomerIdentity, logisticsRefusalRepository } from "./refusal.repository.js";
import type { ClearRefusalsBody, CodEligibilityQuery } from "./refusal.schemas.js";

const ORDER_AUDIT_TARGET_TYPE = "order";

export type CustomerRefusalsView = CashOnDeliveryEligibility & {
  refusals: { id: string; orderId: string; refusedAt: string }[];
};

export type ShopperCodEligibility = Omit<CashOnDeliveryEligibility, "refusalCount">;

const requireOrderCustomer = async (orderId: string) => {
  const customer = await logisticsRefusalRepository.findOrderCustomer(orderId);
  if (!customer) throw new AppError("ORDER_NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
  return customer;
};

const toCustomerIdentity = ({
  userId,
  phoneE164,
}: {
  userId: string;
  phoneE164: string | null;
}): CustomerIdentity => ({ userId, phoneE164 });

export const logisticsRefusalService = {
  async getMyCodEligibility(
    userId: string,
    { phone }: CodEligibilityQuery,
  ): Promise<ShopperCodEligibility> {
    const { isCashOnDeliveryAllowed, refusalLimit, windowDays } =
      await checkCashOnDeliveryEligibility({
        userId,
        phone: phone ?? null,
        countryCode: PLATFORM_DEFAULT_COUNTRY_CODE,
      });
    return { isCashOnDeliveryAllowed, refusalLimit, windowDays };
  },

  async getOrderCustomerRefusals(orderId: string): Promise<CustomerRefusalsView> {
    const customer = await requireOrderCustomer(orderId);
    const [eligibility, refusals] = await Promise.all([
      checkCashOnDeliveryEligibility({
        userId: customer.userId,
        phone: customer.phone,
        countryCode: customer.countryCode,
      }),
      logisticsRefusalRepository.listActiveRefusals(toCustomerIdentity(customer)),
    ]);
    return {
      ...eligibility,
      refusals: refusals.map(({ refusedAt, ...refusal }) => ({
        ...refusal,
        refusedAt: refusedAt.toISOString(),
      })),
    };
  },

  async clearOrderCustomerRefusals(
    staffUserId: string,
    orderId: string,
    { reason }: ClearRefusalsBody,
  ): Promise<CustomerRefusalsView> {
    const customer = await requireOrderCustomer(orderId);
    const clearedCount = await prisma.$transaction((tx) =>
      logisticsRefusalRepository.clearActiveRefusals(tx, toCustomerIdentity(customer), {
        clearedById: staffUserId,
        clearReason: reason,
        clearedAt: new Date(),
      }),
    );
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.LOGISTICS_DELIVERY_REFUSALS_CLEARED,
      summary: `Cleared ${clearedCount} delivery refusal(s) for the customer of order ${orderId}: ${reason}`,
      onBehalfOfUserId: customer.userId,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: orderId,
      metadata: { clearedCount, reason },
    });
    return logisticsRefusalService.getOrderCustomerRefusals(orderId);
  },
};
