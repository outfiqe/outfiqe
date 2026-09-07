import NextImage, { type ImageProps } from "next/image";

import { cn } from "@/shared/lib/cn";

export type AppImageProps = ImageProps & {
  eager?: boolean;
};

export const AppImage = ({ eager = false, className, fill, ...rest }: AppImageProps) => (
  <NextImage
    fill={fill}
    className={cn(fill && "object-cover", className)}
    {...(eager ? { priority: true } : { loading: "lazy" })}
    {...rest}
  />
);
