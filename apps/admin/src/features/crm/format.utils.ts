export const formatRupees = (amount: number): string => `Rs. ${amount.toLocaleString()}`;

export const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString() : "—";

export const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();
