"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { useState } from "react";

import { cn } from "./cn";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-semibold text-foreground ring-2 ring-primary/30",
  {
    variants: {
      size: {
        sm: "size-8 text-xs",
        md: "size-10 text-sm",
        lg: "size-16 text-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type AvatarProps = VariantProps<typeof avatarVariants> & {
  name: string;
  imageUrl?: string | null;
  className?: string;
};

const FIRST_LETTER_END = 1;

export const Avatar = ({ name, imageUrl, size, className }: AvatarProps) => {
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const shouldShowImage = Boolean(imageUrl) && !hasImageFailed;

  return (
    <span className={cn(avatarVariants({ size }), className)}>
      {shouldShowImage ? (
        <img
          src={imageUrl ?? undefined}
          alt=""
          className="size-full object-cover"
          onError={() => setHasImageFailed(true)}
        />
      ) : (
        <span aria-hidden>{name.trim().slice(0, FIRST_LETTER_END).toUpperCase()}</span>
      )}
    </span>
  );
};
