export type GlossaryTerm = {
  id: string;
  term: string;
  meaning: string;
  example?: string;
  learnMore?: { href: string; label: string };
};

export type GlossaryGroup = { heading: string; terms: GlossaryTerm[] };

export const GLOSSARY_GROUPS: GlossaryGroup[] = [
  {
    heading: "The people on Outfiqe",
    terms: [
      {
        id: "shopper",
        term: "Shopper",
        meaning: "Anyone who browses or buys on Outfiqe.",
      },
      {
        id: "brand",
        term: "Brand",
        meaning:
          "A Nepali clothing label that sells on Outfiqe. Brands make or source their pieces, set their own prices and keep their stock up to date. Our team reviews every brand before it can sell.",
        example: "a small Kathmandu studio that makes its own kurtas.",
        learnMore: { href: "/for-brands", label: "Read about selling on Outfiqe" },
      },
      {
        id: "muse",
        term: "Muse",
        meaning:
          "A real person who shares photos of the outfits they wear and tags the pieces. Muses help shoppers see how clothes look on a body, and they earn a commission when their look leads to a sale. Our team approves every muse.",
        example: "Sita wears a kurta from a brand, posts the photo and tags it.",
        learnMore: { href: "/for-creators", label: "Read about becoming a muse" },
      },
      {
        id: "trusted-muse",
        term: "Trusted muse",
        meaning:
          "A muse a brand has chosen to trust. Their tags on that brand's pieces go live straight away, without waiting for the brand to check each one.",
      },
    ],
  },
  {
    heading: "Shopping",
    terms: [
      {
        id: "look",
        term: "Look",
        meaning: "A muse's outfit photo, with tags on the pieces they're wearing.",
      },
      {
        id: "tag",
        term: "Tag",
        meaning:
          "A link from a look to the exact product in the photo. Tap it to see the price, sizes and brand. A brand checks each tag before it goes live, unless the muse is trusted.",
      },
      {
        id: "share-link",
        term: "Share link",
        meaning:
          "A muse's personal link to a product, made for posting on Instagram, TikTok or WhatsApp. A sale through it counts for the muse, just like a tag.",
      },
      {
        id: "thrift",
        term: "Thrift",
        meaning:
          "Secondhand or one-of-a-kind pieces. Each one shows a condition rating and a note from the seller, and you confirm you know it's secondhand before you buy.",
      },
      {
        id: "collection",
        term: "Collection",
        meaning: "A themed group of pieces you can browse together.",
      },
      {
        id: "leaderboard",
        term: "Leaderboard",
        meaning: "A ranking of the brands and muses doing well on Outfiqe.",
      },
      {
        id: "verified-purchase",
        term: "Verified purchase",
        meaning:
          "A badge on reviews. Only people who received the product can review it, so every review carries it.",
      },
    ],
  },
  {
    heading: "Delivery",
    terms: [
      {
        id: "rider",
        term: "Rider",
        meaning: "An Outfiqe rider collects ready orders from the brand's pickup location.",
      },
      {
        id: "hub",
        term: "Hub",
        meaning: "The place where we check each piece and pack your whole order into one parcel.",
      },
      {
        id: "delivery-partner",
        term: "Delivery partner",
        meaning:
          "The courier company that brings the parcel from our hub to your door. Your order page links to their tracking page.",
      },
      {
        id: "delivery-zone",
        term: "Delivery zone",
        meaning:
          "The area your city belongs to. Each zone has its own delivery fee, free-delivery threshold and delivery dates.",
      },
      {
        id: "free-delivery-threshold",
        term: "Free-delivery threshold",
        meaning: "The order amount at or above which delivery is free in your zone.",
      },
    ],
  },
  {
    heading: "Money",
    terms: [
      {
        id: "cash-on-delivery",
        term: "Cash on delivery",
        meaning:
          "You pay in cash when your parcel arrives. It adds a small handling fee, which you see before you order.",
      },
      {
        id: "commission",
        term: "Commission",
        meaning:
          "A share of a sale. A muse earns one when their look or link leads to a sale. Outfiqe also takes a commission from brands on completed sales. Listing a brand is free.",
        learnMore: {
          href: "/for-creators/how-commissions-work",
          label: "See how muse commissions work",
        },
      },
      {
        id: "pending",
        term: "Pending",
        meaning:
          "Money a muse has earned but can't withdraw yet, because the order is on its way or could still be returned.",
      },
      {
        id: "available",
        term: "Ready to withdraw",
        meaning: "Money that has cleared the 7-day wait after delivery and can be withdrawn.",
      },
      {
        id: "wallet",
        term: "Wallet",
        meaning:
          "Where a brand sees what it has earned from each sale and asks to withdraw it to its bank account.",
      },
      {
        id: "withdrawal",
        term: "Withdrawal",
        meaning:
          "Moving your available money to your verified bank account. Our team reviews each request and sends the money.",
      },
    ],
  },
];
