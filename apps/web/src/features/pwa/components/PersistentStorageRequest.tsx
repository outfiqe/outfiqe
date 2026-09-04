"use client";

import { useEffect } from "react";

import { requestPersistentStorage } from "../utils/requestPersistentStorage";

export const PersistentStorageRequest = () => {
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  return null;
};
