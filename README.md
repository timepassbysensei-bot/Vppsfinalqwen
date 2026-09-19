# Bokaro Defence Academy — Website & Academy Management System

A complete, production-ready web application for a defence-exam coaching academy:
a public marketing website **plus** the back-office that runs the academy
(courses, batches, students, teachers, attendance, tests, marks, resources,
inquiries, notices, gallery, website copy and roles).

Built with React + TypeScript + Vite + Tailwind on the front end, and Supabase
(PostgreSQL + Auth + Storage + Row Level Security + Edge Functions) as the
backend. Deploys to Netlify.

---

## ⚠️ Read this first: about sample data

**No real academy information was invented.** Address, phone numbers, fees,
faculty, courses, achievements, testimonials and social links in the seed data
are **clearly labelled samples** (they contain words like `SAMPLE`).

- Seeded courses/notices/faculty are marked as samples so nothing is published as a real claim.
- Seeded **achievements stay in `draft`** and can never be published without recorded consent.
- Seeded **testimonials are unapproved** and do not appear on the site.
- Seeded **social links are disabled** and have placeholder URLs.
- The Academy's real details must be entered by staff in the admin dashboard.

Every one of those fields is editable from the dashboard — no code changes needed.

---

## 1. What's included

### Public website
| Page | Purpose |
|---|---|
| `/` | Landing page: hero, featured courses, why-choose-us, achievements, notices, testimonials, CTA |
| `/about` | Overview, history, mission, vision, teaching approach, director's message, faculty, facilities |
| `/courses`, `/courses/:slug` | Course catalogue and course detail with eligibility, batches, fee display, apply CTA |
| `/admissions` | Admission process, documents required, inquiry form |
| `/results` | Published achievements (consent-aware: names shortened and photos hidden without consent) |
| `/gallery` | Photo albums |
| `/notices` | Published notices |
| `/resources` | Public resources: syllabus, sample papers, study tips |
| `/contact` | Contact details, map link, inquiry form |
| `/privacy-policy`, `/terms`, `/refund-policy` | Editable legal pages |
| Floating | Call button, WhatsApp button and an AI assistant (all toggleable) |

### Dashboards
- **Admin** (`/admin`) — 22 screens: dashboard, courses, batches, sessions, subjects, teachers, students (+ profile), assignments, resources, tests & marks, attendance, inquiries CRM, messages, notices, achievements, testimonials, gallery, media library, faculty, FAQs & chatbot, website content, site settings, user roles, audit logs.
- **Teacher** (`/teacher`) — dashboard, assignments + submission review, resources, tests + marks entry, attendance.
- **Student** (`/student`) — dashboard, assignments + submission, resources, results, attendance, messages, profile.

### Cross-cutting
- Mobile-first layouts: bottom tab bars for student/teacher, drawer navigation for admin, card views instead of wide tables on small screens.
- Loading, empty, error and success states everywhere; confirmation dialogs for destructive actions.
- Soft deletion (`archived_at`) for academic records; CSV import/export for students and marks.
- Accessible: labelled form fields, keyboard-navigable dialogs (`Escape` to close), `aria-live` regions, visible focus rings, 44px minimum touch targets, `prefers-reduced-motion` honoured.
- Typed database interfaces, shared Zod validation schemas, and 37 unit tests.

---

## 2. Technology

**Front end:** React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6,
React Hook Form + Zod (resolvers), TanStack Query 5, Lucide icons, Sonner toasts.

**Backend:** Supabase PostgreSQL, Supabase Auth (email/password), Storage,
Row Level Security, Edge Functions (Deno).

**AI:** Google Gemini free tier, called only from a Supabase Edge Function.

**Hosting:** Netlify (static build in `dist/`).

**Tests:** Vitest + Testing Library (jsdom).

No paid service is required beyond the free tiers.

---

## 3. Quick start (local development)

### Prerequisites
- [Node.js 20+](https://nodejs.org) (or [Bun](https://bun.sh))
- A free [Supabase](https://supabase.com) account
- A free [Google AI Studio](https://aistudio.google.com/app/apikey) key (only needed for the chatbot)

### Steps

```bash
# 1. Install dependencies
bun install          # or: npm install

# 2. Create your environment file
cp env.example .env.local
#    then edit .env.local and paste the two values from
#    Supabase → Project Settings → API

# 3. Start the dev server (http://localhost:5173)
bun run dev
```

Environment variables (`.env.local`):

| Variable | Where to find it | Safe in the browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ yes (public) |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key | ✅ yes (public, protected by RLS) |
| `VITE_SITE_URL` | Your deployed URL (used for the sitemap) | ✅ yes |

> **Never** put the `service_role` key or the Gemini key in a `VITE_` variable —
> anything prefixed with `VITE_` is bundled into the browser JavaScript.

---

## 4. Connect Supabase (10 minutes)

### 4.1 Create the project
1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a region close to your users (e.g. Mumbai / Singapore for India).
3. Save the database password somewhere safe.

### 4.2 Create the database structure
Install the Supabase CLI, then run the migrations in `supabase/migrations/`:

```bash
# Option A — hosted project (recommended)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option B — completely local stack
supabase start
supabase db reset      # applies migrations + sample seed data
```

The migrations create every table, enum, index, helper function, trigger,
RLS policy and storage bucket. They are numbered `00001`–`00010` and run in order.

### 4.3 Create the first Super Admin (bootstrap)
Supabase does not allow creating users from SQL in the dashboard, so do this once:

1. **Supabase → Authentication → Users → Add user** → enter the director's email and a password. Tick *Auto Confirm User*.
2. **SQL Editor** → run the two statements below, replacing the email:

```sql
-- Give your own account the Super Admin role.
insert into user_roles (user_id, role)
select id, 'super_admin' from auth.users
where lower(email) = lower('director@example.com')
on conflict (user_id, role) do nothing;

-- Make sure a profile row exists (used for the name shown in the dashboard).
insert into profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'name', 'Academy Director'), email
from auth.users where lower(email) = lower('director@example.com')
on conflict (id) do nothing;
```

3. Sign in at `/login`. You now see **Admin → User Roles** and can invite everyone else by email.

> If you used **Option B (local)**, the same statements work in the local SQL editor.

### 4.4 Storage
The migration `00009_storage_buckets.sql` already creates all buckets and their
policies: public buckets for website imagery, private buckets for student files.
Nothing else to configure.

### 4.5 Optional: email confirmation
In production, turn on **Authentication → Providers → Email → Confirm email**.
Until SMTP is configured, Supabase's built-in email service works but is rate-limited
(use **Authentication → Settings → SMTP** with any free provider for real volume).

### 4.6 The AI assistant (optional but recommended)
The chatbot answers **only** from your published FAQs, published courses and the
contact details in Site Settings — it never invents fees or results.

```bash
supabase secrets set GEMINI_API_KEY="your-google-ai-studio-key"
supabase secrets set GEMINI_MODEL="gemini-2.0-flash"
supabase secrets set ALLOWED_SITE_URL="https://your-site.netlify.app"
supabase secrets set SITE_URL="https://your-site.netlify.app"

supabase functions deploy academy-chatbot --no-verify-jwt   # used by signed-out visitors
supabase functions deploy invite-user                        # admin invitations
```

If the key is missing the widget still loads and politely tells visitors to call the office.

Add FAQs in **Admin → FAQs & Chatbot**. Questions the assistant could not answer
are collected there so staff can answer them, which steadily improves the bot.

---

## 5. Deploy to Netlify

### 5.1 Prepare
1. Put this project in a Git repository (GitHub/GitLab/Bitbucket).
2. Make sure `.env.local` is **not** committed (it is already in `.gitignore`).

`netlify.toml` is already configured:
- Build command: `bun run build` (same as `node ./scripts/build.mjs`)
- Publish directory: `dist`
- SPA redirect so deep links like `/courses/nda-foundation` work on refresh
- Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, …)

### 5.2 Deploy
1. Netlify → **Add new site → Import an existing project** → pick the repository.
2. Build settings are read from `netlify.toml`; confirm them.
3. **Site configuration → Environment variables** → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` = `https://your-site.netlify.app` (used to generate `sitemap.xml`)
4. Deploy.

### 5.3 After the first deploy
1. In Supabase → **Authentication → URL Configuration**, set the **Site URL** to your
   Netlify URL and add it to **Redirect URLs**. Password-reset and invitation emails
   only work when this matches.
2. Re-run `supabase secrets set ALLOWED_SITE_URL="https://your-site.netlify.app"` so the
   chat function allows your real domain, then redeploy the function.
3. Visit the site, then **Admin → Site Settings** and replace every SAMPLE value.

### 5.4 Free-tier notes
- **Supabase free tier:** 500 MB database, 1 GB storage, 5 GB egress/month. A single
  academy is far below this. Projects pause after ~1 week of inactivity — open the
  dashboard occasionally or upgrade if that matters.
- **Netlify free tier:** 100 GB bandwidth/month, plenty for a coaching academy site.
- **Gemini free tier:** rate-limited per minute/day. The chat function limits
  visitors to 10 messages per 5 minutes per IP, and failures degrade gracefully.
- **Housekeeping:** the Media Library archive view helps you keep storage tidy, and
  the media library warns before deleting an image that is still in use.

---

## 6. First-run checklist for academy staff

Work through this once, top to bottom (all in the admin dashboard):

- [ ] **Site Settings → Identity**: real academy name, tagline, logo, favicon
- [ ] **Site Settings → Contact**: real address, phone, WhatsApp, email, office hours, map link
- [ ] **Site Settings → Home page**: hero heading/description/image, button labels, announcement bar
- [ ] **Site Settings → About content**: overview, history, mission, vision, director's message
- [ ] **Site Settings → SEO**: title, meta description, share image
- [ ] **Site Settings → Features**: turn off anything you do not use
- [ ] **Site Settings → Social links**: add only real profiles
- [ ] **Academic Sessions**: create the running session (e.g. 2026-27)
- [ ] **Courses**: create your real courses; publish them
- [ ] **Batches**: create batches under each course, set timings and capacity
- [ ] **Subjects**: add the subjects you teach
- [ ] **Teachers**: add faculty, then **Invite** each one to get a login
- [ ] **Students**: add or CSV-import students, then **Invite** them
- [ ] **Website Content**: write the Facilities, Why-choose-us, Admissions process and legal pages
- [ ] **Gallery / Media Library**: upload photos you have permission to publish
- [ ] **FAQs & Chatbot**: add the questions you are asked most
- [ ] **Achievements**: only add verified results, with consent recorded
- [ ] **Testimonials**: only add quotes you have permission to publish
- [ ] Publish the **Notices** you want the public to see

---

## 7. Roles and permissions

| Role | Can do |
|---|---|
| **Student** | See their own batches, assignments (and submit), resources, published results, own attendance, own messages, own profile |
| **Teacher** | Everything for their **assigned batches**: attendance, assignments + grading, resources, tests + marks. Publishing results needs the *Allow publish* permission set by an admin |
| **Admin** | Everything above for every batch, plus courses, batches, students, fees display, notices, website content, gallery, inquiries, achievements, testimonials, FAQs, settings, and inviting students |
| **Super Admin** | Everything, plus granting/revoking roles and inviting staff accounts |

**How this is enforced:** Row Level Security in PostgreSQL, not the UI. Even if
someone edits the JavaScript in their browser, they cannot read or write another
student's marks, another teacher's batches, or any protected row. Role changes run
through `SECURITY DEFINER` database functions that re-check the caller's role.
The browser can never write to `user_roles` directly.

---

## 8. Security practices used

- RLS **enabled on every table**, deny-by-default, with explicit per-table policies.
- Role checks are `SECURITY DEFINER` SQL functions with a pinned `search_path`.
- Service-role and Gemini keys live **only** on the server (Edge Function secrets).
- Public inquiry inserts are sanitised by a trigger (status forced to `new`, internal fields cleared).
- Published tests cannot be edited without admin rights, and every change is written to `audit_logs`.
- Soft deletion (`archived_at`) protects academic history.
- Private files are served through short-lived signed URLs; storage policies scope
  each folder to the owning student, teacher batch or staff member.
- Achievements/testimonials refuse to publish until consent/approval is recorded.
- Content Security Policy, `X-Frame-Options: DENY`, `nosniff` and a strict referrer policy via `netlify.toml`.
- Passwords are set by the user through emailed links — the academy never sees them.

---

## 9. Commands

```bash
bun run dev          # dev server
bun run build        # production build → dist/ (+ sitemap)
bun run preview      # serve the built site
bun run typecheck    # tsc -b --noEmit
bun run test         # unit tests (37 tests)
bun run verify       # typecheck + tests
bun run lint         # eslint

# regenerate typed database interfaces once your project is linked
bun run supabase:types
```

---

## 10. Project structure

```
src/
├── components/
│   ├── layouts/PublicLayout.tsx     # header, footer, floating actions
│   ├── site/                        # Seo, InquiryForm, ChatbotWidget, SupabaseNotice
│   └── ui/                          # Button, Input, Modal, ConfirmDialog, Badge, …
├── hooks/
│   ├── useAuth.tsx                  # session + server-derived roles
│   ├── useSiteSettings.ts           # editable site content
│   └── useTeacherScope.ts           # a teacher's assigned batches
├── lib/
│   ├── supabase.ts                  # typed client
│   ├── storage.ts                   # upload + signed-URL helpers
│   ├── validation.ts                # shared Zod schemas
│   ├── marks.ts                     # marks maths (unit tested)
│   └── format.ts                    # dates, CSV, phone/WhatsApp links
├── pages/
│   ├── public/                      # marketing site + auth
│   ├── admin/                       # 22 admin screens
│   ├── teacher/                     # faculty dashboard
│   └── student/                     # student dashboard
└── types/database.ts                # typed tables, enums and RPCs

supabase/
├── migrations/                      # 00001–00010, run in order
├── functions/academy-chatbot/       # Gemini-backed assistant (grounded, rate-limited)
├── functions/invite-user/           # admin-only account invitations
└── seed.sql                         # clearly-labelled SAMPLE data

docs/
├── reference-site-analysis.md       # competitor IA review (no content copied)
├── admin-guide.md                   # plain-English guide for academy staff
└── database.md                      # schema, RLS and data-flow reference

tests/                               # Vitest unit tests
scripts/build.mjs                    # production build entry point (PATH-independent)
scripts/link-build-bin.mjs           # install-time shim so `bunx build` also works
scripts/generate-sitemap.mjs         # post-build sitemap + robots
netlify.toml                         # build, redirects, security headers
```

---

## 11. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| A yellow "Setup needed" banner | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing. Add them and restart the dev server. |
| Everything is empty after signing in | No data yet, or RLS is correctly hiding other people's rows. Create courses → batches → enroll students. |
| "Only a Super Admin can invite staff accounts" | Working as designed. Students can be invited by an Admin; staff roles need a Super Admin. |
| Achievements won't publish | Record the student's consent first (the form blocks publishing without it). |
| Chatbot says it is not configured | Set the `GEMINI_API_KEY` secret and redeploy `academy-chatbot`. |
| Chatbot says contact the office for everything | Add more FAQs and publish your courses — the assistant only answers from that content. |
| Password reset / invite email never arrives | Supabase → Authentication → URL Configuration must include your Netlify URL; configure SMTP for reliable delivery. |
| Deep links 404 on another host | Ensure the SPA redirect is active (`netlify.toml` or `public/_redirects`). |
| Type errors after switching projects | Run `bun run supabase:types` to regenerate typed interfaces. |
| Deploy fails: `could not determine executable to run for package build` and/or `vite: command not found` | The build step is being launched as a bare script name (e.g. `bunx build`) instead of through the package manager, so the runner never looks in `node_modules/.bin`. `scripts/build.mjs` plus the install-time `node_modules/.bin/build` shim make that invocation work. The clean fix is to set the host's build command to `bun run build` and its publish directory to `dist`. |
| Deploy fails: `Vite is not installed` | The host's install step skipped devDependencies. Vite, Tailwind, PostCSS and the React plugin are build-time tools, so install with plain `bun install` / `npm install` (no `--production` / `--omit=dev`). |

---

## 12. Reference-site analysis

`docs/reference-site-analysis.md` documents the information-architecture review of
two comparable Indian coaching websites. It records which sections and patterns
were worth adapting, the mobile-usability problems to avoid, and confirms that no
source code, text, branding, imagery, testimonials or results were copied.

---

## 13. License / ownership

Built for Bokaro Defence Academy. Replace all SAMPLE content with the academy's
own verified information before publishing the site publicly.
