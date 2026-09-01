import "../src/config/load-env.js";

import {
  ContactLifecycleStage,
  CrmActivityType,
  CrmTaskStatus,
  CrmTicketStatus,
  CrmTicketType,
  DealStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
} from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

const DEMO_SUBDOMAIN = "meridian";
const MAX_DEMO_CUSTOMER_ORDERS = 6;

const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const pick = <T>(pool: T[], index: number): T => {
  const picked = pool[index % pool.length];
  if (picked === undefined) throw new Error("pick from empty list");
  return picked;
};

const seedBrandCustomerOrders = async (
  linkedBrandId: string | null,
  shoppers: { id: string; name: string }[],
  creators: { id: string; name: string; handle: string }[],
): Promise<void> => {
  if (!linkedBrandId || shoppers.length === 0) return;

  const products = await prisma.product.findMany({
    where: { brandId: linkedBrandId, status: "APPROVED" },
    select: { id: true, price: true, sizes: { select: { id: true }, take: 1 } },
    take: 12,
  });
  const sellable = products.filter((product) => product.sizes.length > 0);
  if (sellable.length === 0) return;

  const existingOrderItemCount = await prisma.orderItem.count({
    where: { product: { brandId: linkedBrandId } },
  });
  if (existingOrderItemCount > 0) {
    console.warn("Brand already has customer orders — skipping order seed.");
    return;
  }

  const fulfilments = [
    FulfilmentStatus.DELIVERED,
    FulfilmentStatus.DELIVERED,
    FulfilmentStatus.SHIPPED,
    FulfilmentStatus.PACKED,
    FulfilmentStatus.PLACED,
    FulfilmentStatus.DELIVERED,
  ];

  let ordersCreated = 0;
  for (const [index, shopper] of shoppers.slice(0, MAX_DEMO_CUSTOMER_ORDERS).entries()) {
    const lineCount = (index % 2) + 1;
    const lines = Array.from({ length: lineCount }, (_, lineIndex) => {
      const product = pick(sellable, index + lineIndex);
      const size = product.sizes[0];
      if (!size) return null;
      const qty = (lineIndex % 2) + 1;
      return { productId: product.id, sizeId: size.id, qty, unitPrice: product.price };
    }).filter((line): line is NonNullable<typeof line> => line !== null);
    if (lines.length === 0) continue;

    const subtotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
    const deliveryFee = 150;
    const fulfilmentStatus = pick(fulfilments, index);

    await prisma.order.create({
      data: {
        userId: shopper.id,
        fullName: shopper.name,
        phone: `98${String(20000000 + index * 123457).slice(0, 8)}`,
        address: `${index + 12} Jhamsikhel Marg`,
        city: "Lalitpur",
        paymentMethod: index % 2 === 0 ? PaymentMethod.ESEWA : PaymentMethod.COD,
        paymentStatus:
          fulfilmentStatus === FulfilmentStatus.PLACED ? PaymentStatus.DUE : PaymentStatus.PAID,
        fulfilmentStatus,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        createdAt: daysFromNow(-4 - index * 6),
        items: {
          create: lines.map((line, lineIndex) => ({
            productId: line.productId,
            sizeId: line.sizeId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            attributedCreatorId:
              lineIndex === 0 && creators.length > 0 ? pick(creators, index).id : null,
          })),
        },
      },
    });
    ordersCreated += 1;
  }

  console.warn(`Seeded ${ordersCreated} customer orders for the linked brand.`);
};

const main = async (): Promise<void> => {
  const organization = await prisma.organization.findUnique({
    where: { subdomain: DEMO_SUBDOMAIN },
    include: {
      pipelineStages: { orderBy: { sortOrder: "asc" } },
      memberships: { include: { user: { select: { name: true } } } },
    },
  });
  if (!organization) throw new Error(`No "${DEMO_SUBDOMAIN}" organization — run db:seed first.`);
  if (organization.pipelineStages.length === 0)
    throw new Error("Organization has no pipeline stages.");

  const staffMemberships = organization.memberships;
  const owner = staffMemberships[0];
  if (!owner) throw new Error("Organization has no staff memberships.");

  const creators = await prisma.user.findMany({
    where: { isCreator: true },
    select: { id: true, name: true, handle: true },
    take: 12,
    orderBy: { createdAt: "asc" },
  });
  if (creators.length === 0) throw new Error("No creators found — run db:seed first.");

  const shoppers = await prisma.user.findMany({
    where: { role: "CUSTOMER", isCreator: false },
    select: { id: true, name: true },
    take: 8,
    orderBy: { createdAt: "asc" },
  });

  await seedBrandCustomerOrders(organization.linkedBrandId, shoppers, creators);

  const existingDeals = await prisma.deal.count({ where: { organizationId: organization.id } });
  if (existingDeals > 0) {
    console.warn(`"${DEMO_SUBDOMAIN}" already has CRM pipeline demo content — skipping the rest.`);
    return;
  }

  const dealTitles = [
    "Spring capsule collaboration",
    "Festival gifting bundle",
    "Wholesale reorder — Kathmandu",
    "Studio lookbook shoot",
    "Creator affiliate upgrade",
    "Retail pop-up placement",
    "Winter layering push",
    "Repeat wholesale — Pokhara",
    "Limited saree drop",
    "Brand ambassador renewal",
    "Bulk corporate order",
    "Marketplace feature slot",
  ];

  const dealsCreated = await Promise.all(
    dealTitles.map((title, index) => {
      const stage = pick(organization.pipelineStages, index);
      const status = stage.isWon
        ? DealStatus.WON
        : stage.isLost
          ? DealStatus.LOST
          : DealStatus.OPEN;
      return prisma.deal.create({
        data: {
          organizationId: organization.id,
          stageId: stage.id,
          title,
          value: (index + 1) * 12500 + 5000,
          expectedCloseDate: daysFromNow(7 + index * 4),
          ownerMembershipId: pick(staffMemberships, index).id,
          partnerCreatorId: pick(creators, index).id,
          status,
          closedAt: status === DealStatus.OPEN ? null : daysFromNow(-index),
        },
      });
    }),
  );

  const contactSeeds: {
    name: string;
    email: string;
    company: string;
    jobTitle: string;
    stage: ContactLifecycleStage;
    source: string;
  }[] = [
    {
      name: "Priya Shrestha",
      email: "priya@threadhouse.example",
      company: "Thread House",
      jobTitle: "Buyer",
      stage: ContactLifecycleStage.LEAD,
      source: "Trade show",
    },
    {
      name: "Anil Gurung",
      email: "anil@himalstyle.example",
      company: "Himal Style",
      jobTitle: "Founder",
      stage: ContactLifecycleStage.LEAD,
      source: "Inbound email",
    },
    {
      name: "Sunita Rai",
      email: "sunita@lalitpurmarket.example",
      company: "Lalitpur Market",
      jobTitle: "Category Lead",
      stage: ContactLifecycleStage.QUALIFIED,
      source: "Referral",
    },
    {
      name: "Bikash Thapa",
      email: "bikash@newroadretail.example",
      company: "New Road Retail",
      jobTitle: "Owner",
      stage: ContactLifecycleStage.QUALIFIED,
      source: "Cold outreach",
    },
    {
      name: "Maya Tamang",
      email: "maya@peaktraders.example",
      company: "Peak Traders",
      jobTitle: "Purchasing",
      stage: ContactLifecycleStage.CUSTOMER,
      source: "Existing account",
    },
    {
      name: "Rohan Karki",
      email: "rohan@valleyboutique.example",
      company: "Valley Boutique",
      jobTitle: "Merchandiser",
      stage: ContactLifecycleStage.CUSTOMER,
      source: "Marketplace",
    },
    {
      name: "Deepa Joshi",
      email: "deepa@creatorcollective.example",
      company: "Creator Collective",
      jobTitle: "Partnerships",
      stage: ContactLifecycleStage.PARTNER,
      source: "Creator program",
    },
    {
      name: "Kiran Adhikari",
      email: "kiran@styleloop.example",
      company: "Style Loop",
      jobTitle: "Producer",
      stage: ContactLifecycleStage.OTHER,
      source: "Event",
    },
  ];

  await prisma.contact.createMany({
    data: contactSeeds.map((contact, index) => ({
      organizationId: organization.id,
      name: contact.name,
      email: contact.email,
      phone: `98${String(10000000 + index * 111111).slice(0, 8)}`,
      company: contact.company,
      jobTitle: contact.jobTitle,
      lifecycleStage: contact.stage,
      source: contact.source,
      tags: index % 2 === 0 ? ["wholesale"] : ["priority", "responsive"],
      ownerMembershipId: pick(staffMemberships, index).id,
    })),
  });

  const taskSeeds = [
    { title: "Send spring capsule proposal", offset: -3, status: CrmTaskStatus.OPEN },
    { title: "Follow up on wholesale reorder", offset: -1, status: CrmTaskStatus.OPEN },
    { title: "Confirm lookbook shoot date", offset: 2, status: CrmTaskStatus.OPEN },
    { title: "Share affiliate rate card", offset: 5, status: CrmTaskStatus.OPEN },
    { title: "Log pop-up placement contract", offset: -6, status: CrmTaskStatus.DONE },
    { title: "Prepare Q3 partner review deck", offset: 9, status: CrmTaskStatus.OPEN },
  ];

  await prisma.crmTask.createMany({
    data: taskSeeds.map((task, index) => ({
      organizationId: organization.id,
      title: task.title,
      dueAt: daysFromNow(task.offset),
      status: task.status,
      assigneeMembershipId: pick(staffMemberships, index).id,
      createdByMembershipId: owner.id,
      partnerCreatorId: index % 3 === 0 ? pick(creators, index).id : null,
      dealId: index < dealsCreated.length ? pick(dealsCreated, index).id : null,
      completedAt: task.status === CrmTaskStatus.DONE ? daysFromNow(-2) : null,
    })),
  });

  const ticketSeeds: {
    type: CrmTicketType;
    status: CrmTicketStatus;
    title: string;
    description: string;
    resolved: boolean;
  }[] = [
    {
      type: CrmTicketType.COMPLAINT,
      status: CrmTicketStatus.OPEN,
      title: "Wrong size shipped in wholesale order",
      description: "Buyer received M instead of L for 12 units. Needs a replacement shipment.",
      resolved: false,
    },
    {
      type: CrmTicketType.REQUEST,
      status: CrmTicketStatus.OPEN,
      title: "Bulk pricing for 200+ units",
      description: "Retail partner wants a tiered quote for a 250-unit order across three styles.",
      resolved: false,
    },
    {
      type: CrmTicketType.COMPLAINT,
      status: CrmTicketStatus.IN_PROGRESS,
      title: "Colour mismatch on linen shirt",
      description: "Photos show a warmer tone than the listing. Reviewing dye-lot with production.",
      resolved: false,
    },
    {
      type: CrmTicketType.REQUEST,
      status: CrmTicketStatus.IN_PROGRESS,
      title: "Add creator to affiliate dashboard",
      description: "New ambassador needs dashboard access and a tracking link.",
      resolved: false,
    },
    {
      type: CrmTicketType.COMPLAINT,
      status: CrmTicketStatus.RESOLVED,
      title: "Late delivery for festival window",
      description:
        "Order arrived four days late. Offered a discount on the next order; buyer accepted.",
      resolved: true,
    },
    {
      type: CrmTicketType.REQUEST,
      status: CrmTicketStatus.CLOSED,
      title: "Marketing assets for pop-up",
      description: "Sent the brand kit and product photography pack. No further action.",
      resolved: true,
    },
  ];

  for (const [index, ticket] of ticketSeeds.entries()) {
    const created = await prisma.crmTicket.create({
      data: {
        organizationId: organization.id,
        type: ticket.type,
        status: ticket.status,
        title: ticket.title,
        description: ticket.description,
        partnerCreatorId: index % 2 === 0 ? pick(creators, index).id : null,
        customerUserId: index % 2 === 1 && shoppers.length > 0 ? pick(shoppers, index).id : null,
        assigneeMembershipId: pick(staffMemberships, index).id,
        createdByMembershipId: owner.id,
        resolvedAt: ticket.resolved ? daysFromNow(-index - 1) : null,
      },
    });

    await prisma.crmTicketComment.create({
      data: {
        ticketId: created.id,
        authorMembershipId: pick(staffMemberships, index).id,
        body:
          ticket.status === CrmTicketStatus.OPEN
            ? "Logged and acknowledged with the partner. Waiting on their confirmation."
            : "Update shared with the partner. Tracking to resolution.",
      },
    });
  }

  const activityBodies = [
    "Intro call — walked through the spring capsule timeline and margins.",
    "Emailed the affiliate rate card and sample request form.",
    "Left a voicemail about the wholesale reorder; will retry tomorrow.",
    "Note: partner prefers WhatsApp for quick approvals.",
    "Sent revised quote for the 250-unit order.",
    "Call with buyer — agreed on a replacement shipment for the size error.",
    "Shared the lookbook moodboard for feedback.",
    "Note: pop-up placement confirmed for the second week of the month.",
    "Emailed festival-window delivery apology and discount code.",
    "Message: creator confirmed the ambassador renewal terms.",
    "Note: follow up on corporate bulk order after their budget cycle.",
    "Call with retail partner about marketplace feature slot timing.",
  ];
  const activityTypes = [
    CrmActivityType.CALL,
    CrmActivityType.EMAIL,
    CrmActivityType.CALL,
    CrmActivityType.NOTE,
    CrmActivityType.EMAIL,
    CrmActivityType.CALL,
    CrmActivityType.MESSAGE,
    CrmActivityType.NOTE,
    CrmActivityType.EMAIL,
    CrmActivityType.MESSAGE,
    CrmActivityType.NOTE,
    CrmActivityType.CALL,
  ];

  await prisma.crmActivity.createMany({
    data: activityBodies.map((body, index) => ({
      organizationId: organization.id,
      type: pick(activityTypes, index),
      body,
      occurredAt: daysFromNow(-index - 1),
      authorMembershipId: pick(staffMemberships, index).id,
      partnerCreatorId: index % 2 === 0 ? pick(creators, index).id : null,
      customerUserId: index % 3 === 1 && shoppers.length > 0 ? pick(shoppers, index).id : null,
      dealId: index < dealsCreated.length ? pick(dealsCreated, index).id : null,
    })),
  });

  console.warn(
    `Seeded CRM demo content for "${DEMO_SUBDOMAIN}": ` +
      `${dealsCreated.length} deals, ${contactSeeds.length} contacts, ` +
      `${taskSeeds.length} tasks, ${ticketSeeds.length} tickets, ${activityBodies.length} activities.`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
