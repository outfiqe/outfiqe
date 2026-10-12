import { Button, Input } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { commissionsApi } from "../api/commissionsApi";
import type { CommissionScopeValue } from "../api/commissionsSchemas";
import { commissionQueryKeys } from "../constants/commissionQueryKeys";

const WHOLE_RUPEES = /^\d+$/;

const PriceTestResult = ({ scope, price }: { scope: CommissionScopeValue; price: number }) => {
  const {
    data: priceTest,
    isLoading,
    error,
  } = useQuery({
    queryKey: commissionQueryKeys.priceTest(scope, price),
    queryFn: () => commissionsApi.testTierPrice(scope, price),
  });

  if (isLoading) return <p className="text-muted-foreground">Checking…</p>;
  if (error) return <p className="text-destructive">{getErrorMessage(error)}</p>;
  if (!priceTest) return null;

  const formattedPrice = `Rs. ${priceTest.price.toLocaleString()}`;
  return (
    <p className="text-foreground">
      {priceTest.tierId === null
        ? `${formattedPrice} isn't in any band, so it earns no commission.`
        : `${formattedPrice} earns Rs. ${priceTest.amount.toLocaleString()} commission.`}
    </p>
  );
};

export const TierPriceTestBox = ({ scope }: { scope: CommissionScopeValue }) => {
  const priceInputId = useId();
  const [enteredPrice, setEnteredPrice] = useState("");
  const [testedPrice, setTestedPrice] = useState<number | null>(null);
  const [hasInvalidPrice, setHasInvalidPrice] = useState(false);

  const checkPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrice = enteredPrice.trim();
    const isWholeRupees = WHOLE_RUPEES.test(trimmedPrice);
    setHasInvalidPrice(!isWholeRupees);
    setTestedPrice(isWholeRupees ? Number(trimmedPrice) : null);
  };

  return (
    <form onSubmit={checkPrice} noValidate className="rounded-xl border border-border bg-card p-4">
      <label htmlFor={priceInputId} className="text-sm font-medium text-foreground">
        Test a price
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        See which band a sold item&apos;s price falls in and what commission it earns.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <Input
          id={priceInputId}
          inputMode="numeric"
          placeholder="Item price (Rs.)"
          className="w-40"
          value={enteredPrice}
          aria-invalid={hasInvalidPrice}
          onChange={(event) => setEnteredPrice(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Check
        </Button>
      </div>
      <div aria-live="polite" className="mt-2 text-sm">
        {hasInvalidPrice && <p className="text-destructive">Enter the price in whole rupees.</p>}
        {testedPrice !== null && <PriceTestResult scope={scope} price={testedPrice} />}
      </div>
    </form>
  );
};
