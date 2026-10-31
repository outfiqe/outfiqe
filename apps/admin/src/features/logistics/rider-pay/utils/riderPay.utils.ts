export const formatPayAmount = (amount: number) => `Rs. ${amount.toLocaleString()}`;

export const formatPayDate = (isoDate: string) => formatDateTime(isoDate);
import { formatDateTime } from "@outfiqe/utils";
