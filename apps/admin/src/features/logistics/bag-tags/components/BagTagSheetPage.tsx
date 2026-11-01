import { QrCode } from "@outfiqe/components";
import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { BackLink } from "@/components/BackLink";

import { useBagTagSheet } from "../hooks/useBagTagSheet";

const STICKER_QR_SIZE_PX = 96;

type BagTagSheetPageProps = { batchId: string };

export const BagTagSheetPage = ({ batchId }: BagTagSheetPageProps) => {
  const { data: sheet, isPending, isError } = useBagTagSheet(batchId);

  if (isError) return <FormBanner>We couldn&apos;t load this sticker sheet.</FormBanner>;

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading sticker sheet">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const unusedTags = sheet.tags.filter((tag) => !tag.isUsed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <BackLink to="/logistics/bag-tags">All bag stickers</BackLink>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
            {sheet.hubName} stickers
          </h1>
          <p className="text-sm text-muted-foreground">
            {unusedTags.length} of {sheet.tagCount} not used yet. Used stickers are left off the
            sheet.
          </p>
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <div
        data-print-sheet
        className="grid grid-cols-3 gap-3 bg-white p-3 text-black sm:grid-cols-4 lg:grid-cols-5"
      >
        {unusedTags.map(({ code }) => (
          <div
            key={code}
            className="flex break-inside-avoid flex-col items-center rounded-lg border border-dashed border-neutral-400 p-2"
          >
            <QrCode value={code} label={`Bag sticker ${code}`} size={STICKER_QR_SIZE_PX} />
            <p className="mt-1 font-mono text-sm font-bold tracking-widest">{code}</p>
            <p className="text-[10px] uppercase tracking-wide">Outfiqe bag</p>
          </div>
        ))}
      </div>
    </div>
  );
};
