"use client";

import { generateUuid } from "@outfiqe/utils";
import { useRef, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";
import { isHeicImage, toUploadableImage } from "@/shared/lib/heicImage";

import { MAX_PHOTOS } from "../constants/postModal.constants";
import type { NewLookPhoto } from "../types/newLookPhoto";

const createPhotoId = generateUuid;

export const useEditLookPhotos = (initialImageUrls: string[]) => {
  const [existingUrls, setExistingUrls] = useState(initialImageUrls);
  const [newPhotos, setNewPhotos] = useState<NewLookPhoto[]>([]);
  const [stagingPhoto, setStagingPhoto] = useState<NewLookPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPhotoCount = existingUrls.length + newPhotos.length + (stagingPhoto ? 1 : 0);
  const canAddPhoto = totalPhotoCount < MAX_PHOTOS;

  const revokeNewPhoto = (photo: NewLookPhoto) => URL.revokeObjectURL(photo.objectUrl);

  const handleFilesSelected = async (fileList: FileList | null) => {
    const selected = fileList?.item(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!selected || !canAddPhoto) return;

    setPhotoError(null);

    let photoFile = selected;
    if (isHeicImage(selected)) {
      setIsProcessingPhotos(true);
      try {
        photoFile = await toUploadableImage(selected);
      } catch (conversionFailure) {
        setPhotoError(getErrorMessage(conversionFailure));
        return;
      } finally {
        setIsProcessingPhotos(false);
      }
    }

    setStagingPhoto({
      id: createPhotoId(),
      file: photoFile,
      objectUrl: URL.createObjectURL(photoFile),
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    });
  };

  const confirmStagingPhoto = () => {
    if (!stagingPhoto?.croppedAreaPixels) return;
    setNewPhotos((current) => [...current, stagingPhoto]);
    setStagingPhoto(null);
  };

  const cancelStagingPhoto = () => {
    if (stagingPhoto) revokeNewPhoto(stagingPhoto);
    setStagingPhoto(null);
  };

  const removeExistingPhoto = (url: string) => {
    setExistingUrls((current) => current.filter((existingUrl) => existingUrl !== url));
  };

  const removeNewPhoto = (id: string) => {
    setNewPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) revokeNewPhoto(target);
      return current.filter((photo) => photo.id !== id);
    });
  };

  return {
    existingUrls,
    newPhotos,
    stagingPhoto,
    setStagingPhoto,
    photoError,
    setPhotoError,
    isProcessingPhotos,
    setIsProcessingPhotos,
    fileInputRef,
    canAddPhoto,
    revokeNewPhoto,
    handleFilesSelected,
    confirmStagingPhoto,
    cancelStagingPhoto,
    removeExistingPhoto,
    removeNewPhoto,
  };
};
