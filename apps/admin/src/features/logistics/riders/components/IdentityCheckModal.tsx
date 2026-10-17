import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Modal,
  Select,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useForm } from "react-hook-form";

import { ridersApi } from "../api/ridersApi";
import { IDENTITY_DOCUMENT_TYPE, type Rider } from "../api/ridersSchemas";
import { IDENTITY_DOCUMENT_TYPE_LABELS } from "../constants/riderLabels";
import { RIDERS_QUERY_KEY } from "../constants/riderQueryKeys";
import {
  identityCheckFormSchema,
  type IdentityCheckFormValues,
} from "../schemas/riderForms.schema";

const DOCUMENT_LAST4_LENGTH = 4;

type IdentityCheckModalProps = {
  rider: Rider;
  onClose: () => void;
};

export const IdentityCheckModal = ({ rider, onClose }: IdentityCheckModalProps) => {
  const form = useForm<IdentityCheckFormValues>({
    resolver: zodResolver(identityCheckFormSchema),
    defaultValues: { documentType: IDENTITY_DOCUMENT_TYPE.CITIZENSHIP, documentLast4: "" },
    mode: "onTouched",
  });

  const recordIdentityCheck = useApiMutation({
    mutationFn: (values: IdentityCheckFormValues) =>
      ridersApi.recordIdentityCheck(rider.id, values),
    invalidateKeys: [RIDERS_QUERY_KEY],
    successMessage: "ID check recorded.",
    onSuccess: onClose,
  });

  const submitIdentityCheck = form.handleSubmit((values) => recordIdentityCheck.mutate(values));

  return (
    <Modal
      open
      onClose={onClose}
      title={`Check ${rider.name}'s ID`}
      description="Look at the original document in person. We only keep its type and last 4 characters, never a photo."
    >
      <Form {...form}>
        <form onSubmit={submitIdentityCheck} noValidate className="space-y-3">
          <FormField
            control={form.control}
            name="documentType"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Document</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {Object.values(IDENTITY_DOCUMENT_TYPE).map((documentType) => (
                      <option key={documentType} value={documentType}>
                        {IDENTITY_DOCUMENT_TYPE_LABELS[documentType]}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="documentLast4"
            render={({ field }) => (
              <FormItem className="mt-0 space-y-1.5">
                <FormLabel>Last 4 characters of the document number</FormLabel>
                <FormControl>
                  <Input maxLength={DOCUMENT_LAST4_LENGTH} autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={recordIdentityCheck.isPending}>
              I checked it
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
};
