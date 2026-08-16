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
      {transactions.map(({ id, provider, type, status, transactionRef, createdAt }) => (
        <div key={id} className="flex justify-between text-xs text-muted-foreground">
          <span>
            {type === PaymentTransactionType.REFUND ? "Refund" : "Payment"} via {provider}
            {transactionRef ? ` · ${transactionRef}` : ""}
          </span>
          <span>
            {status} · {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
};
