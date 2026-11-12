"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../../feed/api/exploreFeedApi";
import type { SubmitTagReportInput } from "../../feed/api/exploreFeedSchemas";

export const useReportTag = (onSubmitted: () => void) => {
  return useMutation({
    mutationFn: (input: SubmitTagReportInput) => exploreFeedApi.submitTagReport(input),
    onSuccess: () => {
      toast.success("Thanks — our team will take a look.");
      onSubmitted();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
