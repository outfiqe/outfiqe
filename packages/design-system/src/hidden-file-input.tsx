"use client";

import type { RefObject } from "react";

export const ACCEPTED_IMAGE_TYPES =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

type HiddenFileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  multiple?: boolean;
  accept?: string;
};

export const HiddenFileInput = ({
  inputRef,
  onFilesSelected,
  multiple = false,
  accept = ACCEPTED_IMAGE_TYPES,
}: HiddenFileInputProps) => (
  <input
    ref={inputRef}
    type="file"
    accept={accept}
    multiple={multiple}
    className="hidden"
    onChange={(event) => onFilesSelected(event.target.files)}
  />
);
