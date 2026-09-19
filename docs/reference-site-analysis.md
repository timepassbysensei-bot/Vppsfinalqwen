# Reference Site Analysis

> Analysis date: September 2026. Both sites were fetched and reviewed for information
> architecture only. No source code, text, images, logos, testimonials, or student
> results were copied. Any wording in Bokaro Defence Academy's website is original.

## 1. Mishra Institute (mishrainstitute.com)

**Focus:** MCA entrance coaching in Ranchi (not defence), but structurally a strong
example of a modern Indian coaching-institute landing page.

### Useful sections found
| Section | Notes |
|---|---|
| Announcement bar ("Admissions Open — New Batch Starting Soon") | Creates urgency; matches our planned announcement bar setting |
| Hero with headline + supporting stats (students placed, selection rate, years) | Stats row builds trust quickly |
| Exam calendar (upcoming exams with month cards) | Nice pattern for "upcoming batches / exam notices" |
| Founder's Desk | Personal trust element; we mirror this with the Director's message |
| "Winning Mindset" 4-step philosophy (Discipline/Strategy/Resilience/Belief) | Good "Why Choose Us" storytelling pattern |
| "A day at the institute" timeline (morning/afternoon/evening) | Communicates routine; useful for a defence academy's day structure |
| Achievers wall with rank cards | Standard results showcase |
| Reviews with exam + rank context | Testimonials tied to specific outcomes |
| Why Choose Us with 5 numeric stats | Trust statistics block |
| Closing CTA with phone number + "Start Admission Process" | Strong conversion close |

### Mobile observations
- Hero text and stats stack cleanly; stats are displayed as compact cards.
- Phone number is a real `tel:` link — good.
- Long single-page layout; footer navigation is minimal, requiring heavy scrolling.
- Some emoji-based icons (🥇📞) render inconsistently across devices.

### Usability problems to avoid
- Dense single-page design pushes FAQs and policies below very long scroll.
- "0 Students Placed" placeholders were visible in our fetch — hard-coded stats that
  break when content is empty. Our build must show real values or hide the block.
- No separate course detail pages; course depth is limited.
- Legal pages are hard to find.

## 2. Defence Academy Ranchi (defenceacademyranchi.in)

**Focus:** NDA/CDS/AFCAT/Agniveer/RIMC/Sainik School coaching — the closest domain
reference for Bokaro Defence Academy.

### Useful sections found
| Section | Notes |
|---|---|
| Course cards by target entry (NDA, CDS, AFCAT, Agniveer, RIMC, Sainik School) with eligibility line + intake status | Excellent course presentation pattern; each card shows eligibility and admission status |
| "Why Choose Us" with 6 domain-specific reasons (veteran faculty, UPSC coverage, SSB training, physical fitness, test diagnostics, small batches) | Well-matched to defence expectations |
| Notice board + upcoming batches tracker with start dates and seats left | Directly informs our Notices + Batch modules |
| Founder/mentor legacy section | Director's message pattern |
| Success stories / testimonials with named outcomes | Standard trust pattern |
| Multiple strong CTAs (Enroll Now, Book Seat, Explore Program) | Conversion-focused |

### Mobile observations
- Heavy use of uppercase display headings; sections stack reasonably.
- Some content is image-heavy, which can slow low-bandwidth mobile connections.
- Aggressive "military/ops" styling (regiment metaphors, ⚑/▦ symbols) can feel
  gimmicky rather than trustworthy.

### Usability problems to avoid
- Military-jargon styling ("Strategic Regiments", "Intake Live") may alienate parents
  who are the actual decision-makers — we use professional, calm language.
- Long marketing copy per section; we keep copy tight and scannable.
- Search and filtering of courses/results is absent — we add both.

## 3. Common defence-academy content patterns
Both (and the category generally) rely on:
1. **Hero + admission CTA** with announcement bar.
2. **Trust statistics** (years, selections, alumni, batches).
3. **Course grid** split by target exam with eligibility and intake status.
4. **Why Choose Us** — faculty quality, study material, tests, fitness, batch size.
5. **Results/achievers wall** and **testimonials**.
6. **Notice board / upcoming batches** with dates.
7. **Founder/Director credibility section**.
8. **Contact CTA** with phone, WhatsApp, and visit address.

## 4. Features worth adapting (as patterns, not copies)
- Admission-status badges per course ("Admissions Open", "Few Seats", "Closed").
- Exam-targeted course cards with eligibility + duration + mode.
- Upcoming-batch strip with start dates.
- Statistics row sourced from real, editable data (never hard-coded zeros).
- Announcement bar for time-sensitive messages.
- Director's message for personal credibility.
- FAQ section answering fee/eligibility/timing questions.

## 5. How the new website improves on the references
| Area | Reference sites | Bokaro Defence Academy build |
|---|---|---|
| Content management | Hard-coded copy | Every string, image, and stat editable via admin "Website Content" |
| Course detail | None / single page | SEO-friendly per-course detail pages with syllabus, fees policy, batch timings |
| Filtering | None | Courses searchable/filterable; results filterable by year/exam/course |
| Dashboards | None | Admin, Teacher, and Student dashboards with RLS-enforced isolation |
| Results integrity | Static claims | Achievements require consent flags; draft/publish workflow |
| Marks & attendance | None | Complete test/marks workflow with drafts, validation, audit trail |
| Chatbot | None | Gemini-powered assistant grounded in published FAQs only |
| Performance | Image-heavy | Optimized local/WebP images, lazy loading, code splitting |
| Accessibility | Limited | Labels, focus states, contrast, reduced-motion, keyboard support |
| Empty states | "0 Students Placed" bug | Real empty states that hide or explain missing data |

## 6. Protected content — confirmation
We did **not** copy:
- Source code, HTML/CSS/JS, or build output from either site.
- Written content, headlines, or marketing copy.
- Logos, branding, or photographic images (all site imagery is licensed stock,
  see `docs/image-attributions.md`).
- Student results, testimonials, or reviews.
- The exact design, layout, or color scheme.

The analysis above is limited to publicly visible information architecture and
interaction patterns, expressed in original language for our own implementation.
