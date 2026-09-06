"use client";

import { getCroppedImageFile, type PixelCrop } from "@outfiqe/design-system";
import { generateUuid } from "@outfiqe/utils";
import { useRef, useState } from "react";

import { uploadsApi } from "@/shared/api/uploadsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { isHeicImage, toUploadableImage } from "@/shared/lib/heicImage";

export type PendingPhoto = {
  id: string;
  url: string;
  file: File | null;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: PixelCrop | null;
};

const toExistingPhoto = (url: string): PendingPhoto => ({
  id: url,
  url,
  file: null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels: null,
});

export const usePendingPhotos = (maxPhotos: number, initialUrls: string[] = []) => {
  const [photos, setPhotos] = useState<PendingPhoto[]>(() => initialUrls.map(toExistingPhoto));
  const [activeId, setActiveId] = useState<string | null>(() => initialUrls[0] ?? null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePhoto = photos.find((photo) => photo.id === activeId) ?? null;

  const addFile = (file: File) => {
    if (photos.length >= maxPhotos) return;
    const photo: PendingPhoto = {
      id: generateUuid(),
      url: URL.createObjectURL(file),
      file,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    };
    setPhotos((current) => [...current, photo]);
    setActiveId(photo.id);
  };

  const importFile = async (selectedFile: File) => {
    setImportError(null);

    if (!isHeicImage(selectedFile)) {
      addFile(selectedFile);
      return;
    }

    setIsImportingFile(true);
    try {
      addFile(await toUploadableImage(selectedFile));
    } catch (conversionFailure) {
      setImportError(getErrorMessage(conversionFailure));
    } finally {
      setIsImportingFile(false);
    }
  };

  const handleFileSelect = async (fileList: FileList | null) => {
    const selectedFile = fileList?.item(0);
    if (inputRef.current) inputRef.current.value = "";
    if (!selectedFile) return;

    await importFile(selectedFile);
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      const next = current.filter((photo) => photo.id !== id);
      if (id === activeId) setActiveId(next[next.length - 1]?.id ?? null);
      return next;
    });
  };

  const updateActivePhoto = (
    patch: Partial<Pick<PendingPhoto, "crop" | "zoom" | "croppedAreaPixels">>,
  ) => {
    if (!activeId) return;
    setPhotos((current) =>
      current.map((photo) => (photo.id === activeId ? { ...photo, ...patch } : photo)),
    );
  };

  const reset = () => {
    photos.forEach((photo) => {
      if (photo.file) URL.revokeObjectURL(photo.url);
    });
    setPhotos([]);
    setActiveId(null);
    setImportError(null);
  };

  return {
    photos,
    activePhoto,
    setActiveId,
    inputRef,
    handleFileSelect,
    importFile,
    isImportingFile,
    importError,
    removePhoto,
    updateActivePhoto,
    reset,
  };
};

const isNewPhoto = (photo: PendingPhoto): photo is PendingPhoto & { file: File } =>
  photo.file !== null;

export const resolvePendingPhotoUrls = async (
  photos: PendingPhoto[],
  defaultMimeType: string,
): Promise<string[]> => {
  const newPhotos = photos.filter(isNewPhoto);
  if (newPhotos.length === 0) return photos.map((photo) => photo.url);

  const files = await Promise.all(
    newPhotos.map((photo) =>
      photo.croppedAreaPixels
        ? getCroppedImageFile(
            photo.url,
            photo.croppedAreaPixels,
            photo.file.name,
            photo.file.type || defaultMimeType,
          )
        : photo.file,
    ),
  );
  const uploadedUrls = await uploadsApi.upload(files);
  const remainingUploadedUrls = [...uploadedUrls];

  return photos.map((photo) => {
    if (!photo.file) return photo.url;
    const uploadedUrl = remainingUploadedUrls.shift();
    if (!uploadedUrl) throw new Error("Photo upload returned fewer URLs than expected");
    return uploadedUrl;
  });
};
