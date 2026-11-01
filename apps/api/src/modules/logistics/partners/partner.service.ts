import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsHubRepository } from "../hubs/hub.repository.js";
import { logisticsErrors } from "../logistics.errors.js";
import { partnerAdapterRegistry } from "./adapters/partner-adapter.registry.js";
import { logisticsPartnerRepository, type PartnerWriteFields } from "./partner.repository.js";
import type {
  PartnerAccountBody,
  PartnerBody,
  ReplacePartnerZonesBody,
  SavePartnerStatusMapBody,
} from "./partner.schemas.js";
import type { PartnerView } from "./partner.types.js";
import { toPartnerView } from "./partner.utils.js";
import { normalizePartnerRawStatus } from "./partner-status.utils.js";

const hasNoDuplicates = (values: readonly string[]) => new Set(values).size === values.length;

const partnerNotFoundError = () => logisticsErrors.partnerNotFound();

const requirePartner = async (partnerId: string) => {
  const partner = await logisticsPartnerRepository.findPartnerById(partnerId);
  if (!partner) throw partnerNotFoundError();
  return partner;
};

const requireHubInPartnerCountry = async (hubId: string, countryCode: string) => {
  const hub = await logisticsHubRepository.findHubById(hubId);
  if (!hub) throw logisticsErrors.hubNotFound();
  if (hub.countryCode !== countryCode) {
    throw new AppError(
      "HUB_NOT_IN_PARTNER_COUNTRY",
      "This partner works in a different country from the hub.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
  return hub;
};

const toPartnerWriteFields = (body: PartnerBody): PartnerWriteFields => ({
  ...body,
  ...partnerAdapterRegistry.describeCapabilities(body.adapterKey),
});

const withPartnerCodeConflictHandling = async <Result>(write: () => Promise<Result>) => {
  try {
    return await write();
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    throw new AppError(
      "PARTNER_CODE_TAKEN",
      "Another delivery partner already uses that code.",
      HTTP_STATUS.CONFLICT,
    );
  }
};

const reloadPartnerView = async (partnerId: string): Promise<PartnerView> =>
  toPartnerView(await requirePartner(partnerId));

export const logisticsPartnerService = {
  async listPartners(): Promise<PartnerView[]> {
    const partners = await logisticsPartnerRepository.listPartners();
    return partners.map(toPartnerView);
  },

  async getPartner(partnerId: string): Promise<PartnerView> {
    return reloadPartnerView(partnerId);
  },

  async createPartner(body: PartnerBody): Promise<PartnerView> {
    const partner = await withPartnerCodeConflictHandling(() =>
      logisticsPartnerRepository.createPartner(toPartnerWriteFields(body)),
    );
    return toPartnerView(partner);
  },

  async updatePartner(partnerId: string, body: PartnerBody): Promise<PartnerView> {
    const currentPartner = await requirePartner(partnerId);
    const isMovingCountryWithSetup =
      body.countryCode !== currentPartner.countryCode &&
      (currentPartner.accounts.length > 0 || currentPartner.zones.length > 0);
    if (isMovingCountryWithSetup) {
      throw new AppError(
        "PARTNER_HAS_HUB_SETUP",
        "Remove this partner's hub accounts and areas before moving it to another country.",
        HTTP_STATUS.CONFLICT,
      );
    }
    const partner = await withPartnerCodeConflictHandling(() =>
      logisticsPartnerRepository.updatePartner(partnerId, toPartnerWriteFields(body)),
    );
    return toPartnerView(partner);
  },

  async savePartnerAccount(
    partnerId: string,
    hubId: string,
    body: PartnerAccountBody,
  ): Promise<PartnerView> {
    const partner = await requirePartner(partnerId);
    await requireHubInPartnerCountry(hubId, partner.countryCode);
    await logisticsPartnerRepository.upsertPartnerAccount(partnerId, hubId, body);
    return reloadPartnerView(partnerId);
  },

  async replacePartnerZones(
    partnerId: string,
    { hubId, zones }: ReplacePartnerZonesBody,
  ): Promise<PartnerView> {
    const partner = await requirePartner(partnerId);
    await requireHubInPartnerCountry(hubId, partner.countryCode);
    const hasAccountAtHub = partner.accounts.some((account) => account.hubId === hubId);
    if (!hasAccountAtHub) {
      throw new AppError(
        "PARTNER_HAS_NO_ACCOUNT_AT_HUB",
        "Add our merchant account with this partner for the hub first.",
        HTTP_STATUS.CONFLICT,
      );
    }
    const deliveryZoneIds = zones.map(({ deliveryZoneId }) => deliveryZoneId);
    const matchingZoneCount = await logisticsHubRepository.countZonesInCountry(
      deliveryZoneIds,
      partner.countryCode,
    );
    if (matchingZoneCount !== deliveryZoneIds.length) {
      throw new AppError(
        "PARTNER_ZONE_NOT_IN_COUNTRY",
        "Every area must be a delivery zone in the partner's country.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }
    await prisma.$transaction((tx) =>
      logisticsPartnerRepository.replacePartnerZonesForHub(tx, { partnerId, hubId, zones }),
    );
    return reloadPartnerView(partnerId);
  },

  async savePartnerStatusMap(
    partnerId: string,
    { mappings }: SavePartnerStatusMapBody,
  ): Promise<PartnerView> {
    await requirePartner(partnerId);
    const normalizedMappings = mappings.map((mapping) => ({
      ...mapping,
      rawStatus: normalizePartnerRawStatus(mapping.rawStatus),
    }));
    if (!hasNoDuplicates(normalizedMappings.map(({ rawStatus }) => rawStatus))) {
      throw new AppError(
        "DUPLICATE_PARTNER_STATUS",
        "Each of the partner's status words can only be mapped once.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }
    await prisma.$transaction((tx) =>
      logisticsPartnerRepository.replacePartnerStatusMap(tx, partnerId, normalizedMappings),
    );
    return reloadPartnerView(partnerId);
  },
};
