import { LegalPage } from "./LegalPage";

export default function RefundPolicy() {
  return (
    <LegalPage
      pageKey="refund"
      title="Refund & Cancellation Policy"
      fallback={`Last updated: ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}

This policy describes how fee-related refunds and batch changes are handled.

1. Fee payments
Fees are payable at the time of admission as per the course and batch selected. The fee structure is shared during counselling and confirmed in writing at admission.

2. Cancellation before batch start
If a student cancels before their batch starts, the academy will refund the fee after deducting any registration/administrative charge, as communicated at admission.

3. Cancellation after batch start
Once classes have commenced, fees are generally non-refundable because seats and materials are reserved. Batch transfers may be permitted at the academy's discretion.

4. Academy-initiated cancellation
If the academy cancels a batch, affected students will receive a full refund of fees paid for that batch or a transfer to another batch.

5. How to request
Refund or transfer requests should be submitted in writing at the office or via the academy's contact email/phone.

6. Disputes
Any dispute is subject to the jurisdiction of local courts.

(Note: This is a template provided for convenience. The academy should set its actual fee-refund rules and review this policy with legal counsel before relying on it.)`}
    />
  );
}
