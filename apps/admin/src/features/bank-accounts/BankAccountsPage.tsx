import { BankAccountsListSection } from "./BankAccountsListSection";

export const BankAccountsPage = () => (
  <div>
    <h1 className="font-display text-2xl font-bold text-foreground">Bank accounts</h1>
    <p className="mt-1.5 text-sm text-muted-foreground">
      Verify a creator or business bank account before they can withdraw to it. Reveal the account
      number and QR code to check against what they submitted, then verify.
    </p>
    <div className="mt-6">
      <BankAccountsListSection />
    </div>
  </div>
);
