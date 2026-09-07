import { prisma } from "#db/prisma.js";
import { AppError } from "#middlewares/error-handler.js";

import { addressRepository } from "./address.repository.js";
import type { CreateAddressBody, UpdateAddressBody } from "./address.schemas.js";
import type { PublicSavedAddress, UpdateSavedAddressFields } from "./address.types.js";
import { toPublicSavedAddress } from "./address.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

export const MAX_SAVED_ADDRESSES_PER_USER = 15;

const notFound = () => new AppError("NOT_FOUND", "Address not found.", NOT_FOUND_STATUS);

const normalizeLabel = (label: string | undefined): string | null => label?.trim() || null;

const normalizeLandmark = (landmark: string | undefined): string | null => landmark?.trim() || null;

const buildUpdateFields = (body: UpdateAddressBody): UpdateSavedAddressFields => {
  const fields: UpdateSavedAddressFields = {};
  if (body.fullName !== undefined) fields.fullName = body.fullName;
  if (body.phone !== undefined) fields.phone = body.phone;
  if (body.address !== undefined) fields.address = body.address;
  if (body.city !== undefined) fields.city = body.city;
  if (body.landmark !== undefined) fields.landmark = normalizeLandmark(body.landmark);
  if (body.label !== undefined) fields.label = normalizeLabel(body.label);
  return fields;
};

export const addressService = {
  async listForUser(userId: string): Promise<PublicSavedAddress[]> {
    const addresses = await addressRepository.listForUser(userId);
    return addresses.map(toPublicSavedAddress);
  },

  async create(userId: string, body: CreateAddressBody): Promise<PublicSavedAddress> {
    const created = await prisma.$transaction(async (tx) => {
      const existingCount = await addressRepository.countForUser(userId, tx);
      if (existingCount >= MAX_SAVED_ADDRESSES_PER_USER) {
        throw new AppError(
          "ADDRESS_LIMIT_REACHED",
          `You can save up to ${MAX_SAVED_ADDRESSES_PER_USER} addresses. Remove one to add another.`,
          CONFLICT_STATUS,
        );
      }

      const shouldBeDefault = existingCount === 0 || body.isDefault === true;
      if (shouldBeDefault) await addressRepository.clearDefault(userId, tx);

      return addressRepository.create(
        {
          userId,
          label: normalizeLabel(body.label),
          fullName: body.fullName,
          phone: body.phone,
          address: body.address,
          city: body.city,
          landmark: normalizeLandmark(body.landmark),
          isDefault: shouldBeDefault,
        },
        tx,
      );
    });

    return toPublicSavedAddress(created);
  },

  async update(userId: string, id: string, body: UpdateAddressBody): Promise<PublicSavedAddress> {
    const updated = await prisma.$transaction(async (tx) => {
      const owned = await addressRepository.findOwned(userId, id, tx);
      if (!owned) throw notFound();

      const promoteToDefault = body.isDefault === true && !owned.isDefault;
      if (promoteToDefault) await addressRepository.clearDefault(userId, tx);

      return addressRepository.update(
        id,
        { ...buildUpdateFields(body), ...(promoteToDefault ? { isDefault: true } : {}) },
        tx,
      );
    });

    return toPublicSavedAddress(updated);
  },

  async remove(userId: string, id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const owned = await addressRepository.findOwned(userId, id, tx);
      if (!owned) throw notFound();

      await addressRepository.delete(id, tx);

      if (owned.isDefault) {
        const nextDefault = await addressRepository.findMostRecentForUser(userId, tx);
        if (nextDefault) {
          await addressRepository.update(nextDefault.id, { isDefault: true }, tx);
        }
      }
    });
  },

  async setDefault(userId: string, id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const owned = await addressRepository.findOwned(userId, id, tx);
      if (!owned) throw notFound();
      if (owned.isDefault) return;

      await addressRepository.clearDefault(userId, tx);
      await addressRepository.update(id, { isDefault: true }, tx);
    });
  },
};
