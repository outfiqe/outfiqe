"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormBanner,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
  Skeleton,
  toast,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { useNepalBanks } from "@/features/nepal-banks";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  type AddBankAccountInput,
  addBankAccountSchema,
  type OwnerTypeValue,
} from "../api/bankAccountSchemas";
import { useAddBankAccount } from "../hooks/useAddBankAccount";

type AddBankAccountModalProps = {
  ownerType: OwnerTypeValue;
  onClose: () => void;
};

export const AddBankAccountModal = ({ ownerType, onClose }: AddBankAccountModalProps) => {
  const { data: banks, isPending: isBanksPending } = useNepalBanks();
  const addBankAccount = useAddBankAccount(ownerType);

  const form = useForm<AddBankAccountInput>({
    resolver: zodResolver(addBankAccountSchema),
    defaultValues: {
      bankId: "",
      accountName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      branchName: "",
    },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await addBankAccount.mutateAsync(values).catch(() => null);
    if (!result) return;

    if (result.nameMismatch) {
      toast.warning(
        "The account holder name doesn't match your profile name — this may slow down verification.",
      );
    }
    onClose();
  });

  return (
    <Modal open onClose={onClose} title="Add bank account" ariaLabel="Add bank account">
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate>
          {addBankAccount.isError && (
            <FormBanner className="mb-4">{getErrorMessage(addBankAccount.error)}</FormBanner>
          )}

          <FormField
            control={form.control}
            name="bankId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank</FormLabel>
                <FormControl>
                  {isBanksPending ? (
                    <Skeleton className="h-11 w-full rounded-lg" />
                  ) : (
                    <Select {...field}>
                      <option value="">Select a bank</option>
                      {banks?.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name} ({bank.code})
                        </option>
                      ))}
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account holder name</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account number</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmAccountNumber"
              render={({ field }) => (
                <FormItem className="mt-0">
                  <FormLabel>Confirm account number</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="branchName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl>
                  <Input autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={addBankAccount.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addBankAccount.isPending}>
              {addBankAccount.isPending ? "Adding…" : "Add bank account"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
