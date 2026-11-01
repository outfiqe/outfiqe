import { Shirt } from "lucide-react";

export const ProductThumbnail = ({
  imageUrl,
  productName,
}: {
  imageUrl: string | null;
  productName: string;
}) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt={productName}
      className="size-12 shrink-0 rounded-lg bg-muted object-cover"
    />
  ) : (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted"
    >
      <Shirt className="size-5 text-muted-foreground" />
    </span>
  );
