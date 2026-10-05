"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@outfiqe/design-system";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";

import { useAuth } from "@/features/auth";
import { BuildOffersSection } from "@/features/outfit-offers";
import type { PublicProduct } from "@/features/products/api/productSchemas";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useMySizeByProductType } from "@/features/saved-sizes";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useTabSearchParam } from "@/shared/hooks/useTabSearchParam";

import { outfitApi } from "../api/outfitApi";
import type {
  OutfitBoard,
  OutfitProduct,
  OutfitSlot,
  OutfitVisibility,
} from "../api/outfitSchemas";
import { useOutfitWrites } from "../hooks/useOutfitWrites";
import {
  countSoldOutItems,
  findBoardRefusal,
  firstFreePosition,
  toBuyableBuildItems,
  withHappiness,
  withItemPlaced,
  withItemRemoved,
} from "../utils/outfitBoardRules";
import { toOutfitProduct } from "../utils/toOutfitProduct";
import { BoardActions } from "./BoardActions";
import { BoardPeople } from "./BoardPeople";
import { BoardPhotosPanel } from "./BoardPhotosPanel";
import { BoardSettingsModal } from "./BoardSettingsModal";
import { BudgetBar } from "./BudgetBar";
import { BuyBuildPanel } from "./BuyBuildPanel";
import { InviteEditorsModal } from "./InviteEditorsModal";
import { PostAsLookPanel } from "./PostAsLookPanel";
import { ProductFinderPanel } from "./ProductFinderPanel";
import { ProductPickerModal } from "./ProductPickerModal";
import { ReconnectingBanner } from "./ReconnectingBanner";
import { SlotCard } from "./SlotCard";
import { VisibilityModal } from "./VisibilityModal";

const DRAG_ACTIVATION_DISTANCE_PX = 6;
const SWAPPED_POSITION_WHEN_FULL = 0;

type OpenModal = "invite" | "visibility" | "settings" | null;

type PickerTarget = {
  slot: OutfitSlot;
  position: number;
  replacing: ComponentProps<typeof ProductPickerModal>["replacing"];
} | null;

const NO_SOLD_OUT_ITEMS = 0;

const BOARD_TAB = {
  OUTFIT: "outfit",
  PEOPLE: "people",
  PHOTOS: "photos",
  BUY_AND_DROP: "buy-and-drop",
} as const;

const BOARD_TABS_WITHOUT_PHOTOS = [BOARD_TAB.OUTFIT, BOARD_TAB.PEOPLE, BOARD_TAB.BUY_AND_DROP];
const BOARD_TABS_WITH_PHOTOS = [...BOARD_TABS_WITHOUT_PHOTOS, BOARD_TAB.PHOTOS];

const isPublicProduct = (value: unknown): value is PublicProduct =>
  typeof value === "object" && value !== null && "id" in value && "effectivePrice" in value;

export const BuildBoard = ({
  board,
  isReconnecting,
}: {
  board: OutfitBoard;
  isReconnecting: boolean;
}) => {
  const t = useTranslations("outfitBuild.board");
  const tWrites = useTranslations("outfitBuild.writes");
  const { state } = useAuth();
  const currentUserId = state.user?.id;
  const { runWrite, isSaving } = useOutfitWrites(board.id);
  const productTypes = useProductTypes().data ?? [];
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(KeyboardSensor),
  );

  const mySizeByProductType = useMySizeByProductType();
  const isPhotosOn = useFeatureFlag("outfit_photos");
  const isTryOnOn = useFeatureFlag("outfit_try_on");
  const { selectedTab, selectTab } = useTabSearchParam(
    isPhotosOn ? BOARD_TABS_WITH_PHOTOS : BOARD_TABS_WITHOUT_PHOTOS,
    BOARD_TAB.OUTFIT,
  );
  const canEdit = board.myRole !== "VIEWER" && board.status === "DRAFT";
  const soldOutItemCount = board.status === "DRAFT" ? countSoldOutItems(board) : NO_SOLD_OUT_ITEMS;
  const typeIdBySlug = new Map(
    productTypes.map((productType) => [productType.slug, productType.id]),
  );
  const memberIds = board.members.map(({ user }) => user.id);
  const me = board.members.find(({ user }) => user.id === currentUserId)?.user ?? null;

  const placeOutfitProduct = (slot: OutfitSlot, position: number, outfitProduct: OutfitProduct) => {
    if (!currentUserId) return;

    const refusal = findBoardRefusal(board, {
      slotKey: slot.key,
      position,
      productId: outfitProduct.id,
      productTypeId: outfitProduct.productTypeId,
      addedById: currentUserId,
    });
    if (refusal) {
      toast.error(tWrites(`refusals.${refusal}`));
      return;
    }

    void runWrite(
      (write) => outfitApi.placeItem(write, slot.key, position, outfitProduct.id),
      (current) =>
        withItemPlaced(current, {
          slotKey: slot.key,
          position,
          product: outfitProduct,
          addedBy: me,
        }),
    );
  };

  const placeProduct = (slot: OutfitSlot, position: number, product: PublicProduct) => {
    const productTypeId = typeIdBySlug.get(product.type);
    if (productTypeId) placeOutfitProduct(slot, position, toOutfitProduct(product, productTypeId));
  };

  const openPicker = (slot: OutfitSlot, position: number) => {
    const currentProduct = slot.items.find((item) => item.position === position)?.product;
    setPickerTarget({
      slot,
      position,
      replacing: currentProduct
        ? {
            product: currentProduct,
            target: { outfitId: board.id, slotKey: slot.key, position },
          }
        : null,
    });
  };

  const removeItem = (slot: OutfitSlot, position: number) =>
    void runWrite(
      (write) => outfitApi.removeItem(write, slot.key, position),
      (current) => withItemRemoved(current, slot.key, position),
    );

  const dropProductOnSlot = ({ active, over }: DragEndEvent) => {
    const product: unknown = active.data.current?.product;
    const slotKey: unknown = over?.data.current?.slotKey;
    const slot = board.slots.find((candidate) => candidate.key === slotKey);
    if (!slot || !isPublicProduct(product)) return;
    placeProduct(slot, firstFreePosition(slot) ?? SWAPPED_POSITION_WHEN_FULL, product);
  };

  const toggleHappy = (isHappy: boolean) => {
    if (!currentUserId) return;
    void runWrite(
      (write) => outfitApi.setHappy(write, isHappy),
      (current) => withHappiness(current, currentUserId, isHappy),
    );
  };

  const runOwnerAction = (action: "lock" | "unlock" | "archive") =>
    void runWrite((write) => outfitApi.runOwnerAction(write, action));

  const saveVisibility = (visibility: OutfitVisibility, shareWithUserIds: string[] | undefined) =>
    runWrite((write) => outfitApi.setVisibility(write, visibility, shareWithUserIds));

  return (
    <DndContext sensors={sensors} onDragEnd={dropProductOnSlot}>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {board.title ?? t("untitled")}
          </h1>
          <Badge tone={board.status === "LOCKED" ? "positive" : "neutral"} showDot={false}>
            {t(`status.${board.status}`)}
          </Badge>
          <Badge tone="neutral" showDot={false}>
            {t(`visibility.${board.visibility}`)}
          </Badge>
          {board.conversationId && (
            <Link
              href={`/messages/${board.conversationId}`}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t("openChat")}
            </Link>
          )}
        </header>

        <ReconnectingBanner isReconnecting={isReconnecting} />
        {isSaving && (
          <p role="status" className="sr-only">
            {t("saving")}
          </p>
        )}

        <BoardActions
          board={board}
          currentUserId={currentUserId}
          isSaving={isSaving}
          onToggleHappy={toggleHappy}
          onLock={() => runOwnerAction("lock")}
          onUnlock={() => runOwnerAction("unlock")}
          onArchive={() => runOwnerAction("archive")}
          onLeave={() => void runWrite((write) => outfitApi.leave(write))}
          onOpenSettings={() => setOpenModal("settings")}
          onOpenVisibility={() => setOpenModal("visibility")}
        />

        <BudgetBar
          total={board.total}
          budget={board.budget}
          itemCount={board.itemCount}
          isFullyAvailable={board.isFullyAvailable}
        />

        {soldOutItemCount > NO_SOLD_OUT_ITEMS && (
          <p
            role="status"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            {t("soldOutBanner", { count: soldOutItemCount })}
          </p>
        )}

        <Tabs value={selectedTab} onValueChange={selectTab}>
          <TabsList
            aria-label={t("sectionsLabel")}
            className="overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <TabsTrigger value={BOARD_TAB.OUTFIT}>{t("tabs.outfit")}</TabsTrigger>
            <TabsTrigger value={BOARD_TAB.PEOPLE}>
              {t("tabs.people", { count: board.members.length })}
            </TabsTrigger>
            {isPhotosOn && <TabsTrigger value={BOARD_TAB.PHOTOS}>{t("tabs.photos")}</TabsTrigger>}
            <TabsTrigger value={BOARD_TAB.BUY_AND_DROP}>{t("tabs.buyAndDrop")}</TabsTrigger>
          </TabsList>

          <TabsContent value={BOARD_TAB.OUTFIT} className="mt-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
              <div className="grid content-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {board.slots.map((slot) => (
                  <SlotCard
                    key={slot.key}
                    slot={slot}
                    canEdit={canEdit}
                    mySizeByProductType={mySizeByProductType}
                    onAddAt={openPicker}
                    onRemoveAt={removeItem}
                  />
                ))}
              </div>
              {canEdit && (
                <aside className="hidden xl:block">
                  <ProductFinderPanel productTypes={productTypes} />
                </aside>
              )}
            </div>
          </TabsContent>

          <TabsContent value={BOARD_TAB.PEOPLE} className="mt-4 max-w-xl">
            <BoardPeople
              board={board}
              currentUserId={currentUserId}
              onInvite={() => setOpenModal("invite")}
              onRemoveEditor={(userId) =>
                void runWrite((write) => outfitApi.removeEditor(write, userId))
              }
              onHandOver={(userId) =>
                void runWrite((write) => outfitApi.transferOwnership(write, userId))
              }
            />
          </TabsContent>

          {isPhotosOn && (
            <TabsContent value={BOARD_TAB.PHOTOS} className="mt-4 max-w-2xl">
              <BoardPhotosPanel
                board={board}
                currentUserId={currentUserId}
                isTryOnOn={isTryOnOn}
                onAddPhotos={(kind, photos) =>
                  runWrite((write) => outfitApi.addPhotos(write, kind, photos))
                }
                onRemovePhoto={(photoId) =>
                  void runWrite((write) => outfitApi.removePhoto(write, photoId))
                }
                onSetCovers={(photoIds) =>
                  void runWrite((write) => outfitApi.setCovers(write, photoIds))
                }
              />
            </TabsContent>
          )}

          <TabsContent
            value={BOARD_TAB.BUY_AND_DROP}
            className="mt-4 grid items-start gap-4 lg:grid-cols-2"
          >
            {board.status === "LOCKED" && (
              <BuyBuildPanel
                outfitId={board.id}
                items={toBuyableBuildItems(board, mySizeByProductType)}
              />
            )}
            <PostAsLookPanel board={board} />
            <BuildOffersSection
              outfitId={board.id}
              isLocked={board.status === "LOCKED"}
              isMember={board.myRole !== "VIEWER"}
              people={board.members
                .filter(({ canReceiveOffers }) => canReceiveOffers)
                .map(({ user }) => ({ id: user.id, name: user.name }))}
            />
          </TabsContent>
        </Tabs>
      </div>

      {pickerTarget && (
        <ProductPickerModal
          slot={pickerTarget.slot}
          productTypes={productTypes}
          replacing={pickerTarget.replacing}
          onClose={() => setPickerTarget(null)}
          onPick={(product) => {
            placeProduct(pickerTarget.slot, pickerTarget.position, product);
            setPickerTarget(null);
          }}
          onPickReplacement={(product) => {
            placeOutfitProduct(pickerTarget.slot, pickerTarget.position, product);
            setPickerTarget(null);
          }}
        />
      )}
      {openModal === "invite" && (
        <InviteEditorsModal
          memberIds={memberIds}
          openSeats={board.limits.maxEditorsPerBoard - board.members.length}
          isSaving={isSaving}
          onInvite={(userIds) => runWrite((write) => outfitApi.addEditors(write, userIds))}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "visibility" && (
        <VisibilityModal
          currentVisibility={board.visibility}
          memberIds={memberIds}
          hasBeenLocked={board.lastLockedVersion !== null}
          isSaving={isSaving}
          onSave={saveVisibility}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === "settings" && (
        <BoardSettingsModal
          settings={{
            title: board.title,
            budget: board.budget,
            maxItemsPerMember: board.maxItemsPerMember,
          }}
          isSaving={isSaving}
          onSave={(changes) => runWrite((write) => outfitApi.updateSettings(write, changes))}
          onClose={() => setOpenModal(null)}
        />
      )}
    </DndContext>
  );
};
