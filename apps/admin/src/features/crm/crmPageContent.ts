export const CRM_PAGE_TEXT = {
  contacts: {
    title: "Contacts",
    description: "People your team tracks by hand — leads, prospects, and other contacts.",
  },
  customers: {
    title: "Customers",
    description: "Shoppers who have bought your brand's products.",
  },
  partners: {
    title: "Partners",
    description: "Creators who have linked, tagged, or driven a sale of your brand's products.",
  },
  audit: {
    title: "Audit log",
    description: "Every membership, role, ownership and billing change on this organization.",
  },
  roles: {
    title: "Roles & settings",
    description: "Build custom roles from the permission catalog and rename this organization.",
  },
  reports: {
    title: "Reports",
    description: "Pipeline value and support-ticket health for this organization.",
  },
  billing: {
    title: "Billing",
    description:
      "Manage the plan, seats and payment history for this organization's CRM subscription.",
  },
  pipeline: {
    title: "Pipeline",
    description:
      "Follow every deal from first contact to won or lost. Drag a deal card to the next stage as the sale moves forward.",
  },
  tasks: {
    title: "Tasks",
    description:
      "Your team’s to-do list. Add a task, give it an owner and a due date, and tick it off when it is done.",
  },
  tickets: {
    title: "Support",
    description:
      "Requests and problems raised by your customers. Work each ticket through to resolved, and filter by status to see what still needs attention.",
  },
} as const;

export const CONTACT_TABLE_HEADERS = ["Name", "Company", "Stage", "Owner", "Added", ""];
export const CUSTOMER_TABLE_HEADERS = ["Shopper", "Orders", "Items", "Total paid", "Last order"];
export const PARTNER_TABLE_HEADERS = [
  "Creator",
  "Tag clicks",
  "Attributed orders",
  "Attributed revenue",
  "Last activity",
];
export const AUDIT_TABLE_HEADERS = ["When", "Who", "Action", "Details"];
export const INVOICE_TABLE_HEADERS = ["Period", "Amount", "Status", "Paid"];
export const PRODUCT_BREAKDOWN_HEADERS = ["Product", "Tag clicks", "Orders", "Revenue"];
