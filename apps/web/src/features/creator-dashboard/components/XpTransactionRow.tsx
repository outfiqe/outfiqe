import { XpActivityType, type XpTransaction } from "../api/xpSchemas";

const ACTIVITY_LABEL: Record<XpTransaction["activityType"], string> = {
  [XpActivityType.LOOK_CREATED]: "Posted a look",
  [XpActivityType.LOOK_LIKE_RECEIVED]: "Received a like",
  [XpActivityType.LOOK_COMMENT_RECEIVED]: "Received a comment",
  [XpActivityType.LOOK_COMMENTED]: "Commented on a post",
  [XpActivityType.LOOK_SAVED]: "Saved a post",
  [XpActivityType.USER_FOLLOWED]: "Followed a creator",
  [XpActivityType.PRODUCT_PURCHASED]: "Purchased a product",
  [XpActivityType.SALE_GENERATED]: "Generated a sale",
  [XpActivityType.PRODUCT_TAGGED]: "Tagged a product",
  [XpActivityType.FOLLOWER_MILESTONE]: "Reached a follower milestone",
  [XpActivityType.ACHIEVEMENT_UNLOCKED]: "Unlocked an achievement",
  [XpActivityType.ADMIN_ADJUSTMENT]: "Adjusted by an admin",
};

type XpTransactionRowProps = {
  transaction: XpTransaction;
};

export const XpTransactionRow = ({ transaction }: XpTransactionRowProps) => {
  const { activityType, amount, createdAt } = transaction;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border p-4">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{ACTIVITY_LABEL[activityType]}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <p className="shrink-0 font-display text-sm font-bold text-primary-strong">+{amount} XP</p>
    </div>
  );
};
