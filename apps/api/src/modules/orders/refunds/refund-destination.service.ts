import { HTTP_STATUS } from "#constants/http.constants.js";
import { RefundDestinationKind } from "#generated/prisma/enums.js";
import {
  decryptAccountNumber,
  encryptAccountNumber,
} from "#lib/account-number-encryption.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderNotFoundError } from "./refund.claim.js";
import {
  orderRefundDestinationRepository,
  type RefundDestinationWrite,
} from "./refund-destination.repository.js";
import type { RefundDestinationBody } from "./refund-destination.schemas.js";
import type { MyRefundDestinationView } from "./refund-destination.types.js";
import { suggestDestinationKind, toRefundDestinationView } from "./refund-destination.utils.js";

const ACCOUNT_NUMBER_VISIBLE_DIGITS = 4;
const NOTHING_OWED = 0;

const toDestinationWrite = (body: RefundDestinationBody): RefundDestinationWrite =>
  body.kind === RefundDestinationKind.BANK
    ? {
        kind: body.kind,
        walletId: null,
        bankId: body.bankId,
        accountName: body.accountName,
        accountNumberCiphertext: encryptAccountNumber(body.accountNumber),
        accountNumberLast4: body.accountNumber.slice(-ACCOUNT_NUMBER_VISIBLE_DIGITS),
      }
    : {
        kind: body.kind,
        walletId: body.walletId,
        bankId: null,
        accountName: body.accountName,
        accountNumberCiphertext: null,
        accountNumberLast4: null,
      };

const requireOwnOrder = async (userId: string, orderId: string) => {
  const order = await orderRefundDestinationRepository.findOrderOwnerAndDestination(orderId);
  if (!order || order.userId !== userId) throw orderNotFoundError();
  return order;
};

const describeMyRefundDestination = async (
  userId: string,
  orderId: string,
): Promise<MyRefundDestinationView> => {
  const order = await requireOwnOrder(userId, orderId);
  const amountAwaitingDetails = order.refunds.reduce(
    (sum, refund) => sum + refund.totalAmount,
    NOTHING_OWED,
  );
  return {
    amountAwaitingDetails,
    canEdit: amountAwaitingDetails > NOTHING_OWED,
    suggestedKind: suggestDestinationKind(order.paymentMethod),
    suggestedWalletId: order.phone,
    suggestedAccountName: order.fullName,
    destination: order.refundDestination ? toRefundDestinationView(order.refundDestination) : null,
  };
};

export const orderRefundDestinationService = {
  getMyRefundDestination: describeMyRefundDestination,

  async saveMyRefundDestination(
    userId: string,
    orderId: string,
    body: RefundDestinationBody,
  ): Promise<MyRefundDestinationView> {
    const order = await requireOwnOrder(userId, orderId);
    if (order.refunds.length === NOTHING_OWED) {
      throw new AppError(
        "NO_REFUND_AWAITING_DETAILS",
        "There's no refund waiting for your details on this order.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (body.kind === RefundDestinationKind.BANK) {
      const bank = await orderRefundDestinationRepository.findActiveBank(body.bankId);
      if (!bank) {
        throw new AppError(
          "BANK_NOT_FOUND",
          "Choose a bank from the list.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }
    await orderRefundDestinationRepository.saveDestination(orderId, toDestinationWrite(body));
    return describeMyRefundDestination(userId, orderId);
  },

  async revealRefundAccountNumber(
    staffUserId: string,
    refundId: string,
  ): Promise<{ accountNumber: string }> {
    const refund = await orderRefundDestinationRepository.findDestinationForRefund(refundId);
    const ciphertext = refund?.order.refundDestination?.accountNumberCiphertext;
    if (!refund || !ciphertext) {
      throw new AppError(
        "REFUND_BANK_DETAILS_NOT_FOUND",
        "This refund has no bank account details.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.ORDER_REFUND_ACCOUNT_REVEALED,
      summary: `Viewed the refund bank account for order ${refund.orderId}`,
      onBehalfOfUserId: refund.order.userId,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: refund.orderId,
      metadata: { refundId },
    });
    return { accountNumber: decryptAccountNumber(ciphertext) };
  },
};
