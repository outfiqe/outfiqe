"use client";

import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { sizeStandardsApi } from "../api/sizeStandardsApi";
import type { SizeStandard, SizeStandardInput } from "../api/sizeStandardSchemas";

export const SIZE_STANDARDS_QUERY_KEY = ["brand-size-standards"];

export const useSizeStandards = () =>
  useQuery({ queryKey: SIZE_STANDARDS_QUERY_KEY, queryFn: sizeStandardsApi.list });

export const useCreateSizeStandard = () =>
  useApiMutation<SizeStandard, ApiClientError, SizeStandardInput>({
    mutationFn: sizeStandardsApi.create,
    invalidateKeys: [SIZE_STANDARDS_QUERY_KEY],
  });

export const useUpdateSizeStandard = () =>
  useApiMutation<SizeStandard, ApiClientError, { standardId: string; input: SizeStandardInput }>({
    mutationFn: ({ standardId, input }) => sizeStandardsApi.update(standardId, input),
    invalidateKeys: [SIZE_STANDARDS_QUERY_KEY],
  });

export const useArchiveSizeStandard = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: sizeStandardsApi.archive,
    invalidateKeys: [SIZE_STANDARDS_QUERY_KEY],
  });
