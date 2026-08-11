"use client";

import { useState } from "react";

import { uploadsApi } from "@/shared/api/uploadsApi";

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    setError(null);
    try {
      return await uploadsApi.upload(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
};
