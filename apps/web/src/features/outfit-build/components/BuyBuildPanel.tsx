"use client";

import { Button, Checkbox, FormBanner, Select } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { useAuth } from "@/features/auth";

import type { BuildCartResult } from "../api/outfitSchemas";
import type { BuyableBuildItem } from "../board/utils/outfitBoardRules";
import { useBuyFromBuild } from "../hooks/useBuyFromBuild";

type ItemChoice = { sizeLabel: string; isTicked: boolean };

const CART_PATH = "/cart";
const NO_ITEMS = 0;
const NO_SIZE_PICKED = "";

const findBuyableSuggestedSize = ({ sizes, suggestedSizeLabel }: BuyableBuildItem): string =>
  sizes.find(({ label, isInStock }) => isInStock && label === suggestedSizeLabel)?.label ??
  NO_SIZE_PICKED;

const BuyResultSummary = ({
  result,
  productNameById,
}: {
  result: BuildCartResult;
  productNameById: Map<string, string>;
}) => {
  const t = useTranslations("outfitBuild.buy");
  return (
    <div aria-live="polite" className="space-y-2 text-sm">
      <p className="font-medium text-foreground">
        {t("added", { count: result.addedProductIds.length })}{" "}
        {result.addedProductIds.length > NO_ITEMS && (
          <Link href={CART_PATH} className="underline underline-offset-4">
            {t("viewBag")}
          </Link>
        )}
      </p>
      {result.leftOut.length > NO_ITEMS && (
        <div>
          <p className="font-medium text-foreground">{t("leftOutTitle")}</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {result.leftOut.map(({ productId, reason }) => (
              <li key={productId}>
                {productNameById.get(productId) ?? productId} — {t(`reason.${reason}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

type BuyBuildPanelProps = {
  outfitId: string;
  items: BuyableBuildItem[];
};

export const BuyBuildPanel = ({ outfitId, items }: BuyBuildPanelProps) => {
  const t = useTranslations("outfitBuild.buy");
  const titleId = useId();
  const { isAuthenticated, isShopper } = useAuth();
  const buyFromBuild = useBuyFromBuild(outfitId);
  const [pickedChoiceByProductId, setPickedChoiceByProductId] = useState(
    () => new Map<string, Partial<ItemChoice>>(),
  );
  const [hasNothingPicked, setHasNothingPicked] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/builds/${outfitId}`)}`}
        className="inline-block text-sm font-medium text-foreground underline underline-offset-4"
      >
        {t("signInToBuy")}
      </Link>
    );
  }
  if (!isShopper) return null;

  const productNameById = new Map(
    items.map(({ productId, productName }) => [productId, productName]),
  );
  const itemByProductId = new Map(items.map((buildItem) => [buildItem.productId, buildItem]));
  const choiceFor = (productId: string): ItemChoice => {
    const buildItem = itemByProductId.get(productId);
    const pickedChoice = pickedChoiceByProductId.get(productId);
    return {
      sizeLabel:
        pickedChoice?.sizeLabel ??
        (buildItem ? findBuyableSuggestedSize(buildItem) : NO_SIZE_PICKED),
      isTicked: pickedChoice?.isTicked ?? true,
    };
  };

  const updateChoice = (productId: string, change: Partial<ItemChoice>) => {
    setPickedChoiceByProductId((current) =>
      new Map(current).set(productId, { ...current.get(productId), ...change }),
    );
    setHasNothingPicked(false);
  };

  const chosenSizes = (onlyTicked: boolean) =>
    items.flatMap(({ productId }) => {
      const { sizeLabel, isTicked } = choiceFor(productId);
      const isWanted = !onlyTicked || isTicked;
      return isWanted && sizeLabel ? [{ productId, sizeLabel }] : [];
    });

  const buyFullSet = () => buyFromBuild.mutate({ isFullSet: true, sizes: chosenSizes(false) });

  const addPickedItems = () => {
    const pickedSizes = chosenSizes(true);
    if (pickedSizes.length === NO_ITEMS) {
      setHasNothingPicked(true);
      return;
    }
    buyFromBuild.mutate({ isFullSet: false, sizes: pickedSizes });
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

      <ul className="space-y-2">
        {items.map(({ productId, productName, sizes }) => {
          const { sizeLabel, isTicked } = choiceFor(productId);
          return (
            <li key={productId} className="flex flex-wrap items-center gap-3">
              <Checkbox
                className="cursor-pointer"
                checked={isTicked}
                aria-label={t("includeItem", { product: productName })}
                onChange={(event) => updateChoice(productId, { isTicked: event.target.checked })}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{productName}</span>
              <Select
                className="h-9 w-36"
                value={sizeLabel}
                aria-label={t("sizeFor", { product: productName })}
                onChange={(event) => updateChoice(productId, { sizeLabel: event.target.value })}
              >
                <option value={NO_SIZE_PICKED}>{t("pickSize")}</option>
                {sizes.map(({ label, isInStock }) => (
                  <option key={label} value={label} disabled={!isInStock}>
                    {isInStock ? label : t("sizeSoldOut", { size: label })}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>

      {hasNothingPicked && <FormBanner>{t("pickSomething")}</FormBanner>}
      {buyFromBuild.isError && <FormBanner>{t("addFailed")}</FormBanner>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={buyFullSet} isLoading={buyFromBuild.isPending}>
          {t("buyFullSet")}
        </Button>
        <Button variant="outline" onClick={addPickedItems} disabled={buyFromBuild.isPending}>
          {t("addPicked")}
        </Button>
      </div>

      {buyFromBuild.data && (
        <BuyResultSummary result={buyFromBuild.data} productNameById={productNameById} />
      )}
    </section>
  );
};
