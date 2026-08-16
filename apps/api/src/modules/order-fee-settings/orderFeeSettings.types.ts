export type OrderFeeValues = {
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  codHandlingFee: number;
};

export type OrderFeeSettingsRecord = OrderFeeValues & {
  id: string;
  updatedAt: Date;
};

export type OrderFeeSettingsView = OrderFeeValues & {
  updatedAt: string;
};

export type OrderFeeSettingsHistoryView = {
  id: string;
  changedByName: string;
  oldValues: OrderFeeValues;
  newValues: OrderFeeValues;
  createdAt: string;
};
