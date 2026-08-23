"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { profileApi } from "../api/profileApi";
import { useAuth } from "../context/AuthContext";
import type { AddPhoneNumberInput } from "../schemas/addPhoneNumber.schema";

export const useAddPhoneNumber = () => {
  const { updateUser } = useAuth();

  return useMutation<void, ApiClientError, AddPhoneNumberInput>({
    mutationFn: ({ phone }) => profileApi.updateMe({ phone }),
    onSuccess: (_data, { phone }) => {
      updateUser({ phone });
    },
  });
};
