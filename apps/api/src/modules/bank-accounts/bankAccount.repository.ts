import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  BankAccountRecord,
  BankAccountWithBankName,
  CreateBankAccountRepositoryInput,
} from "./bankAccount.types.js";

const withBankName = { bank: { select: { name: true } } };

const flattenBankName = <T extends { bank: { name: string } }>({
  bank,
  ...record
}: T): Omit<T, "bank"> & { bankName: string } => ({ ...record, bankName: bank.name });

export const bankAccountRepository = {
  async countForUser(userId: string, client: DbClient = prisma): Promise<number> {
    return client.bankAccount.count({ where: { userId } });
  },

  async create(
    input: CreateBankAccountRepositoryInput,
    client: DbClient = prisma,
  ): Promise<BankAccountWithBankName> {
    const record = await client.bankAccount.create({
      data: {
        userId: input.userId,
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

  async listForUser(userId: string): Promise<BankAccountWithBankName[]> {
    const rows = await prisma.bankAccount.findMany({
      where: { userId },
      include: withBankName,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(flattenBankName);
  },

  async findById(id: string): Promise<BankAccountRecord | null> {
    return prisma.bankAccount.findUnique({ where: { id } });
  },

  async setDefault(userId: string, id: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const owned = await tx.bankAccount.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) return false;

      await tx.bankAccount.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.bankAccount.update({ where: { id }, data: { isDefault: true } });
      return true;
    });
  },

  async verify(id: string, adminId: string): Promise<boolean> {
    const result = await prisma.bankAccount.updateMany({
      where: { id, isVerified: false },
      data: { isVerified: true, verifiedAt: new Date(), verifiedById: adminId },
    });
    return result.count > 0;
  },

  async createAccessLog(bankAccountId: string, adminId: string): Promise<void> {
    await prisma.bankAccountAccessLog.create({ data: { bankAccountId, adminId } });
  },
};
