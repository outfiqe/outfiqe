export type ResponsiveImageFormat = "avif" | "webp" | "jpeg";

export type ResponsiveImageSource = {
  format: ResponsiveImageFormat;
  srcSet: string;
};

export type ResponsiveImage = {
  url: string;
  lqip: string | null;
  sources: ResponsiveImageSource[];
};
