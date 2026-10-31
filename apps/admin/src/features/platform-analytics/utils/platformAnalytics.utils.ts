import type { StatCardDelta } from "@outfiqe/design-system";

import type { FunnelStep, RankedPage } from "../api/platformAnalyticsSchemas";
import { MIN_READINGS_TO_RATE } from "../constants/analyticsCopy.constants";
import {
  ANALYTICS_PAYMENT_METHOD_LABEL,
  DIRECT_TRAFFIC_LABEL,
  DIRECT_TRAFFIC_SOURCE,
  SPEED_RATING_LABEL,
  type SpeedLimits,
} from "../constants/platformAnalytics.constants";

const NOTHING_TO_COMPARE = 0;
const WHOLE_SHARE = 1;
const SECONDS_IN_A_MINUTE = 60;
const NO_FULL_MINUTES = 0;
const MS_IN_A_SECOND = 1000;
const SECONDS_DECIMALS = 2;
const LAYOUT_SHIFT_DECIMALS = 2;
const NOT_MEASURED = "Not measured";
const TOO_FEW_READINGS = "Too few readings to judge";
const SINGLE_READING = 1;
const SINGLE_PERSON = 1;
const PREVIOUS_STEP_OFFSET = 1;
const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

type BiggestDrop = { fromEvent: string; toEvent: string; lostPeople: number };

export const toStepShare = (persons: number, comparedTo: number): number =>
  comparedTo === NOTHING_TO_COMPARE
    ? NOTHING_TO_COMPARE
    : Math.min(persons / comparedTo, WHOLE_SHARE);

export const toTrafficSourceLabel = (source: string): string =>
  source === DIRECT_TRAFFIC_SOURCE ? DIRECT_TRAFFIC_LABEL : source;

export const toPaymentMethodLabel = (paymentMethod: string): string =>
  ANALYTICS_PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod;

export const sumValues = (values: number[]): number =>
  values.reduce((total, value) => total + value, NOTHING_TO_COMPARE);

const FIXED_PAGE_LABEL: Record<string, string> = {
  "/": "Homepage",
  "/explore": "Explore",
  "/shop": "Shop",
  "/brands": "Brands",
  "/cart": "Cart",
  "/checkout": "Checkout",
  "/orders": "Your orders",
  "/login": "Log in",
  "/register": "Sign up",
  "/overview": "Dashboard overview",
  "/manage-orders": "Brand orders",
  "/products": "Brand products",
  "/tag-reviews": "Brand tag reviews",
  "/builds": "Outfit builds",
  "/profile": "Profile",
};

const DETAIL_PAGE_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/builds\/[^/]+/, label: "An outfit build" },
  { pattern: /^\/manage-orders\/[^/]+/, label: "A brand order" },
  { pattern: /^\/orders\/[^/]+/, label: "A shopper order" },
  { pattern: /^\/support\/[^/]+/, label: "A support request" },
];

const CREATOR_PATH_PATTERN = /^\/creator\/([^/]+)/;

type NamedPage = Pick<RankedPage, "path" | "productName" | "brandName">;

export const toPageLabel = ({ path, productName, brandName }: NamedPage): string => {
  const museHandle = CREATOR_PATH_PATTERN.exec(path)?.[1];
  const detailPage = DETAIL_PAGE_LABELS.find(({ pattern }) => pattern.test(path));
  return (
    productName ??
    brandName ??
    FIXED_PAGE_LABEL[path] ??
    (museHandle ? `@${museHandle}` : (detailPage?.label ?? path))
  );
};

export const toSiteUrl = (path: string): string => `${WEB_URL}${path}`;

export const toTrafficSourceUrl = (source: string): string | undefined =>
  source === DIRECT_TRAFFIC_SOURCE ? undefined : `https://${source}`;

export const toLedgerMethod = (paymentMethod: string): string => paymentMethod.toUpperCase();

export const findBiggestDrop = (steps: FunnelStep[]): BiggestDrop | null => {
  let biggestDrop: BiggestDrop | null = null;
  steps.forEach(({ event, persons }, stepIndex) => {
    const previousStep = steps[stepIndex - PREVIOUS_STEP_OFFSET];
    if (!previousStep || previousStep.persons === NOTHING_TO_COMPARE) return;
    const lostPeople = Math.max(previousStep.persons - persons, NOTHING_TO_COMPARE);
    if (lostPeople > (biggestDrop?.lostPeople ?? NOTHING_TO_COMPARE)) {
      biggestDrop = { fromEvent: previousStep.event, toEvent: event, lostPeople };
    }
  });
  return biggestDrop;
};

export const toPeopleLabel = (people: number): string =>
  `${people.toLocaleString()} ${people === SINGLE_PERSON ? "person" : "people"}`;

export const describeFunnelStep = (persons: number, previousPersons: number): string => {
  if (persons > previousPersons) return "Some people reached this step without the one above.";
  const lostPeople = previousPersons - persons;
  if (lostPeople === NOTHING_TO_COMPARE) return "Nobody left at this step.";
  return `${lostPeople.toLocaleString()} of ${toPeopleLabel(previousPersons)} stopped here.`;
};

export const toSpeedRatingDelta = (
  measurement: number | null,
  limits: SpeedLimits,
  sampleCount: number,
): StatCardDelta => {
  if (measurement === null) return { value: NOT_MEASURED };
  if (sampleCount < MIN_READINGS_TO_RATE) return { value: TOO_FEW_READINGS };
  const { good, poor } = limits;
  if (measurement <= good) return { value: SPEED_RATING_LABEL.GOOD, tone: "positive" };
  return measurement <= poor
    ? { value: SPEED_RATING_LABEL.NEEDS_WORK }
    : { value: SPEED_RATING_LABEL.POOR, tone: "negative" };
};

export const toReadingsLabel = (sampleCount: number): string =>
  `Based on ${sampleCount.toLocaleString()} ${sampleCount === SINGLE_READING ? "reading" : "readings"}`;

export const formatSessionLength = (totalSeconds: number): string => {
  const wholeSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(wholeSeconds / SECONDS_IN_A_MINUTE);
  const seconds = wholeSeconds % SECONDS_IN_A_MINUTE;
  return minutes === NO_FULL_MINUTES ? `${seconds}s` : `${minutes}m ${seconds}s`;
};

export const formatPaintTime = (milliseconds: number | null): string => {
  if (milliseconds === null) return NOT_MEASURED;
  const wholeMilliseconds = Math.round(milliseconds);
  return wholeMilliseconds < MS_IN_A_SECOND
    ? `${wholeMilliseconds} ms`
    : `${(wholeMilliseconds / MS_IN_A_SECOND).toFixed(SECONDS_DECIMALS)} s`;
};

export const formatLayoutShift = (layoutShift: number | null): string =>
  layoutShift === null ? NOT_MEASURED : layoutShift.toFixed(LAYOUT_SHIFT_DECIMALS);
