"use client";

import { Button, FormBanner, Input, RadioGroup, Select, Textarea } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { OFFER_PAYMENT_METHODS, type OfferPaymentMethod } from "../api/offerSchemas";
import { useSendOffer } from "../hooks/useOffers";

const WHOLE_RUPEES = /^\d+$/;
const NO_CREATOR_PICKED = "";
const NOTE_MAX_LENGTH = 300;
const NO_AMOUNT = 0;
const NO_PEOPLE = 0;

type SendOfferPanelProps = {
  outfitId: string;
  people: { id: string; name: string }[];
};

export const SendOfferPanel = ({ outfitId, people }: SendOfferPanelProps) => {
  const t = useTranslations("outfitBuild.offer");
  const titleId = useId();
  const creatorFieldId = useId();
  const amountFieldId = useId();
  const noteFieldId = useId();
  const sendOffer = useSendOffer(outfitId);
  const [creatorId, setCreatorId] = useState(NO_CREATOR_PICKED);
  const [enteredAmount, setEnteredAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<OfferPaymentMethod>("KHALTI");
  const [note, setNote] = useState("");
  const [formProblem, setFormProblem] = useState<string | null>(null);

  if (people.length === NO_PEOPLE) {
    return (
      <section aria-labelledby={titleId} className="rounded-xl border border-border bg-card p-4">
        <h2 id={titleId} className="text-sm font-semibold text-foreground">
          {t("panelTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("noCreators")}</p>
      </section>
    );
  }

  const sendIfValid = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedAmount = enteredAmount.trim();
    if (creatorId === NO_CREATOR_PICKED) {
      setFormProblem(t("pickCreatorFirst"));
      return;
    }
    if (!WHOLE_RUPEES.test(trimmedAmount) || Number(trimmedAmount) <= NO_AMOUNT) {
      setFormProblem(t("wholeRupees"));
      return;
    }
    setFormProblem(null);
    const trimmedNote = note.trim();
    sendOffer.mutate({
      creatorId,
      amount: Number(trimmedAmount),
      paymentMethod,
      ...(trimmedNote ? { note: trimmedNote } : {}),
    });
  };

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <h2 id={titleId} className="text-sm font-semibold text-foreground">
          {t("panelTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
      </div>
      <form onSubmit={sendIfValid} noValidate className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={creatorFieldId} className="text-xs text-muted-foreground">
            {t("creator")}
          </label>
          <Select
            id={creatorFieldId}
            value={creatorId}
            onChange={(event) => setCreatorId(event.target.value)}
          >
            <option value={NO_CREATOR_PICKED}>{t("pickCreator")}</option>
            {people.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={amountFieldId} className="text-xs text-muted-foreground">
            {t("amount")}
          </label>
          <Input
            id={amountFieldId}
            inputMode="numeric"
            value={enteredAmount}
            onChange={(event) => setEnteredAmount(event.target.value)}
          />
        </div>
        <RadioGroup<OfferPaymentMethod>
          legend={t("payWith")}
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={OFFER_PAYMENT_METHODS.map((method) => ({
            value: method,
            label: t(`method.${method}`),
          }))}
        />
        <div className="space-y-1.5">
          <label htmlFor={noteFieldId} className="text-xs text-muted-foreground">
            {t("note")}
          </label>
          <Textarea
            id={noteFieldId}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {formProblem && <FormBanner>{formProblem}</FormBanner>}
        {sendOffer.isError && <FormBanner>{getErrorMessage(sendOffer.error)}</FormBanner>}
        <Button type="submit" isLoading={sendOffer.isPending}>
          {t("send")}
        </Button>
      </form>
    </section>
  );
};
