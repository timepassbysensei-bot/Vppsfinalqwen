import { LegalPage } from "./LegalPage";

export default function Terms() {
  return (
    <LegalPage
      pageKey="terms"
      title="Terms & Conditions"
      fallback={`Last updated: ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}

These Terms & Conditions govern the use of this website and the academy's services.

1. Website use
The content on this website is for general information about courses, admissions and academy operations. It may change without notice. Do not misuse the website, attempt unauthorized access, or submit false information through forms.

2. Admissions
Admission is confirmed only after completing the academy's admission formalities and fee payment. Submission of an inquiry form does not guarantee admission or seat reservation.

3. Student conduct
Students are expected to maintain discipline consistent with a defence-preparation academy. The academy may suspend dashboard access for misconduct.

4. Intellectual property
Website text, design and materials belong to the academy or its licensors and may not be reproduced without permission.

5. Liability
The academy is not liable for indirect losses arising from use of this website. Examination-related information (eligibility, dates, patterns) should be verified from official notifications of the respective examination authorities.

6. Governing law
These terms are governed by the laws of India.

(Note: This is a template provided for convenience. The academy should review it with legal counsel and amend it as needed.)`}
    />
  );
}
