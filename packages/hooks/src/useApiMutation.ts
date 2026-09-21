"use client";

import { toast } from "@outfiqe/design-system";
import {
  type DefaultError,
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

type InvalidateKeys<TData, TVariables> =
  QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);

type SuccessMessage<TData, TVariables> = string | ((data: TData, variables: TVariables) => string);

export type UseApiMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
> = UseMutationOptions<TData, TError, TVariables, TOnMutateResult> & {
  invalidateKeys?: InvalidateKeys<TData, TVariables>;
  successMessage?: SuccessMessage<TData, TVariables>;
};

export const useApiMutation = <
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  options: UseApiMutationOptions<TData, TError, TVariables, TOnMutateResult>,
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> => {
  const queryClient = useQueryClient();
  const { invalidateKeys, successMessage, onSuccess, ...rest } = options;

  return useMutation({
    ...rest,
    onSuccess: async (data, variables, onMutateResult, mutationFnContext) => {
      const resolvedKeys =
        typeof invalidateKeys === "function" ? invalidateKeys(data, variables) : invalidateKeys;

      if (resolvedKeys && resolvedKeys.length > 0) {
        await Promise.all(
          resolvedKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }

      await onSuccess?.(data, variables, onMutateResult, mutationFnContext);

      if (successMessage) {
        toast.success(
          typeof successMessage === "function" ? successMessage(data, variables) : successMessage,
        );
      }
    },
  });
};
