"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type LoginResponse } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import { AuthActionType } from "../../types";
import { RIDER_HOME_PATH } from "../../utils/getDefaultRoute";
import type { RiderRegisterInput } from "../schemas/riderRegister.schema";

export const useRiderRegister = () => {
  const { dispatch } = useAuth();
  const router = useRouter();

  return useMutation<LoginResponse, ApiClientError, RiderRegisterInput>({
    mutationFn: authApi.registerRider,
    onSuccess: ({ user, accessToken }) => {
      dispatch({ type: AuthActionType.AUTH_SUCCESS, payload: { user, accessToken } });
      router.replace(RIDER_HOME_PATH);
    },
  });
};
