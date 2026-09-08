import NextImage, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/cn";
import type { ResponsiveImage, ResponsiveImageSource } from "@/shared/lib/responsiveImage";

export type AppImageProps = ImageProps & {
  eager?: boolean;
  image?: ResponsiveImage | null;
};

const SOURCE_MIME_TYPE: Record<ResponsiveImageSource["format"], string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

const lqipBackgroundStyle = (lqip: string | null): CSSProperties =>
  lqip
    ? { backgroundImage: `url("${lqip}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

type ResponsivePictureProps = {
  image: ResponsiveImage;
  alt: string;
  eager: boolean;
  fill?: boolean;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
};

const ResponsivePicture = ({
  image,
  alt,
  eager,
  fill,
  sizes,
  className,
  style,
  width,
  height,
}: ResponsivePictureProps) => {
  const jpegSource = image.sources.find((source) => source.format === "jpeg");
  const negotiatedSources = image.sources.filter((source) => source.format !== "jpeg");

  return (
    <picture>
      {negotiatedSources.map((source) => (
        <source
          key={source.format}
          type={SOURCE_MIME_TYPE[source.format]}
          srcSet={source.srcSet}
          sizes={sizes}
        />
      ))}
      <img
        src={image.url}
        srcSet={jpegSource?.srcSet}
        sizes={sizes}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        style={{ ...lqipBackgroundStyle(image.lqip), ...style }}
        className={cn(
          fill ? "absolute inset-0 size-full object-cover" : "h-auto max-w-full",
          className,
        )}
      />
    </picture>
  );
};

export const AppImage = ({
  eager = false,
  className,
  fill,
  image,
  src,
  sizes,
  alt,
  style,
  width,
  height,
  ...rest
}: AppImageProps) => {
  if (image && image.sources.length > 0) {
    return (
      <ResponsivePicture
        image={image}
        alt={typeof alt === "string" ? alt : ""}
        eager={eager}
        fill={fill}
        sizes={sizes}
        className={className}
        style={style}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
      />
    );
  }

  const resolvedSrc = image?.url ?? src;
  const blurPlaceholder = image?.lqip
    ? ({ placeholder: "blur", blurDataURL: image.lqip } as const)
    : {};

  return (
    <NextImage
      src={resolvedSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      style={style}
      width={width}
      height={height}
      className={cn(fill && "object-cover", className)}
      {...(eager ? { priority: true } : { loading: "lazy" })}
      {...blurPlaceholder}
      {...rest}
    />
  );
};
