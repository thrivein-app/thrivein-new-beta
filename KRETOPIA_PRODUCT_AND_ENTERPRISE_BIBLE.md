# Kretopia — Product & Enterprise Bible: Feature Register

Read-only audit. No code, configuration, billing or data was changed during this audit.

---

## 0. Audit scope, environment and method

| Item | Value |
|---|---|
| Branch inspected | `edit/edt-cb8a7e03-adfd-44a2-971a-f182560be718` |
| Commit | `5866fb5e062a27799a9b661124738a85f870f9f0`, 2026-09-10T05:25Z, author `gpt-engineer-app[bot]` |
| Audit date | 2026-09-14 |
| Source surface | 174 route declarations in `src/App.tsx`; 314 edge functions under `supabase/functions/`; full `src/` tree |
| Backend | Lovable Cloud (Postgres + edge functions). One instance serves both preview and the published site, so production row counts were observable. |
| Runtime environment exercised | The running preview app at `localhost:8080`, authenticated as a real test account ("Beta"), plus read-only SQL against the live database (`pg_stat_user_tables`, `cron.job`, table-level counts). |

### What "verified" means here

Three distinct evidence grades are used, and they are never blurred:

- **Code-inspected** — the wiring was read in source. Says nothing about whether it runs.
- **Data-evidenced** — the live database shows rows produced by that workflow, or shows zero rows where the workflow would have produced them.
- **Runtime-verified** — the surface was loaded in the running app as a signed-in user and observed to render real data.

A visible button, an existing table, a registered route, or a configured API name is **never** treated as proof of a working workflow. Where the three grades disagree, the disagreement is reported rather than resolved in the product's favour.

### What could not be inspected (reported as unknown throughout)

- Third-party dashboards: Stripe, Daily.co, Firecrawl, Resend/email, Twilio, ElevenLabs. Their account state, live-vs-test posture and delivery logs are outside this environment.
- The value of `STRIPE_MODE` and all other edge-function secrets. Deliberately not read; therefore whether payment code currently runs against live or test money is **unknown**.
- Published-site traffic and real end-user sessions.
- Any flow requiring a real card charge, a real phone number, or a real third-party OAuth grant — none were exercised, as the audit is read-only and non-billing.

### Runtime sweep result (evidence used below)

Twenty primary routes were loaded as a signed-in user. Every route rendered its own shell with no crash except one:

- **`/discover` is hard-broken at runtime.** It throws `SyntaxError: The requested module '/node_modules/mapbox-gl/dist/mapbox-gl.js' ...` and renders the global error boundary ("Something went wrong"). This is a total failure of the Discover surface, not a degraded state.

All other swept routes (`/`, `/profile`, `/desk`, `/scout`, `/credits`, `/thrivepay`, `/soundstages`, `/meetup`, `/opportunities`, `/messages`, `/inbox`, `/kreto`, `/intel`, `/clients`, `/manage`, `/subscription`, `/search`, `/match`, `/recordings`) rendered content.

### Scheduled jobs actually running (queried from `cron.job`, all `active = true`)

22 jobs: `ai-discovery-morning`/`-evening`, `auto-outreach-watch-every-6h`, `auto-resolve-disputes-daily`, `auto-rotate-challenges`, `challenge-deadline-reminders`, `daily-enrich-incomplete-profiles`, `daily-match-digest-08utc`, `daily-scout-gigs`, `desk-daily-nudge`, `event-reminders-every-15-min`, `gig-moderator-daily`, `inbox-triage-agent-every-10min`, `money-agent-watch-daily`, `process-outreach-queue-daily`, `process-scheduled-campaigns`, `speed-session-autocancel-every-5-min`, `speed-session-recap-hourly`, `speed-session-reminders-every-2-min`, `stage-reminders`, `thrivefund-auto-finalize`, `weekly-universe-scan`.

Notably **absent** from the schedule: `process-email-queue`, `send-event-reminders` (the older duplicate), `epk-refresh`/`auto-epk-updater`, `sync-daily-recordings`. Two of these are referenced in code or docs as if scheduled. Two active crons (`auto-rotate-challenges`, `challenge-deadline-reminders`) drive a feature whose UI routes are redirects to `/` — i.e. the platform is burning scheduled compute on a retired surface.

---

## 1. Creative Passport

### 1.1 Passport / profile page
- **Purpose / user** — every creator's own identity surface and their public card.
- **Route / objects** — `/profile` (`App.tsx:335`), `/profile/:userId` → `ViewProfile` (`:339`), `/passport` directory (`:346`), `/passport/:passportId` (`:348`). Components: `PassportHero`, `KretoActionCenter`, `TrustOpportunityCenter`, `PassportCreditsCta`; data via `useProfileData`; directory reads the `public_profiles_safe` view.
- **Status** — **verified working.**
- **Evidence** — runtime: `/profile` rendered with real profile data, no console errors. Code: `Profile.tsx:19-46`.
- **Dependencies / restrictions** — profiles table, `public_profiles_safe` view. `profiles` holds 191 rows.
- **Known failure** — `Profile.tsx:8` imports `jsPDF` with no remaining call site: a profile-level PDF export was removed or never finished, and the dead dependency is still shipped to the browser.

### 1.2 Credits ("Stamps")
- **Purpose / user** — the creator's verifiable body of work.
- **Route / objects** — `/credits` → `CreditsDashboard`; `CreditsStampsPanel.tsx`; table `credits`.
- **Status** — **verified working.**
- **Evidence** — runtime `/credits` rendered "6 credits · 25% complete · Verified 0 · Pending 6 · Needs evidence 0 · Co-signs 0" for the test account. Live table: **424 credit rows**, plus 179 `discovered_credits` and 33 `deleted_credits`.
- **Known failure / restriction** — the "needs evidence" chip in `CreditsStampsPanel.tsx:18-19` is a **second, simplified reimplementation** of evidence classification rather than calling the canonical `classifyCreditEvidence()` in `src/lib/passport/creditEvidence.ts:23-33`. Stamps and Co-Signs can therefore disagree about the same credit. Nothing enforces that evidence exists before a credit is created.

### 1.3 Co-Signs / vouches
- **Purpose / user** — peer confirmation of a credit.
- **Route / objects** — `CoSignsSection.tsx`, `CreditEndorsementDialog.tsx`, public `/credit-verify` (`App.tsx:524`); RPCs `submit_credit_endorsement_by_token`, `vouch_on_credit`; tables `credit_endorsements` (10 rows), `credit_vouches` (**0 rows**), `skill_endorsements` (10).
- **Status** — **partial.**
- **Evidence** — the token flow is wired end to end (insert → share link → RPC updates `credits.endorsement_count`). But **two parallel vouching mechanisms exist and are not unified**: the dialog uses the token RPC, while `useNotifications.tsx:134` and the `agent-vouch-credit` edge function call a different RPC (`vouch_on_credit`). The `credit_vouches` table has zero rows.
- **Known failure (historical, instructive)** — `COSIGN_MIGRATION_ACTION.md` records that the `'peer'` status written by the endorsement RPC was rejected by a `CHECK` constraint (error 23514) until a later migration allowed it. Co-signs failed silently for an unknown period. A self-cosign guard was also retro-fitted (`20260806054700_prevent_self_cosign.sql`), meaning the original design let an owner approve their own credit.

### 1.4 Evidence levels
- **Status** — **partial**, for the duplicate-classifier reason in 1.2. Canonical logic exists and is good; it is not the only implementation.

### 1.5 Claiming / unclaimed profiles
- **Purpose / user** — converting a scraped or imported profile into an owned account.
- **Route / objects** — real flow is `UniversalClaimFlow`, mounted only inside `Auth.tsx:624`; `/claim/:claimToken` → `ClaimProfile`; edge functions `verify-profile-claim`, `claim-and-create-profile`; RPCs `find_matching_unclaimed_profiles`, `finalize_unclaimed_profile_claim`; admin `UnclaimedProfilesTab.tsx` (1,243 lines).
- **Status** — **built but unverified** end-to-end (the flow requires face verification, not exercisable read-only).
- **Evidence** — server-side re-validation of the face-verification token is explicit at `claim-and-create-profile/index.ts:33-49` — the server does not trust client assertions. `face_verification_attempts` and `profile_claim_requests` are both **0 rows**, so no claim has completed through those tables in production.
- **Hidden/legacy** — the public `/claim` funnel is retired by decision: `Claim.tsx:5-9` states "deprecated (0 conversions in 30 days)" and redirects to signup.
- **Gap** — `/passport` directory does not distinguish claimed from unclaimed profiles at all.

### 1.6 Credit disputes
- **Route / objects** — `/dispute/:creditId`, `/dispute-manage/:disputeId`, `/admin/disputes`; table `credit_claim_disputes`; cron `auto-resolve-disputes-daily` (09:00, active).
- **Status** — **built but unverified.**
- **Evidence** — real Zod validation and upload constraints (`DisputeCredit.tsx:17-30`), full status lifecycle and admin role gate (`AdminDisputes.tsx:32-38, 57-79`), and the auto-resolution cron **is confirmed scheduled and active**. However `credit_claim_disputes` holds **0 rows** — no dispute has ever been filed in production, so the path has never executed against real data.

### 1.7 Privacy / visibility controls
- **Status** — **not found / placeholder.**
- **Evidence** — `Settings.tsx:111` and `:747` carry the comment "Privacy switches removed — were never persisted (local state only). Re-add when wired to backend." There is no `is_public` or `profile_visibility` column on `profiles`. `ProfileVisibilityDashboard.tsx:31` derives "visible" from profile completeness, not from any stored preference, and offers no toggle.
- **Consequence** — a creator cannot hide their Passport. For an enterprise/roster conversation this is a material gap, not a cosmetic one.

### 1.8 EPK
- **Route / objects** — `/epk/:userId` (public); `CreatorEPK.tsx` (1,011 lines), `EPKPdfEditor.tsx`, `src/lib/epkPdfGenerator.ts` (951 lines); edge functions `auto-epk-updater`, `epk-og-image`.
- **Status** — **built but unverified** (PDF generation is client-side and was not executed in this pass).
- **Entitlement** — real: `EPKPdfEditor.tsx:17,77-78` gates custom branding behind Creator+ via `hasProAccess`/`hasCreatorProAccess`.
- **Known gap** — `epk_refresh_suggestions` is **0 rows** and `auto-epk-updater` has **no cron entry**. The "EPK keeps itself fresh" capability is not running.

### 1.9 Comp cards
- **Route / objects** — `/comp/:userId` (public), `/passport/comp-card` → `CompCardBuilder`; storage bucket `portfolio`; jsPDF export at `CompCardBuilder.tsx:93-107`.
- **Status** — **built but unverified.**
- **Restriction finding** — no tier check anywhere in `CompCardBuilder.tsx`. Every other Passport export (EPK branding, site templates) is gated; this one is free to all logged-in users. Whether that is intended is a product decision, not a code fact.

### 1.10 Creator website templates / editor
- **Route / objects** — `/website-builder`, public render `/site/:userId` and `/:username`; `templateConfig.tsx` splits 3 `pro` templates from 6 `creator_pro` templates.
- **Status** — **built but unverified.** Entitlement gating is real.

### 1.11 Custom domains
- **Status** — **not found.** The feature does not exist. `custom_domain` appears nowhere in the codebase. What ships is a Creator+-gated instructions panel (`WebsiteBuilder.tsx:612-629`) telling the user to set up a 301 redirect at their own registrar. There is no DNS verification, no CNAME/A-record automation, no ownership check and no custom-hostname routing. This must be described as "domain redirect instructions", never as custom domain support.

### 1.12 Exports and sharing
- Share sheet (`PassportShareSheet.tsx`): **verified working** — real clipboard copy and `navigator.share`.
- EPK PDF: built, gated, unverified at runtime.
- Comp-card PDF: built, ungated, unverified at runtime.
- Profile PDF: **not found** (dead import only).
- QR sharing: **unknown** — an `onShowQR` prop pattern exists; no QR renderer was located.

---

## 2. Dashboards, organisations and administration

### 2.1 Personal vs company mode
- **Status** — **partial, and much thinner than the name suggests.**
- **Evidence** — there is no organisation entity anywhere. The entire "company mode" is a single `profiles.account_type` string read by `useAccountTone.ts:57,75-79`, which swaps **copy and tone only** (`surface`, `craft`, `download`, `matchVerb`). It gates no feature and no data. `/company-onboarding` is the only company-specific flow.

### 2.2 Organisations, rosters, representation
- **Status** — **not found.** No `organizations` table, route or model. `TalentManager.tsx` implements an affiliate-style referral/commission program (`talent_managers`, `talent_referrals`, `referral_commissions`) — not representation. `talent_shortlists`, `talent_shortlist_items`, `talent_referrals`, `referral_commissions`, `referral_network`, `referral_chain` are all **0 rows**; only the older `talent_shortlist` table has data (105 rows).

### 2.3 Client portal
- **Status** — **partial.** `/clients` and `/clients/:clientId` are an **owner-facing CRM**, not a client-facing portal (runtime-verified rendering). The genuine client-facing surface is the token flow `/review/:token` plus the in-Studio `client` role, which can comment and approve but never sees money (`useStudioRole.ts:45,52-54`). `client_contacts` is **0 rows**.

### 2.4 Supplier portal
- **Status** — **not found.** "Supplier" exists only as an entity-kind label inside `studio-ingest` and as CRM copy. No route, page or portal.

### 2.5 Administration
- **Route / objects** — `/admin`, `/admin/weekly-note`, `/admin/disputes`; five legacy admin paths redirect to `/admin`. Gating via `user_roles`.
- **Status** — **verified working** (admin gate is real and role-table-backed).
- **Known issues** — the admin check is implemented twice and inconsistently (`useUserRole.tsx:24-30` vs an inline re-implementation at `Admin.tsx:199-220`). Two admin analytics panels, `LandingFunnelPanel.tsx` and `CreativeActionFunnels.tsx`, exist but are **not imported anywhere** — orphaned code.

### 2.6 Dead route collision
`/dashboard` is declared twice in the same `<Routes>` tree: a real component at `App.tsx:336` and a `Navigate` to `/desk` at `App.tsx:535`. React Router matches the first, so the redirect is unreachable and `Dashboard.tsx` is still live despite apparently being deprecated.

---

## 3. Studio (Desk)

This is the most mature module in the product.

| Feature | Route / objects | Status | Evidence |
|---|---|---|---|
| Studio shell | `/desk` → `WorkHome`, `/desk/:projectId` → `ThriveDesk.tsx` | **verified working** | Runtime render confirmed; 44 `projects` rows live |
| Briefs | `BriefHub.tsx:277` inserts `project_deliverables`; `BriefDropZone` → `studio-ingest` | **built but unverified** end-to-end | 13 `project_deliverables` rows |
| Tasks / subtasks | `TasksWorkspace.tsx`; `enhance-task`, `voice-to-task` | **verified working** | **230 `project_tasks` rows** — the most-used Studio object |
| Chat | `SimpleProjectChat`, `project_messages` | **verified working** | 66 `project_messages` rows |
| Files / Vault | `VaultTab.tsx`, `route-vault-file`, `project_files` | **verified working** | 62 `project_files`, 101 `project_file_folders`, 10 `file_comments` |
| Approvals | `ApprovalWorkflows.tsx:142-342`, `deliverable_comments` | **partial** | Code is a real approve/comment cycle, Pro-gated; but `deliverable_comments` and `deliverable_versions` are both **0 rows** — never used in production |
| Milestones / budgets | `FinanceHub.tsx`, `MilestoneStrip`, RPC `get_project_milestone_financials`, Stripe round-trip at `ThriveDesk.tsx:96-122` | **partial** | 5 `milestones` rows (4 pending, 1 requested); zero releases |
| Schedules / call sheets | `CallSheetTab.tsx` → `project_call_sheets` | **built but unverified** | Real CRUD in code; note the naming collision with 1:1 video `StartCallSheet.tsx` |
| Run-of-show / roll-call / splits | `RunOfShowTab`, `RollCallTab`, `SplitSheetTab`, `ExchangeLedgerTab`, `RevisionsTab` | **partial** | `project_run_of_show` has 14 rows; `project_split_sheets`, `project_revisions`, `project_exchange_terms` are **0 rows** |
| Repeat projects | — | **not found** | Zero hits for `repeat`/`duplicate`/`cloneProject` anywhere in `src/` |
| Guest access | `/guest/:token`, `/desk/join/:token`, `/review/:token`; `redeem-project-share` | **built but unverified** | 7 `guest_studio_tokens` rows; restrictive role model at `useStudioRole.ts:49-57` |
| Studio Brain | `studio-ingest/index.ts`, `studio_facts`, `studio_entities` | **verified working** | 85 `studio_facts`, 54 `studio_entities` — genuinely in use |
| Roles / permissions | `useStudioRole.ts` | **partial** | Client-side derivation only. Whether Postgres RLS enforces the same boundaries on `project_deliverables`, `milestones`, `project_call_sheets` was **not verified** — this is the single most important unverified security assumption in the Studio module |

---

## 4. Scout, Scouted and Match

### 4.1 Gig ingestion
- **Objects** — `scout-gigs/index.ts` (Firecrawl + Gemini → dedupe → upsert `scouted_gigs`, audit row in `scout_runs`); cron **`daily-scout-gigs` at 07:00 UTC, active**.
- **Status** — **verified working.**
- **Evidence** — 372 `scouted_gigs`, **783 `scout_runs`**, 16 `scout_preferences`. Tier caps are real (`index.ts:357-375`): free/spark 1 scan/week, creator 10/run daily, creator+/founder 25/run.
- **Restriction observed at runtime** — the test account's Scout feed showed "No fresh gigs matched right now". Freshness filtering (`expires_at`, `isStale()`) is working as designed, but it means the surface can legitimately render empty.

### 4.2 Applications
- **Status** — **partial by design, and this is a strategic gap.**
- **Evidence** — `draft-gig-application` generates a personalised email; the apply action is a **`mailto:` handoff** (`ScoutedGigsSection.tsx:290`). Kretopia therefore holds no application record for scouted gigs, only a self-reported funnel event in `scouted_gig_actions` (73 rows). Outcomes (`won`/`lost`/`ghosted`) depend entirely on the user coming back to tag them.

### 4.3 Shortlists
- **Status** — **verified working.** Save/unsave via `scouted_gig_actions`, read by `ShortlistedGigs.tsx:42-56`.

### 4.4 Marketplace opportunities
- **Status** — **verified working.** `opportunities` 22 rows, `applications` 10 rows, `opportunity_views` 207. Applying uses the RLS-safe RPC `notify_new_application` rather than a client insert (`ApplyToOpportunityDialog.tsx:171`) plus a separate scout-attribution notification (`:186`). Cron `gig-moderator-daily` is active; `gig_moderation_log` has 15 rows.

### 4.5 Match
- **Status** — **verified working.** `swipes` 460, `matches` 63, `connections` 288. `useSwipeActions.ts` dedupes at every step and calls RPC `create_bidirectional_connection`; notifications fire from a DB trigger rather than the client.
- **Conversion signal** — 460 swipes → 63 matches → 288 connections, but only **56 `messages`**. The match-to-conversation step is where the funnel collapses.

### 4.6 Handoff
- Scout → Studio: **not found.** A scouted gig cannot become a project.
- Match → Studio: **built but unverified** (`StartProjectFromMatchDialog`).

---

## 5. Services, enquiries, availability and bookings

### 5.1 Free call booking
- **Objects** — `/:handle/book` → `BookingPage.tsx`; tables `creator_booking_windows`, `creator_availability_blocks`, `meetings`; edge function `book-meeting`.
- **Status** — **built but unverified** (no booking was placed).
- **Evidence of quality** — `book-meeting/index.ts:70-96` re-validates the slot server-side against the window and performs a real collision check returning HTTP 409, then provisions a Daily room. This is the only genuinely conflict-safe scheduling path in the product.

### 5.2 Paid services
- **Status** — **placeholder on the buyer side.**
- **Evidence** — creator-side CRUD against `creator_services`/`service_tiers` is wired. But the buyer-facing **"Book Now" (`WorkWithMeSection.tsx:373-375`) and per-tier "Select · {price}" (`:409-412`) buttons only call `e.stopPropagation()` — no handler, no checkout, no booking.** `service_packages` is **0 rows**.
- **Only working path** — "Request Custom Project" inserts a `custom_project_requests` row with no link to any service, price or slot, and no payment step. That table is **0 rows**, and no reader/inbox for it was found.

### 5.3 Enquiries, recurring bookings, resource conflicts
- **Enquiries** — **not found** as an entity; the custom-project form stands in for one.
- **Recurring bookings** — **not found.** Zero code references.
- **Resource conflicts** — only for free calls (5.1). No conflict logic can exist for paid services because no paid booking flow exists.

---

## 6. Events

| Feature | Status | Evidence |
|---|---|---|
| Creation | **verified working** | `CreateSessionDialog` + RLS-enforced cover upload; 11 `creative_jams` rows |
| Discovery `/meetup` | **verified working** | Runtime render showed a real listed event with date, venue and capacity |
| RSVP / registration | **verified working** | 129 `event_rsvp_answers`, 82 `jam_participants`, 48 `guest_rsvps` |
| Ticketing & checkout | **built but unverified** | `purchase-event-ticket`, `checkout-event-tickets`, `verify-event-ticket`, `validate-event-promo` all exist; **`event_orders` and `event_promo_codes` are 0 rows — no ticket has ever been sold** |
| Check-in / QR | **built but unverified** | `EventCheckInDialog` wired into 4 surfaces. Standalone `CheckIn.tsx` page is orphaned (`/checkin` redirects to `/`) |
| Programme / runsheet | **partial** | `gen-event-runsheet` + 12 `event_runsheet_items`; producer-facing only, inside a Studio project |
| Speakers / performers | **partial** | No dedicated roster concept; folded into `event_talent` (16 rows) and crew mode |
| Sponsors | **partial** | `EventSponsorsKanban` mounted only from `StudioRoom`; 15 `event_sponsors` rows; 56 `sponsor_leads` from `sponsor-radar`. No confirmed wiring between the two |
| Suppliers | **partial** | 8 `event_suppliers` rows; no dedicated portal or standalone UI |
| Blasts & reminders | **verified working** | Cron `event-reminders-every-15-min` active; 32 `event_blast_recipients` |
| Promoter rewards | **built but unverified** | Logic at `event-reminders/index.ts:286-317`; `event_promoter_rewards` **0 rows** |
| Recap & reporting | **partial** | `generate-event-recap` is auth-gated and real; `event_recap_drafts`, `event_analytics_events`, `event_host_stats`, `event_feedback` all **0 rows**. There is no event analytics dashboard |
| Waitlist / seating / photos | **not exercised** | `event_waitlist`, `event_seating_layouts`, `event_seating_assignments`, `event_photos`, `event_cohosts` all **0 rows** |

**Known failures**
1. **Host comment deletion silently fails.** `EventComments.tsx:254` shows a delete control to the host for any comment, but the DELETE policy is author-only (`20260327014406`). The UI removes the comment optimistically; it returns on refetch.
2. **Co-hosts are decorative.** `EventCohosts.tsx:216` promises co-hosts "can help manage this event", but the `creative_jams` UPDATE policy is `created_by = auth.uid()` with no co-host exception. The capability does not exist.
3. N+1 query loop in `event-reminders` (per-participant profile + auth lookup + email invoke).
4. No length limit on `event_comments.content`.
5. Replaced event cover images are never deleted from storage.

---

## 7. SoundStages

| Feature | Status | Evidence |
|---|---|---|
| Live rooms (Daily.co) | **verified working** | 67 `sound_stages`, 17 `spark_rooms`, 129 `spark_room_members`; `SoundStageRoom.tsx` is 1,736 lines — the largest UI surface in the product |
| Auditions / apply-to-stage | **partial** | `apply-to-stage` + `review-stage-application` wired; `curated_stage_raised_hands`, `curated_stage_invites`, `curated_stage_orders` all **0 rows** |
| Raised hands / queues | **built but unverified** | Edge functions exist; no production rows |
| Speed sessions / timed rotations | **verified working** | 9 `speed_sessions`, 17 `speed_session_rsvps`; three active crons (`-reminders-every-2-min`, `-autocancel-every-5-min`, `-recap-hourly`) |
| Networking pairings | **partial** | Delivered via `speed-session-matcher`; not a separate feature |
| Showcases | **unknown** | Described as a third curated-stage type; the enum was not confirmed and no Showcase-specific UI difference was located |
| Moderation | **partial** | Host controls live inside `SoundStageRoom`/`StageHostConsole`. The `*-moderator` edge functions moderate content, not live stages |
| Recording | **partial** | `daily-recording-webhook`, `get-recording-link` exist; `meeting_recordings` is **0 rows**; `sync-daily-recordings` has **no cron** |
| Transcription | **built but unverified** | `transcribe-call` is wired into the recording pipeline; **30 `call_transcripts` rows** exist, so it has run. `meeting_transcripts` is 0 rows — two competing transcript tables |
| Highlights | **partial** | Column exists on `call_transcripts` per the memory record, but no dedicated highlights UI was found |
| Feedback | **not found** | No post-stage rating/feedback feature exists |
| Follow-up / co-sign outcomes | **built but unverified** | `record-stage-outcome` defines `co_sign / credit / rolodex / followup`; **no idempotency guard** — a double tap on "Credit" can create duplicate credit rows |

**Entitlement** — stage creation is **ungated by plan**: no tier check was found in `create-sound-stage`, `create-curated-stage`, `create-event-room`, or any of the creation UIs. Only Daily cloud recording is entitlement-aware, and it degrades silently rather than blocking.

**Known operational risks** — Daily room/token expiry mismatch (4h room vs 2h joiner token) causes unexplained join failures near the boundary; there is no janitor for abandoned stages, so `is_live` stays true forever if a host closes the tab; `SoundStagesRail` refetches the full top-20 on every realtime event and will not scale past roughly 50 concurrent stages.

---

## 8. Kreto (agent)

### 8.1 Chat surfaces
- **Status** — **verified working.** `/kreto` rendered with an existing conversation thread. `ThriveAgentFab` (persistent), `KretoAnswerModal` (Today), both backed by `thrive-ai-chat`. 15 `ai_conversations`, 88 `ai_messages`, 82 `desk_ai_usage` rows.

### 8.2 Tool registry — what actually executes
- **Status** — **partial.** 68 tools in `orch_tool_registry`, all enabled. Every `handler` resolves to a real edge function **except two**:
  - `charge_card` → handler `create-payment`: **the function does not exist.** This is the only `locked`-risk tool, so the platform's headline "never charges without permission" guarantee is enforced by absence, not by a gate.
  - `summarize_opportunities` → handler `personalized-recommendations`: **does not exist.** If the model selects it, dispatch 404s.

### 8.3 Orchestration and reliability
- **Status** — **partial, with a measured failure rate.**
- **Evidence from live data** — `orch_runs` 66, `orch_actions` 75 (`auto_executed` 36, `failed` 25, `rejected` 10, `executed` 4). `copilot_plans` 23 (`failed` 13, `completed` 8, `proposed` 2).
- **Read plainly: one third of agent actions and well over half of multi-step plans fail.** Root causes were not traced per row.
- The executor halts on first failure and marks the rest skipped, with **no retry and no rollback** — a task created by step 1 survives a step-3 failure (`copilot-executor/index.ts:310-338`).

### 8.4 Approvals — the most consequential finding in this module
Two parallel approval schemas exist, and four UI surfaces read the dead one.
- **Live path:** `orch_actions` / `orch_runs`, driven by `usePendingAgentActions.ts:22-40` and `AgentApprovalCard`.
- **Dead path:** `agent_actions` and `agent_runs` are both **0 rows**, yet are still read by `AgentsActivity.tsx:26`, `KretoTab.tsx:97`, `FounderKitMetrics.tsx:23` and written by `DemoAgent.tsx:65`.
- **Consequence:** the Agents Activity page, the Kreto tab's "recent actions" widget, and the founder-kit metric all render permanently empty while real agent activity accumulates elsewhere. Confirmed by row counts plus source references.

### 8.5 Proactive proposals
- **Status** — **verified working.** `agent_proposals`: 104 rows (68 pending, 25 accepted, 12 dismissed) — genuine user engagement. Cron `desk-daily-nudge` at 14:00 and `money-agent-watch-daily` at 09:00 are active.

### 8.6 Memory
- **Status** — **built, effectively unused.** `thrive_memory` 2 rows; `copilot_memories` **0 rows** despite four dedicated edge functions and a `/settings/copilot-memory` route.

### 8.7 Usage limits
- **Status** — **verified working in code path.** `consume_copilot_message` (`thrive-ai-chat/index.ts:182`), `consume_voice_seconds` called through the *user* client so `auth.uid()` resolves (`thrive-voice-turn/index.ts:119-120`), `checkAndConsumeStudioAIGeneration` caps free Studio AI at 5/day. Whether the two RPC bodies implement the documented per-tier split is **unknown** (SQL bodies not read).

### 8.8 Voice, receipts, recovery
- Voice: **built but unverified** — thin orchestration over separate STT/TTS functions.
- Receipts: `orch_runs`/`orch_actions` constitute a real, queryable audit trail. The tables the UI *calls* receipts are the empty ones (8.4).
- Recovery: timeouts are handled deliberately (150s edge budget, 110s planner budget); retries are not implemented.

---

## 9. KrePay

| Feature | Status | Evidence from live data |
|---|---|---|
| Invoices | **verified working** | 20 rows: 10 paid, 9 draft, 1 sent |
| Invoice checkout (card) | **partial** | Payment-method mix: **bank_transfer 13, other 6, thrivepay 1**. The card rail has been used once. Manual bank transfer is how this product actually gets paid |
| Payment links | **built but unverified** | 11 `payment_links`, 6 `payment_link_payments` |
| Stripe mode safety | **verified in code** | `_shared/stripeEnv.ts:38-60` fails closed on a test/live key mismatch and never logs values. **The live value of `STRIPE_MODE` is unknown by design** — so whether the product is currently transacting real money cannot be stated |
| PowerTranz / Caribbean rail | **not found** | Zero references in application code. The only occurrence in the repo is decorative caption text in a marketing video asset (`remotion/src/scenes/SceneInvoice.tsx`). Any claim of PowerTranz support is unsupported |
| Webhooks | **partial** | `stripe-marketplace-webhook`, `stripe-wallet-webhook`, `guest-wallet-webhook` exist; `stripe_webhook_events` is **0 rows** — no webhook has been recorded |
| Refunds | **not found** | No refund edge function exists; no refund path was located inside the webhook or escrow functions. `payment_disputes` 0 rows |
| Commissions | **built but unused** | `referral_commissions` **0 rows** |
| Manual bank transfers | **partial / unreconciled** | 13 invoices are marked `bank_transfer`, but `manual_bank_transfers` is **0 rows** — the reporting flow evidently writes to `invoices` directly. The dedicated table, its 8 policies and its admin confirm/reject RPCs are dormant |
| Wallets | **verified working** | 401 `wallets`, 191 `creator_wallets` — auto-provisioned broadly |
| Top-ups | **partial** | `wallet_topups`: 5 pending, 1 completed. Completion is the exception |
| Payouts (Connect) | **built, never executed** | `creator_payouts`, `creator_payout_methods`, `wallet_connections`, `wallet_transfers` all **0 rows**. `wallet-payout` is code-complete and has never run |
| Escrow / milestone release | **built, never executed** | 5 `milestones`; `thrivefund_milestone_releases` **0 rows** |
| Expenses | **verified working** | 5 rows, all confirmed |
| Reconciliation | **not found** | No reconciliation job or ledger table located by name |

**Bottom line for KrePay:** money comes *in* through invoices settled manually offline; money has never gone *out* through the platform. Payout, escrow-release, refund and reconciliation are the unexercised half of the system.

---

## 10. Platform-wide modules

### 10.1 Community / Crews
- **Status** — **verified working but hidden from navigation.** `/crews`, `/crew/:id`, `/crew/:id/chat` live; `Circles.tsx:27-40` queries `spark_rooms`/`spark_room_members` (17 / 129 rows). `HIDDEN_V1.crews = true`.
- **Important caveat about the hide** — `HIDDEN_V1` is **aspirational metadata, not enforcement**. Its only consumer, `useV1Flag.ts`, has **zero call sites elsewhere in the app**. Components such as `StartCircleNudgeCard.tsx:85` and `ThriveFundFeedRow.tsx:23,30` still link straight to `/crews` and `/fund`. "Hidden" currently means "not in the nav bar", nothing more.
- `crew_feed_posts`, `community_posts` and all their reaction/comment tables are **0 rows**.

### 10.2 Messaging
- **Status** — **partial.** Runtime `/messages` rendered with Direct / Groups / Calls / Requests tabs and an empty inbox for the test account. Live: 56 `messages`, 56 `direct_video_calls`, 41 `project_video_calls`, 59 `video_call_guest_tokens`.
- **Known failure** — the Requests tab badge is `const [requestCount] = useState(0)` at `Messages.tsx:45` and is never updated. A user with pending message requests sees a zero badge.
- `message_reactions`, `spark_message_reactions` are **0 rows**.

### 10.3 Notifications
- **Status** — **verified working** with a cosmetic defect. 1,190 `notifications`, 395 `notification_preferences`, 3,977 `email_send_log` rows, 198 unsubscribe tokens.
- **Defect** — `Notifications.tsx:12-22` `getCategoryIcon()` returns `''` for every category; icons never render.
- **Cron gap** — `process-email-queue` is documented as a 5-second pg_cron job but **is not present in `cron.job`**. Email dispatch depends instead on the `email_queue_wake` trigger path. Given 3,977 send-log rows, mail is clearly going out; the documented scheduled drain is not what is doing it.

### 10.4 Near You / Discover
- **Status — `/discover` is BROKEN at runtime.** It throws a mapbox-gl module `SyntaxError` and renders the global error boundary. This is the one hard breakage found in the sweep.
- `/nearby` → `NearbyCreators.tsx` (534 lines) is separately wired; 35 `creative_locations`, 43 `location_categories`. All engagement tables (`location_reviews`, `location_bookmarks`, `location_claims`, `location_bookings`) are **0 rows**.

### 10.5 Spotlight (Magazine + Podcast)
- **Status** — **partial.** `/spotlight` live; 15 `magazine_articles`. `podcast_episodes`, `episode_clips`, `episode_sponsors`, `magazine_article_likes`, `magazine_article_comments` are all **0 rows** — the podcast half has no content and the engagement layer is unused.

### 10.6 Integrations
- Connected platforms: **partial** — `connect-platform` wired across Spotify/YouTube/Instagram etc.; only **7 `connected_platforms`** rows. `integration_connections` is 0 rows (a second, unused table for the same concept).
- Credit scrapers (`fetch-imdb-credits`, `-spotify-`, `-discogs-`, `-musicbrainz-`, `-youtube-`): **verified working** by proxy — 179 `discovered_credits`, 167 `discovery_scans`, 162 `pending_discoveries`, plus active crons `ai-discovery-morning/-evening` and `weekly-universe-scan`.
- Import jobs: **not found in use** — `import_jobs`, `import_mappings`, `import_source_objects`, `import_suggestions`, `import_audit_log` are **all 0 rows** despite a full `/studio/import` route and six edge functions.
- OAuth/SSO provider + MCP server (`src/lib/mcp`, 5 tools): **built but unverified**; third-party consumers are not observable from here.

### 10.7 Subscriptions and paywalls
- **Status** — **verified working.** `/subscription` rendered real plan tiers with the account's current plan marked. `create-checkout`, `create-founder-checkout`, `customer-portal`, `check-subscription` all present; `useFeatureGate.ts:19-51` enforces free caps across eight surfaces.
- `founder_circle_purchases` and `founder_circle_grants` are **0 rows** — no Founder Circle sale has completed.

### 10.8 Analytics
- **Status** — **verified working at the capture layer, partial at the reporting layer.** `analytics_events` holds **1,366,714 rows**; `site_analytics` 28,009; `creative_actions` 734; `user_session_pings` 436; `client_error_logs` 568.
- Two admin panels that would read this (`LandingFunnelPanel`, `CreativeActionFunnels`) are **orphaned and never mounted**. The platform collects 1.37M events and under-reports on them.

### 10.9 Other features
- **Fund (ThriveFund)** — routes live, `thrivefund-auto-finalize` cron active, `thrivefund_milestone_releases` 0 rows. Hidden from nav.
- **Ambassadors** — `/ambassadors`, `/ambassador`; `ambassador_applications` **0 rows**.
- **Founding Member** — `/founding-member`; 54 `founding_member_quests` rows — in use.
- **Challenges** — **hidden/legacy but still burning compute:** both UI routes redirect to `/`, yet 234 `challenges` rows exist and two crons (`auto-rotate-challenges` every 2h, `challenge-deadline-reminders` every 6h) are active against a surface no user can reach.
- **ICDB / Verified** — 38 `icdb_projects`, 103 `icdb_project_roles`, 55 taxonomy rows, 18 companies. `ICDBDiscovery.tsx` has **no route** — orphaned page.
- **Brand Vault** — `/brand-vault` live; `brand_vaults` **0 rows**.
- **Intel** — `/intel` is routed (`App.tsx:532`) and rendered at runtime showing "No brief yet. Tap refresh." `opportunity_intel_digests` **0 rows**; 154 `ep_daily_briefings` rows come from a different pipeline.
- **Telegram channel** — 18 `telegram_messages` rows; a real second surface for agent approvals.
- **Inbox triage** — cron `inbox-triage-agent-every-10min` active, but `inbox_triage_classifications` is **0 rows**: the job runs and produces nothing.
- **i18n / PWA / Capacitor** — present, not audited for coverage.

### 10.10 Scale of unused schema
**152 of the roughly 300 public tables contain zero rows.** That is not inherently wrong — some are correctly waiting for first use — but it is the single clearest measure of how much of this product is built ahead of demand, and it should be read alongside every "built but unverified" status above.

---

## 11. The ten most important broken or missing connections between modules

1. **Kreto's activity UI reads dead tables.** `agent_actions`/`agent_runs` are empty while all real agent work lands in `orch_actions`/`orch_runs`. `AgentsActivity`, `KretoTab`'s recent-actions widget and `FounderKitMetrics` therefore show permanent zeros. Users cannot see what their agent did. (§8.4)
2. **Scout does not connect to Studio or to any application record.** Applying is a `mailto:` that leaves the platform. No project is created, no thread opens, no invoice is anticipated. The "search → paid credit" loop is severed at its first joint. (§4.2)
3. **Paid Services have no buyer path at all.** "Book Now" and "Select · {price}" are handlers-less buttons. Services connect to neither the booking engine (which exists and works for free calls) nor to KrePay. (§5.2)
4. **Money can come in but has never gone out.** Payouts, escrow release, refunds and reconciliation are all code-complete with zero executions and, in the case of refunds, no implementation. Wallet → bank is an unproven link. (§9)
5. **`/discover` crashes.** A mapbox module error takes the whole Discover surface to the error boundary, breaking the connection between Match, Nearby, Live and Events discovery. (§10.4)
6. **Events ticketing connects to no money.** Checkout functions exist, `event_orders` and `event_promo_codes` have never held a row, and `stripe_webhook_events` is empty — so the ticket → payment → check-in chain has never completed once. (§6)
7. **Studio role permissions are enforced client-side only, unverified at the database.** `useStudioRole` denies money to clients and guests in the browser; whether RLS on `milestones`, `project_deliverables` and `project_call_sheets` agrees was not confirmed. This is a trust boundary between Studio and KrePay that the audit cannot certify. (§3)
8. **Co-signs run on two unconnected mechanisms** (token RPC vs `vouch_on_credit`) with two evidence classifiers, and `credit_vouches` is empty. The Passport's central trust signal has no single source of truth. (§1.3, §1.4)
9. **Analytics captures 1.37M events that nothing reports on.** The two admin panels built to read them are orphaned, so the product's largest dataset is disconnected from every decision surface. (§10.8)
10. **Crons run against surfaces users cannot reach, while surfaces users can reach lack crons.** Challenges gets two active schedules behind a redirect-to-home; inbox triage runs every 10 minutes and writes nothing; meanwhile `auto-epk-updater`, `sync-daily-recordings` and the documented `process-email-queue` drain have no schedule at all. (§0, §10.3)

Two further items narrowly missed the list and should be tracked: event co-hosts are promised in copy but blocked by RLS (§6), and there is no way for any creator to make their Passport private (§1.7).

---

## 12. Proposed improvements — separate from the inventory above

Nothing in this section is a finding. These are recommendations.

**Immediate (breakage and false signals)**
1. Fix the `/discover` mapbox import failure.
2. Point `AgentsActivity`, `KretoTab` and `FounderKitMetrics` at `orch_actions`/`orch_runs`, or migrate the legacy tables and retire them.
3. Either wire or remove the dead "Book Now" / "Select" buttons — a priced button that does nothing is worse than no button.
4. Fix the Messages requests badge and the empty notification category icons.
5. Remove the two tools whose handlers do not exist (`charge_card`, `summarize_opportunities`) from the registry rather than relying on a 404.

**Short term (integrity)**
6. Verify RLS on every Studio money object against the client-side role model, and write a test that fails if they diverge.
7. Add an idempotency key to `record-stage-outcome` so a double tap cannot mint duplicate credits.
8. Give hosts a real co-host policy or remove the co-host UI copy.
9. Collapse the two co-sign mechanisms and the two evidence classifiers into one path each.
10. Ship an actual Passport privacy toggle backed by a column, since the setting was already promised and withdrawn once.

**Medium term (product connections)**
11. Turn a scouted gig into an in-platform application with a Studio stub on win, so Scout feeds Desk and Desk feeds KrePay.
12. Exercise one full payout and one full refund in a sandbox before either is described to an enterprise buyer.
13. Retire or route the challenge crons, the inbox-triage job and the other schedules producing nothing.
14. Mount the two orphaned analytics panels, or delete them and build one report that reflects the 1.37M events already captured.

**Hygiene**
15. Decide, table by table, which of the 152 empty tables are pre-built and which are abandoned; drop the abandoned ones. The same applies to orphaned pages (`ICDBDiscovery`, `Events.tsx`, `CheckIn.tsx`) and the duplicate `/dashboard` route.
16. Make `HIDDEN_V1` actually enforce, or stop describing those surfaces as hidden.

---

*End of register. No secrets, keys, tokens or identifiable customer data appear in this document; all production figures are aggregate counts.*
