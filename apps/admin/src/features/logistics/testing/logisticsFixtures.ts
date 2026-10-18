import { HttpResponse } from "msw";

export const LOGISTICS_API_BASE = "http://localhost:3000/api/logistics/admin";
export const HUBS_URL = `${LOGISTICS_API_BASE}/hubs`;

export const buildHub = (overrides: Record<string, unknown> = {}) => ({
  id: "hub-1",
  name: "Kathmandu Hub",
  countryCode: "NP",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "+9779812345678",
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: ["11:00", "15:00"],
  readyCutoffMinutes: 60,
  partnerCollectionTime: "17:30",
  isActive: true,
  pickupZones: [],
  ...overrides,
});

export const buildRider = (overrides: Record<string, unknown> = {}) => ({
  id: "rider-1",
  userId: "user-1",
  name: "Asha Rider",
  email: "asha@outfiqe.test",
  phone: "+9779812345670",
  hubId: "hub-1",
  hubName: "Kathmandu Hub",
  employmentType: "CONTRACTOR",
  status: "ACTIVE",
  vehicleType: null,
  vehicleNumber: null,
  identityDocumentType: "CITIZENSHIP",
  identityDocumentLast4: "A1B2",
  identityVerifiedAt: "2026-10-15T08:00:00.000Z",
  ...overrides,
});

export const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

export const emptyPage = { items: [], nextCursor: null };
