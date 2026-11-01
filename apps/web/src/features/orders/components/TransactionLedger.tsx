import type {
  PaymentMethodValue,
  PaymentStatusValue,
  PaymentTransaction,
} from "../api/orderSchemas";
import { PaymentMethod, PaymentStatus, PaymentTransactionType } from "../api/orderSchemas";

type TransactionLedgerProps = {
  transactions: PaymentTransaction[];
  paymentMethod: PaymentMethodValue;
  paymentStatus: PaymentStatusValue;
};

const PAY_ON_DELIVERY_LABEL = "Pay on delivery";

export const TransactionLedger = ({
  transactions,
  paymentMethod,
  paymentStatus,
}: TransactionLedgerProps) => {
  if (transactions.length === 0) return null;

  const statusLabelFor = (transaction: PaymentTransaction): string => {
    const isUncollectedCashOnDelivery =
      transaction.type === PaymentTransactionType.PAYMENT &&
      paymentMethod === PaymentMethod.COD &&
      paymentStatus !== PaymentStatus.PAID;
    return isUncollectedCashOnDelivery ? PAY_ON_DELIVERY_LABEL : transaction.status;
  };

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
            {statusLabelFor(transaction)} · {new Date(transaction.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
};
