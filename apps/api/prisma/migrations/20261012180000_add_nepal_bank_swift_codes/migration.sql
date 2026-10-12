-- AlterTable
ALTER TABLE "nepal_banks" ADD COLUMN     "swift_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "nepal_banks_swift_code_key" ON "nepal_banks"("swift_code");

UPDATE "nepal_banks" SET "swift_code" = 'NEBLNPKA' WHERE "code" = 'A01';
UPDATE "nepal_banks" SET "swift_code" = 'ADBLNPKA' WHERE "code" = 'A02';
UPDATE "nepal_banks" SET "swift_code" = 'NARBNPKA' WHERE "code" = 'A03';
UPDATE "nepal_banks" SET "swift_code" = 'NIBLNPKT' WHERE "code" = 'A04';
UPDATE "nepal_banks" SET "swift_code" = 'SCBLNPKA' WHERE "code" = 'A05';
UPDATE "nepal_banks" SET "swift_code" = 'HIMANPKA' WHERE "code" = 'A06';
UPDATE "nepal_banks" SET "swift_code" = 'NSBINPKA' WHERE "code" = 'A07';
UPDATE "nepal_banks" SET "swift_code" = 'EVBLNPKA' WHERE "code" = 'A08';
UPDATE "nepal_banks" SET "swift_code" = 'KMBLNPKA' WHERE "code" = 'A09';
UPDATE "nepal_banks" SET "swift_code" = 'LXBLNPKA' WHERE "code" = 'A10';
UPDATE "nepal_banks" SET "swift_code" = 'CTZNNPKA' WHERE "code" = 'A11';
UPDATE "nepal_banks" SET "swift_code" = 'PCBLNPKA' WHERE "code" = 'A12';
UPDATE "nepal_banks" SET "swift_code" = 'SNMANPKA' WHERE "code" = 'A13';
UPDATE "nepal_banks" SET "swift_code" = 'MBLNNPKA' WHERE "code" = 'A14';
UPDATE "nepal_banks" SET "swift_code" = 'NICENPKA' WHERE "code" = 'A15';
UPDATE "nepal_banks" SET "swift_code" = 'GLBBNPKA' WHERE "code" = 'A16';
UPDATE "nepal_banks" SET "swift_code" = 'NMBBNPKA' WHERE "code" = 'A17';
UPDATE "nepal_banks" SET "swift_code" = 'PRVUNPKA' WHERE "code" = 'A18';
UPDATE "nepal_banks" SET "swift_code" = 'SIDDNPKA' WHERE "code" = 'A19';
UPDATE "nepal_banks" SET "swift_code" = 'RBBANPKA' WHERE "code" = 'A20';
