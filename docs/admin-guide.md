# Admin Guide — Bokaro Defence Academy

A plain-English guide for academy staff. **No coding is required.** Everything
described here happens inside the dashboard at `/admin`.

> Sign in at `/login` with the email and password the academy created for you.
> If you forget your password, use **Forgot password** on the login page — the
> reset link comes to your email.

---

## 1. The dashboard at a glance

The left menu (☰ on a phone) is grouped into six sections:

| Section | What it is for |
|---|---|
| **Overview** | Today's numbers, new inquiries, recent activity, audit logs |
| **Academics** | Courses, batches, academic sessions, subjects, teachers, students |
| **Learning** | Assignments, resources, tests & marks, attendance |
| **Communication** | Inquiries, messages, notices |
| **Website** | Achievements, testimonials, gallery, media library, faculty, FAQs, website content, site settings |
| **Administration** | User roles (who can sign in and what they can do) |

Two habits that will save you time:

1. **Draft first, publish second.** Courses, notices, assignments, faculty and
   achievements all start as drafts. Nothing appears on the website until you publish it.
2. **Archive, never delete,** academic records. Archiving keeps marks, attendance
   and history intact. Delete is only for mistakes you just made (e.g. an
   accidental notice).

---

## 2. Setting up the academy the first time

Do these in order — each step depends on the one before.

1. **Site Settings** — the academy's real name, address, phone, WhatsApp, email,
   office hours, hero image and opening text. Replace every value that says SAMPLE.
2. **Academic Sessions** — create the running year, e.g. `2026-27`, and tick *This is the running session*.
3. **Courses** — one entry per course you actually offer. Fill in eligibility,
   duration, subjects, batch timings and the fee line you want displayed
   (e.g. `Contact for fee`). Then set the status to **Published**.
4. **Batches** — under each course, create the batches you run (e.g. *Morning A*),
   with timings and capacity.
5. **Subjects** — the subjects you teach, so tests and marks sheets can use them.
6. **Teachers** — add each faculty member, then press **Invite** so they get their own login.
7. **Students** — add students one at a time, or use **Import CSV**; then press **Invite**.
8. **Enrollment** — open a batch's *Students* view (or a student's profile) to put a student into a batch. Students only see work for the batches they are in.

---

## 3. Day-to-day tasks

### Record attendance (teacher or admin)
**Attendance** → choose the batch → choose the date → tap *Present / Absent / Late / Excused*
for each student → **Save**. Saving the same date again updates that day instead of
creating a duplicate. Buttons at the top mark everyone present or absent in one tap.

### Publish an assignment (teacher or admin)
**Assignments** → **New Assignment** → choose batch, due date and instructions →
attach a file if you want → set status to **Published** → Save.
When students submit, open **Submissions** to read their work and write feedback.
Feedback is visible to that student only.

### Enter and publish test marks (teacher or admin)
**Tests & Marks** → **New Test** → choose batch, date, subjects and maximum marks →
Create → **Enter marks**.
- On a laptop you get a spreadsheet-style grid; on a phone, one student at a time with **Next / Prev**.
- **Save Draft** keeps work private. Students see nothing yet.
- **Review & Publish** shows you how many entries are still missing before you commit.
- A blank mark stays *missing* (shown as "Incomplete"), it is **never** treated as zero.
- Marking a student absent clears their numeric marks on purpose.

Only a Super Admin (or a teacher granted *Allow publish*) can publish results.
Once published, changing them is an admin-only action and is written to the audit log.

### Share study material (teacher or admin)
**Resources** → **Share Resource** → choose the course (and batch, for precision) →
upload the file or paste a link → **Published** → Save.
Students see it under **My Resources**. Files are stored privately — only enrolled
students and staff can open them.

### Answer admission inquiries (admin)
**Inquiries** → open a lead to see their details, set the **Status**
(New → Contacted → Interested → Follow-up → Admitted / Closed), pick a
**Follow-up date**, and keep private notes. **Call** and **WhatsApp** buttons dial
straight from the row. **Export CSV** downloads the current filtered list.
Private notes are never shown to the public.

### Publish a notice (admin)
**Notices** → **New Notice** → write the title and description → choose the
**Audience**:
- *Public website* — appears on `/notices`
- *All students* / *Specific course* / *Specific batch* — appears only in those students' dashboards
- *Teachers* / *Admins* — internal only

Set an **Expiry date** if it should hide itself automatically, tick **Pin** to keep
it on top, then **Publish**.

### Reply to a student (admin or teacher)
**Messages** → pick a thread → type your reply → **Send**. **Close thread** when
the matter is settled; you can reopen it later.

### Update website copy (admin)
- **Site Settings** — name, logo, contact details, hero text, about content, SEO, and which features are switched on.
- **Website Content** — Facilities, Why-choose-us, the admissions process and the three legal pages.

Changes appear on the public website as soon as you save.

---

## 4. Handling achievements and testimonials carefully

These are the two places where publishing something wrong can genuinely hurt a
student or the academy, so the system enforces rules:

**Achievements** (results / selections)
- You need the student's (or guardian's) **written consent** before publishing.
- Tick the consent box in the form — until then, the *Published* option is disabled.
- Without recorded consent the public page shows no photograph and shortens the
  name to "First name L.".
- Never estimate, round up or "improve" a rank.

**Testimonials**
- They appear on the website **only after you press Approve**.
- Ask the student or parent for permission first, and use their own words.
- Unpublish at any time with **Unapprove**.

---

## 5. Managing who can sign in (Super Admin)

**User Roles** lists every account with its roles.

- **Invite User** — sends a secure email so the person sets their own password.
  An Admin may invite *students*; staff roles need a Super Admin.
- **Grant role** — add an extra role (roles combine — a teacher can also be an admin).
- Click a role badge to **revoke** it. The system refuses to remove the last Super Admin.
- **Deactivate** blocks sign-in immediately but keeps all their records. Prefer this
  over deleting.

---

## 6. Housekeeping

- **Media Library** — every uploaded image with its alt text. If an image is still
  used somewhere, archive it instead of deleting; the library warns you.
- **Audit Logs** — a read-only record of sensitive changes (editing a published
  test, role changes). Nothing can be edited or deleted here.
- **Students → Archive** — removes a student from active lists but preserves marks,
  attendance and enrollment history.

---

## 7. Common questions

**A student says they cannot see anything.**
Their login is probably not linked to a student record. Open **Students**, find
their row and press **Invite** again, or ask a Super Admin to check User Roles.

**I made a typo in a published test.**
Only an admin can edit a published test, and the change is logged. Fix it under
**Tests & Marks → the test → Enter marks**, then republish.

**Can I delete a course we no longer run?**
Archive it. Students' past marks and attendance stay intact.

**The chatbot keeps saying "contact the office".**
It only answers from **published** FAQs and **published** courses. Add the
questions you get asked most under **FAQs & Chatbot** — the *Questions the
assistant couldn't answer* box shows you exactly what to add next.

**Should I put fees on the website?**
Only if the academy has agreed to publish them. Otherwise set the fee line to
`Contact for fee` on each course.
