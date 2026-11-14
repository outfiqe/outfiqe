import type { FeatureItem } from "../components/FeatureGrid";
import type { Step } from "../components/StepList";

export const ABOUT_SHOPPING_BEFORE_OUTFIQE: string[] = [
  "You follow dozens of pages and hope you see the post before the piece sells out.",
  "You message each brand to ask the price, which sizes are left, and whether they deliver to you. Then you wait for a reply.",
  "You guess how the piece will look on you, because all you have is a flat photo or a shoot with a model who looks nothing like you.",
  "You guess your size too, because a “medium” at one brand is a “large” at the next.",
  "You pay each brand separately, often by sending money first, and wait for separate parcels that arrive on different days.",
  "If something goes wrong, you're back in the DMs, hoping someone answers.",
];

export const ABOUT_WHAT_WE_LOOK_AFTER: string[] = [
  "The shop, search and the feed where you find things",
  "Taking payment, whether you pay online or in cash at the door",
  "Collecting the order from each brand",
  "Checking every piece at our hub before it reaches you",
  "Packing your order and handing it to a delivery partner",
  "Refunds and support if anything goes wrong",
];

export const ABOUT_WHO_IT_IS_FOR: FeatureItem[] = [
  {
    title: "Shoppers",
    body: "Anyone who likes clothes. See pieces on real people, check which size will fit you, buy from several brands in one go, and follow the whole order from one page.",
  },
  {
    title: "Muses",
    body: "People with a good eye for style. You don't need a huge following. Once approved, you post looks, tag the pieces you're wearing, and earn a commission whenever someone buys because of you. You never hold stock or deal with delivery.",
  },
  {
    title: "Brands",
    body: "Clothing labels of any size. You keep making and pricing your clothes. We put them in front of new shoppers, show them on real people, collect ready orders from your door, and deal with payment, delivery and refunds.",
  },
];

export const ABOUT_WHAT_MAKES_IT_DIFFERENT: FeatureItem[] = [
  {
    title: "You see the fit before you pay",
    body: "Pieces show up on real people in everyday settings, not only on a hanger or in a studio. Reviews come only from people who actually received the item.",
  },
  {
    title: "Real help with sizing",
    body: "Brands give each size a height and weight range. Tell us your height and weight once, and we suggest the size most likely to fit you on each product.",
  },
  {
    title: "One bag, one parcel",
    body: "Add pieces from as many brands as you like and check out once. For most brands, we collect everything, check it, and send it to you as a single parcel.",
  },
  {
    title: "Pay the way you're used to",
    body: "Pay in cash when the parcel arrives, or pay online at checkout. You see every fee before you place the order.",
  },
  {
    title: "We sort out problems",
    body: "If a piece can't be supplied, fails our check, or gets lost on the way, we refund you. You don't have to chase a brand for it.",
  },
  {
    title: "Your taste can earn you money",
    body: "If someone buys a piece because of your look, you get a share of that sale, tracked for you down to the order.",
  },
  {
    title: "Brands only pay when they sell",
    body: "Listing is free. There's no paying for visibility. We take a commission on completed sales, and that's it.",
  },
];

export const ABOUT_WHAT_EACH_SIDE_GETS: FeatureItem[] = [
  {
    title: "Shoppers",
    body: "Less hunting around, more confidence that a piece will suit them, a fair size suggestion, and one place to follow every order and refund.",
  },
  {
    title: "Muses",
    body: "A public profile, a way to get discovered by people who don't follow them yet, and income from the outfits they already wear.",
  },
  {
    title: "Brands",
    body: "A storefront next to other independent labels, real people wearing their pieces, and no couriers, payments or refunds to manage from their DMs.",
  },
];

export const ABOUT_TRUST_CHECKS: FeatureItem[] = [
  { title: "Every brand is reviewed", body: "Our team reviews every brand before it can sell." },
  { title: "Every new product is checked", body: "A new product is checked before it goes live." },
  {
    title: "Every muse is approved",
    body: "Muses are approved before they can post looks that earn.",
  },
  {
    title: "Brands approve tags",
    body: "Brands approve tags on their own products, so the piece you tap is the piece in the photo.",
  },
  {
    title: "Only real buyers can review",
    body: "Every review carries a verified purchase badge.",
  },
  {
    title: "Every piece is checked at our hub",
    body: "We check each piece at our hub before it's sent to you.",
  },
];

export const ABOUT_ONE_JACKET_STORY: Step[] = [
  {
    title: "A brand lists a jacket",
    body: "A small clothing studio adds a new jacket with photos, sizes, stock and a price. Our team checks the listing, and it goes live.",
  },
  {
    title: "A muse wears it",
    body: "Sara, a muse, posts a look wearing the jacket and tags it. The brand approves the tag, so her look now links straight to that jacket.",
  },
  {
    title: "A shopper finds it",
    body: "Maya stops at Sara's look, taps the tag, checks the size suggestion for her height and weight, and adds the jacket to her bag with a tote from another brand.",
  },
  {
    title: "We collect and check it",
    body: "Our rider collects both pieces from the brands. At our hub we check them and pack them together into one parcel.",
  },
  {
    title: "It reaches Maya",
    body: "A delivery partner brings the parcel to Maya's door. Her order page showed every step along the way.",
  },
  {
    title: "Everyone gets paid",
    body: "The brand earns from the sale, minus our commission. Sara earns a commission too, because Maya bought after tapping her look.",
  },
];
