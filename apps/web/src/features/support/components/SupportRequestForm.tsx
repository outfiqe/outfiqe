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
  Select,
} from "@outfiqe/design-system";
import { useForm } from "react-hook-form";

import { useDelayedPending } from "@/shared/hooks/useDelayedPending";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useSubmitSupportRequest } from "../hooks/useSupportRequests";
import {
  CATEGORY_LABELS,
  SUPPORT_CATEGORY_VALUES,
  type SupportCategoryValue,
  type SupportRequestFormInput,
  supportRequestFormSchema,
} from "../schemas/support.schema";

type SupportRequestFormProps = {
  defaultCategory?: SupportCategoryValue;
  relatedOrderId?: string;
  onSubmitted?: (result: { reference: string; id: string }) => void;
};

export const SupportRequestForm = ({
  defaultCategory = "ORDER_ISSUE",
  relatedOrderId,
  onSubmitted,
}: SupportRequestFormProps) => {
  const submit = useSubmitSupportRequest();
  const showPending = useDelayedPending(submit.isPending);

  const form = useForm<SupportRequestFormInput>({
    resolver: zodResolver(supportRequestFormSchema),
    defaultValues: { category: defaultCategory, subject: "", message: "", relatedOrderId },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await submit.mutateAsync(values);
      onSubmitted?.(result);
    } catch {
      // surfaced via submit.error below
    }
  });

  if (submit.isSuccess) {
    return (
      <FormBanner tone="success">
        Thanks — your request is in. Reference {submit.data.reference}. We&apos;ll reply by email,
        and you can follow it here under &ldquo;Your requests&rdquo;.
      </FormBanner>
    );
  }

  return (
    <div className="rounded-2xl bg-muted p-6 sm:p-8">
      {submit.isError && <FormBanner>{getErrorMessage(submit.error)}</FormBanner>}

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What&apos;s this about?</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {SUPPORT_CATEGORY_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input placeholder="A short summary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <textarea
                    rows={6}
                    placeholder="What happened, and what would help?"
                    className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={submit.isPending}>
            {showPending ? "Sending…" : "Send request"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
