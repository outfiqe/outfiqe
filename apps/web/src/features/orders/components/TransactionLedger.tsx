import { formatDate } from "@outfiqe/utils";

import type { PaymentTransaction } from "../api/orderSchemas";
import { PaymentTransactionType } from "../api/orderSchemas";

type TransactionLedgerProps = {
  transactions: PaymentTransaction[];
};

export const TransactionLedger = ({ transactions }: TransactionLedgerProps) => {
  if (transactions.length === 0) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Transactions
      </p>
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex justify-between text-xs text-muted-foreground">
          <span>
            {transaction.type === PaymentTransactionType.REFUND ? "Refund" : "Payment"} via{" "}
            {transaction.provider}
            {transaction.transactionRef ? ` · ${transaction.transactionRef}` : ""}
          </span>
          <span>
            {transaction.status} · {formatDate(transaction.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
};
