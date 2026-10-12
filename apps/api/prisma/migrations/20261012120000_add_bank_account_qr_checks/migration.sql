-- CreateEnum
CREATE TYPE "BankQrCheckStatus" AS ENUM ('NOT_CHECKED', 'MATCHED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "BankQrCheckReason" AS ENUM ('NOT_PAYMENT_QR', 'INVALID_CHECKSUM', 'NAME_NOT_FOUND', 'NAME_DIFFERS', 'ACCOUNT_NUMBER_NOT_FOUND', 'READ_FAILED');

-- CreateEnum
CREATE TYPE "BankAccountVerificationMethod" AS ENUM ('MANUAL', 'QR_MATCH');

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "qr_check_reason" "BankQrCheckReason",
ADD COLUMN     "qr_check_status" "BankQrCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
ADD COLUMN     "qr_checked_at" TIMESTAMP(3),
ADD COLUMN     "verification_method" "BankAccountVerificationMethod";

-- AlterTable
ALTER TABLE "brand_bank_accounts" ADD COLUMN     "qr_check_reason" "BankQrCheckReason",
ADD COLUMN     "qr_check_status" "BankQrCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
ADD COLUMN     "qr_checked_at" TIMESTAMP(3),
ADD COLUMN     "verification_method" "BankAccountVerificationMethod";

UPDATE "bank_accounts" SET "verification_method" = 'MANUAL' WHERE "is_verified" = true;

UPDATE "brand_bank_accounts" SET "verification_method" = 'MANUAL' WHERE "is_verified" = true;
