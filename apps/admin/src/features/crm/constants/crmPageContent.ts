export const RECORD_SECTIONS_GRID_CLASS_NAME = "grid items-start gap-4 lg:grid-cols-2";

export const CRM_PAGE_TEXT = {
  contacts: {
    title: "Contacts",
    description:
      "People you are talking to who haven't bought yet, like leads and possible partners. Add someone, note where they stand, and give them an owner on your team.",
  },
  customers: {
    title: "Customers",
    description:
      "Shoppers who have bought from your brand, with what they ordered and how much they spent. Click a shopper to see their details.",
  },
  partners: {
    title: "Partners",
    description:
      "Muses who promote your brand by tagging your products, sharing links or bringing in sales. Click a muse to see how each product is doing.",
  },
  audit: {
    title: "Audit log",
    description:
      "A record of important changes to your CRM: team members, roles, ownership and billing. It can't be edited, so you can always check who did what.",
  },
  roles: {
    title: "Roles & settings",
    description:
      "Decide what each person on your team can see and do, and change your organization's name.",
  },
  reports: {
    title: "Reports",
    description:
      "See how your sales and customer support are doing: what is in progress, what you have won, and how quickly your team solves tickets.",
  },
  billing: {
    title: "Billing",
    description:
      "See your plan and seats, pay invoices, and change or cancel your CRM subscription.",
  },
  pipeline: {
    title: "Sales board",
    description:
      "Every sales opportunity, from first contact to won or lost. Drag a card to the next column as the conversation moves forward.",
  },
  tasks: {
    title: "Tasks",
    description:
      "Your team's to-do list. Add a task, give it an owner and a due date, and tick it off when it is done.",
  },
  tickets: {
    title: "Customer tickets",
    description:
      "Problems and requests from your customers, all in one place. Assign each one to someone, update its status, and filter to see what still needs attention.",
  },
} as const;

export const CONTACT_TABLE_HEADERS = ["Name", "Company", "Stage", "Owner", "Added", ""];
export const CUSTOMER_TABLE_HEADERS = ["Shopper", "Orders", "Items", "Total paid", "Last order"];
export const PARTNER_TABLE_HEADERS = [
  "Muse",
  "Tag clicks",
  "Orders they brought",
  "Sales they brought",
  "Last activity",
];
export const AUDIT_TABLE_HEADERS = ["When", "Who", "Action", "Details"];
export const INVOICE_TABLE_HEADERS = ["Period", "Amount", "Status", "Paid"];
