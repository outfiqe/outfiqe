export type PublicImageVariant = {
  width: number;
  format: "avif" | "webp" | "jpeg";
  url: string;
};

export type PublicImageAsset = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  variants: PublicImageVariant[];
  thumbnailUrl: string | null;
  lqip: string | null;
  errorMessage: string | null;
};
