"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { SubmitContentReportInput } from "../api/exploreFeedSchemas";

export const useReportContent = (onSubmitted: () => void) => {
  return useMutation({
    mutationFn: (input: SubmitContentReportInput) => exploreFeedApi.submitContentReport(input),
    onSuccess: () => {
      toast.success("Thanks — our team will take a look.");
      onSubmitted();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
