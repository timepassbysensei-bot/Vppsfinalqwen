import { LegalPage } from "./LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      pageKey="privacy"
      title="Privacy Policy"
      fallback={`Last updated: ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}

This Privacy Policy explains how Bokaro Defence Academy ("we", "us") handles information when you use this website or interact with us.

1. Information we collect
• Contact details you submit through inquiry or contact forms (name, phone, WhatsApp, email, city, course interest, message).
• Account information for students, teachers and administrators (name, email, phone, profile photograph where provided).
• Academic records that the academy maintains for enrolled students (attendance, test marks, assignments and submissions).
• Basic technical information such as browser type, for security and performance purposes.

2. How we use information
• To respond to inquiries and process admissions.
• To operate the student and teacher dashboards (attendance, results, assignments, messaging).
• To publish results or photographs only with recorded consent.
• To improve the website and maintain security.

3. What we do not do
• We do not sell your personal information.
• We do not send private student data to third-party AI services.
• We do not publish a student's results, name or photograph without recorded consent.

4. Data storage and security
Data is stored on Supabase (PostgreSQL) with Row Level Security so that students can only access their own records. Administrative access is limited to authorized staff. Files are stored in Supabase Storage with access-controlled buckets.

5. Retention
Academic records are retained while a student is enrolled and archived (soft-deleted) rather than permanently destroyed when possible. You may request correction or deletion of your contact information by contacting the office.

6. Contact
Questions about this policy can be sent to the academy's email address listed on the Contact page.

(Note: This is a template policy provided for convenience. The academy should review it with legal counsel and replace or amend it as needed before relying on it.)`}
    />
  );
}
