"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { profileApi } from "../api/profileApi";
import type { UpdateOwnProfileInput } from "../api/userProfileSchemas";

export const useUpdateOwnProfile = () => {
  return useMutation<void, ApiClientError, UpdateOwnProfileInput>({
    mutationFn: profileApi.updateMe,
  });
};
