"use client";

import { useRef, useState } from "react";

type PendingCrop = { file: File; objectUrl: string };

type UseImageCropUploadOptions = {
  onChange: (url: string | null) => void;
  onUpload: (files: File[]) => Promise<string[]>;
};

export const useImageCropUpload = ({ onChange, onUpload }: UseImageCropUploadOptions) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const [url] = await onUpload([file]);
      if (url) onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.item(0);
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setPendingCrop({ file, objectUrl: URL.createObjectURL(file) });
  };

  const closeCropModal = () => {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.objectUrl);
    setPendingCrop(null);
  };

  const handleCropConfirm = (croppedFile: File) => {
    closeCropModal();
    void uploadFile(croppedFile);
  };

  return {
    inputRef,
    isUploading,
    error,
    pendingCrop,
    handleFileSelect,
    closeCropModal,
    handleCropConfirm,
  };
};
