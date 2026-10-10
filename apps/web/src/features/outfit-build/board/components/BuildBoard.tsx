"use client";

import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { BuildOffersSection } from "@/features/outfit-offers";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useMySizeByProductType } from "@/features/saved-sizes";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useTabSearchParam } from "@/shared/hooks/useTabSearchParam";

import { outfitApi } from "../../api/outfitApi";
import type { OutfitBoard, OutfitVisibility } from "../../api/outfitSchemas";
import { BuyBuildPanel } from "../../components/BuyBuildPanel";
import { PostAsLookPanel } from "../../publishing/components/PostAsLookPanel";
import {
  BOARD_TAB,
  BOARD_TABS_WITH_PHOTOS,
  BOARD_TABS_WITHOUT_PHOTOS,
} from "../constants/boardTabs";
import { useBoardItemPlacement } from "../hooks/useBoardItemPlacement";
import { useOutfitWrites } from "../hooks/useOutfitWrites";
import { countSoldOutItems, toBuyableBuildItems, withHappiness } from "../utils/outfitBoardRules";
import { BoardActions } from "./BoardActions";
import { BoardHeader } from "./BoardHeader";
import { BoardPeople } from "./BoardPeople";
import { BoardPhotosPanel } from "./BoardPhotosPanel";
import { BoardSettingsModal } from "./BoardSettingsModal";
import { BudgetBar } from "./BudgetBar";
import { InviteEditorsModal } from "./InviteEditorsModal";
import { ProductFinderPanel } from "./ProductFinderPanel";
import { ProductPickerModal } from "./ProductPickerModal";
import { ReconnectingBanner } from "./ReconnectingBanner";
import { SlotCard } from "./SlotCard";
import { VisibilityModal } from "./VisibilityModal";

const DRAG_ACTIVATION_DISTANCE_PX = 6;

type OpenModal = "invite" | "visibility" | "settings" | null;

const NO_SOLD_OUT_ITEMS = 0;

export const BuildBoard = ({
  board,
  isReconnecting,
}: {
  board: OutfitBoard;
  isReconnecting: boolean;
}) => {
  const t = useTranslations("outfitBuild.board");
  const { state } = useAuth();
  const currentUserId = state.user?.id;
  const { runWrite, isSaving } = useOutfitWrites(board.id);
  const productTypes = useProductTypes().data ?? [];
  const {
    pickerTarget,
    setPickerTarget,
    placeOutfitProduct,
    placeProduct,
    openPicker,
    removeItem,
    dropProductOnSlot,
  } = useBoardItemPlacement({ board, currentUserId, productTypes, runWrite });
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
  const memberIds = board.members.map(({ user }) => user.id);

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
        <BoardHeader board={board} />

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
