"use client";

import type { PixelCrop } from "@outfiqe/design-system";
import { useRef, useState } from "react";

export type PendingPhoto = {
  id: string;
  file: File;
  objectUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: PixelCrop | null;
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export const usePendingPhotos = (maxPhotos: number) => {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePhoto = photos.find((photo) => photo.id === activeId) ?? null;

  const addFile = (file: File) => {
    if (photos.length >= maxPhotos) return;
    const photo: PendingPhoto = {
      id: createId(),
      file,
      objectUrl: URL.createObjectURL(file),
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null,
    };
    setPhotos((current) => [...current, photo]);
    setActiveId(photo.id);
  };

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.item(0);
    if (inputRef.current) inputRef.current.value = "";
    if (file) addFile(file);
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
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
    photos.forEach((photo) => URL.revokeObjectURL(photo.objectUrl));
    setPhotos([]);
    setActiveId(null);
  };

  return {
    photos,
    activePhoto,
    setActiveId,
    inputRef,
    handleFileSelect,
    removePhoto,
    updateActivePhoto,
    reset,
  };
};
