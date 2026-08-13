"use client";

import type { RefObject } from "react";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

type HiddenFileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
};

export const HiddenFileInput = ({ inputRef, onFilesSelected }: HiddenFileInputProps) => (
  <input
    ref={inputRef}
    type="file"
    accept={ACCEPTED_IMAGE_TYPES}
    className="hidden"
    onChange={(event) => onFilesSelected(event.target.files)}
  />
);
