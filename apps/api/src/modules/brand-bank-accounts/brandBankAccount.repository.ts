import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  BrandBankAccountRecord,
  BrandBankAccountWithBankName,
  CreateBrandBankAccountRepositoryInput,
} from "./brandBankAccount.types.js";

const withBankName = { bank: { select: { name: true } } };

const flattenBankName = <T extends { bank: { name: string } }>({
  bank,
  ...record
}: T): Omit<T, "bank"> & { bankName: string } => ({ ...record, bankName: bank.name });

export const brandBankAccountRepository = {
  async countForBrand(brandId: string, client: DbClient = prisma): Promise<number> {
    return client.brandBankAccount.count({ where: { brandId } });
  },

  async create(
    input: CreateBrandBankAccountRepositoryInput,
    client: DbClient = prisma,
  ): Promise<BrandBankAccountWithBankName> {
    const record = await client.brandBankAccount.create({
      data: {
        brandId: input.brandId,
        bankId: input.bankId,
        accountName: input.accountName,
        accountNumberCiphertext: input.accountNumberCiphertext,
        accountNumberLast4: input.accountNumberLast4,
        branchName: input.branchName,
        isDefault: input.isDefault,
      },
      include: withBankName,
    });
    return flattenBankName(record);
  },

  async listForBrand(brandId: string): Promise<BrandBankAccountWithBankName[]> {
    const rows = await prisma.brandBankAccount.findMany({
      where: { brandId },
      include: withBankName,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(flattenBankName);
  },

  async findById(id: string): Promise<BrandBankAccountRecord | null> {
    return prisma.brandBankAccount.findUnique({ where: { id } });
  },

  async setDefault(brandId: string, id: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const owned = await tx.brandBankAccount.findFirst({
        where: { id, brandId },
        select: { id: true },
      });
      if (!owned) return false;

      await tx.brandBankAccount.updateMany({
        where: { brandId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.brandBankAccount.update({ where: { id }, data: { isDefault: true } });
      return true;
    });
  },

  async verify(id: string, adminId: string): Promise<boolean> {
    const result = await prisma.brandBankAccount.updateMany({
      where: { id, isVerified: false },
      data: { isVerified: true, verifiedAt: new Date(), verifiedById: adminId },
    });
    return result.count > 0;
  },

  async createAccessLog(brandBankAccountId: string, adminId: string): Promise<void> {
    await prisma.brandBankAccountAccessLog.create({ data: { brandBankAccountId, adminId } });
  },

  async stampFirstPayoutCrossCheck(
    id: string,
    adminId: string,
    client: DbClient = prisma,
  ): Promise<void> {
    await client.brandBankAccount.update({
      where: { id },
      data: { firstPayoutCrossCheckedAt: new Date(), firstPayoutCrossCheckedById: adminId },
    });
  },
};
