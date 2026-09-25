import { describe, expect, it } from "vitest";

import {
  accountBannedTemplate,
  accountRestoredTemplate,
  accountSuspendedTemplate,
  adminInviteTemplate,
  brandApplicationReceivedInternalTemplate,
  brandApprovedTemplate,
  brandRejectedTemplate,
  brandRestoredTemplate,
  brandSuspendedTemplate,
  creatorApprovedTemplate,
  creatorRejectedTemplate,
  crmOrganizationInviteTemplate,
  crmOwnershipTransferRequestTemplate,
  crmSubscriptionRenewalDueTemplate,
  manualRefundNeededTemplate,
  newOrderNotificationTemplate,
  orderCancelledTemplate,
  orderConfirmationTemplate,
  passwordResetTemplate,
  paymentSettledTemplate,
  productApprovedTemplate,
  productRejectedTemplate,
  refundFailedTemplate,
  staleShipmentReminderTemplate,
  supportRequestReceivedTemplate,
  supportResolvedTemplate,
  supportStaffReplyTemplate,
  verifyEmailTemplate,
  withdrawRequestReceivedInternalTemplate,
} from "./templates.js";

const XSS_PAYLOAD = '<img src=x onerror="alert(1)">';

describe("auth templates", () => {
  it("verifyEmailTemplate carries the verification url and a fallback security note", () => {
    const { subject, html } = verifyEmailTemplate("https://outfiqe.com/verify?token=abc");
    expect(subject).toBe("Verify your Outfiqe account");
    expect(html).toContain("https://outfiqe.com/verify?token=abc");
    expect(html).toContain("Verify email");
    expect(html).toContain("If you didn&#39;t create an Outfiqe account");
  });

  it("passwordResetTemplate carries the reset url and expiry note", () => {
    const { subject, html } = passwordResetTemplate("https://outfiqe.com/reset?token=abc");
    expect(subject).toBe("Reset your Outfiqe password");
    expect(html).toContain("https://outfiqe.com/reset?token=abc");
    expect(html).toContain("expires in 1 hour");
  });
});

describe("brand application templates", () => {
  it("brandApplicationReceivedInternalTemplate lists every submitted field and escapes them", () => {
    const { subject, html } = brandApplicationReceivedInternalTemplate({
      brandName: XSS_PAYLOAD,
      contactName: "Bipin Karki",
      email: "bipin@meridianapparel.test",
      phone: "9841000001",
      instagram: "@meridian",
      makesOwnPieces: "Yes",
      reviewUrl: "https://admin.outfiqe.com/brand-applications",
    });
    expect(subject).toContain(XSS_PAYLOAD);
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("Bipin Karki");
    expect(html).toContain("bipin@meridianapparel.test");
    expect(html).toContain("https://admin.outfiqe.com/brand-applications");
  });

  it("brandApprovedTemplate escapes the brand name and carries the invite url", () => {
    const { html } = brandApprovedTemplate(XSS_PAYLOAD, "https://outfiqe.com/register/brand?t=1");
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("https://outfiqe.com/register/brand?t=1");
  });

  it("brandRejectedTemplate falls back to encouragement copy without a reason", () => {
    const { html } = brandRejectedTemplate("Meridian Apparel");
    expect(html).toContain("You&#39;re welcome to apply again in the future.");
  });

  it("brandRejectedTemplate shows the given reason instead of the fallback, escaped", () => {
    const { html } = brandRejectedTemplate("Meridian Apparel", XSS_PAYLOAD);
    expect(html).not.toContain("You&#39;re welcome to apply again in the future.");
    expect(html).not.toContain(XSS_PAYLOAD);
  });

  it("brandSuspendedTemplate shows a set end date when one is given", () => {
    const { html } = brandSuspendedTemplate({
      brandName: "Meridian Apparel",
      reason: "Policy violation",
      expiresAtLabel: "Oct 1, 2026",
      supportUrl: "https://outfiqe.com/support",
    });
    expect(html).toContain("lifts automatically on Oct 1, 2026");
  });

  it("brandSuspendedTemplate notes an open-ended suspension without an expiry", () => {
    const { html } = brandSuspendedTemplate({
      brandName: "Meridian Apparel",
      reason: "Policy violation",
      expiresAtLabel: null,
      supportUrl: "https://outfiqe.com/support",
    });
    expect(html).toContain("This suspension has no set end date.");
  });

  it("brandRestoredTemplate escapes the brand name", () => {
    const { html } = brandRestoredTemplate(XSS_PAYLOAD);
    expect(html).not.toContain(XSS_PAYLOAD);
  });
});

describe("creator and product templates", () => {
  it("creatorApprovedTemplate and creatorRejectedTemplate return fixed subjects", () => {
    expect(creatorApprovedTemplate().subject).toBe("You're an approved Outfiqe creator");
    expect(creatorRejectedTemplate().subject).toBe("About your Outfiqe creator application");
  });

  it("productApprovedTemplate and productRejectedTemplate escape the product name", () => {
    expect(productApprovedTemplate(XSS_PAYLOAD).html).not.toContain(XSS_PAYLOAD);
    expect(productRejectedTemplate(XSS_PAYLOAD).html).not.toContain(XSS_PAYLOAD);
  });
});

describe("order and payment templates", () => {
  it("orderConfirmationTemplate shows the order id, amount and payment method", () => {
    const { html } = orderConfirmationTemplate({
      orderId: "ORD-1",
      total: 2500,
      paymentMethod: "eSewa",
    });
    expect(html).toContain("ORD-1");
    expect(html).toContain("Rs. 2,500");
    expect(html).toContain("eSewa");
  });

  it("newOrderNotificationTemplate and paymentSettledTemplate show order id and amount", () => {
    expect(newOrderNotificationTemplate({ orderId: "ORD-2", total: 900 }).html).toContain(
      "Rs. 900",
    );
    expect(paymentSettledTemplate({ orderId: "ORD-3", total: 1200 }).html).toContain("Rs. 1,200");
  });

  it("manualRefundNeededTemplate and refundFailedTemplate flag the amount to refund", () => {
    expect(manualRefundNeededTemplate({ orderId: "ORD-4", total: 3000 }).html).toContain(
      "Rs. 3,000",
    );
    expect(refundFailedTemplate({ orderId: "ORD-5", total: 3000 }).html).toContain("Rs. 3,000");
  });

  it("orderCancelledTemplate omits the refund row when nothing was refunded", () => {
    const { html } = orderCancelledTemplate({ orderId: "ORD-6", total: 1000, refunded: false });
    expect(html).not.toContain("Refunded to you");
  });

  it("orderCancelledTemplate shows the refund row when the order was refunded", () => {
    const { html } = orderCancelledTemplate({ orderId: "ORD-7", total: 1000, refunded: true });
    expect(html).toContain("Refunded to you");
  });
});

describe("withdrawal, admin and crm templates", () => {
  it("withdrawRequestReceivedInternalTemplate escapes the requester's name", () => {
    const { html } = withdrawRequestReceivedInternalTemplate({
      ownerName: XSS_PAYLOAD,
      ownerType: "brand",
      amount: 5000,
      reviewUrl: "https://admin.outfiqe.com/withdraw-requests",
    });
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("Rs. 5,000");
  });

  it("adminInviteTemplate escapes the invitee name", () => {
    expect(
      adminInviteTemplate(XSS_PAYLOAD, "https://admin.outfiqe.com/register").html,
    ).not.toContain(XSS_PAYLOAD);
  });

  it("crmOrganizationInviteTemplate escapes the role name", () => {
    expect(
      crmOrganizationInviteTemplate(XSS_PAYLOAD, "https://admin.outfiqe.com/crm/invites/accept")
        .html,
    ).not.toContain(XSS_PAYLOAD);
  });

  it("crmOwnershipTransferRequestTemplate escapes the organization name", () => {
    expect(
      crmOwnershipTransferRequestTemplate(XSS_PAYLOAD, "https://meridian.admin.outfiqe.com").html,
    ).not.toContain(XSS_PAYLOAD);
  });

  it("crmSubscriptionRenewalDueTemplate escapes the organization name and shows the amount", () => {
    const { html } = crmSubscriptionRenewalDueTemplate(
      XSS_PAYLOAD,
      15000,
      "https://meridian.admin.outfiqe.com/crm/billing",
    );
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("Rs. 15,000");
  });
});

describe("support templates", () => {
  it("supportRequestReceivedTemplate escapes the subject and quotes the message", () => {
    const { html } = supportRequestReceivedTemplate({
      reference: "SUP-1",
      subject: XSS_PAYLOAD,
      message: "My order hasn't arrived yet.",
    });
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("My order hasn&#39;t arrived yet.");
  });

  it("supportStaffReplyTemplate quotes the staff reply and links the thread", () => {
    const { html } = supportStaffReplyTemplate({
      reference: "SUP-2",
      subject: "Order issue",
      reply: "We've shipped a replacement.",
      threadUrl: "https://outfiqe.com/support/SUP-2",
    });
    expect(html).toContain("We&#39;ve shipped a replacement.");
    expect(html).toContain("https://outfiqe.com/support/SUP-2");
  });

  it("supportResolvedTemplate escapes the reference and subject and links the reopen url", () => {
    const { html } = supportResolvedTemplate({
      reference: XSS_PAYLOAD,
      subject: "Order issue",
      reopenUrl: "https://outfiqe.com/support/reopen?token=abc",
    });
    expect(html).not.toContain(XSS_PAYLOAD);
    expect(html).toContain("https://outfiqe.com/support/reopen?token=abc");
  });

  it("staleShipmentReminderTemplate pluralizes a single shipment correctly", () => {
    const { subject } = staleShipmentReminderTemplate({
      brandName: "Meridian Apparel",
      shipmentCount: 1,
      ordersUrl: "https://admin.outfiqe.com/orders",
    });
    expect(subject).toBe("1 shipment waiting to be marked delivered");
  });

  it("staleShipmentReminderTemplate pluralizes multiple shipments and escapes the brand name", () => {
    const { subject, html } = staleShipmentReminderTemplate({
      brandName: XSS_PAYLOAD,
      shipmentCount: 3,
      ordersUrl: "https://admin.outfiqe.com/orders",
    });
    expect(subject).toBe("3 shipments waiting to be marked delivered");
    expect(html).not.toContain(XSS_PAYLOAD);
  });
});

describe("account moderation templates", () => {
  it("accountSuspendedTemplate shows a set end date when one is given", () => {
    const { html } = accountSuspendedTemplate({
      reason: "Repeated policy violations.",
      expiresAtLabel: "Oct 1, 2026",
      supportUrl: "https://outfiqe.com/support",
    });
    expect(html).toContain("lifts automatically on Oct 1, 2026");
    expect(html).toContain("Repeated policy violations.");
  });

  it("accountSuspendedTemplate notes an open-ended suspension without an expiry", () => {
    const { html } = accountSuspendedTemplate({
      reason: "Repeated policy violations.",
      expiresAtLabel: null,
      supportUrl: "https://outfiqe.com/support",
    });
    expect(html).toContain("This suspension has no set end date.");
  });

  it("accountBannedTemplate quotes the ban reason", () => {
    const { html } = accountBannedTemplate({
      reason: "Fraudulent activity.",
      supportUrl: "https://outfiqe.com/support",
    });
    expect(html).toContain("Fraudulent activity.");
  });

  it("accountRestoredTemplate returns a fixed subject", () => {
    expect(accountRestoredTemplate().subject).toBe("Your Outfiqe account is active again");
  });
});
