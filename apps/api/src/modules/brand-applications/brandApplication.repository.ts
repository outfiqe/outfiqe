import { prisma } from "../../shared/db/prisma.js";

import type {
  BrandApplicationRecord,
  CreateBrandApplicationInput,
} from "./brandApplication.types.js";

export const brandApplicationRepository = {
  async create(input: CreateBrandApplicationInput): Promise<BrandApplicationRecord> {
    return prisma.brandApplication.create({ data: input });
  },
};
