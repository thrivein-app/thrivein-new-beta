# Kretopia Product & Enterprise Bible — Read-Only Audit

A full inventory of what exists, what actually works, and what only looks like it works. No code, config, billing or data changes.

## Deliverable

One document at the project root: `KRETOPIA_PRODUCT_AND_ENTERPRISE_BIBLE.md`, containing the complete feature register (not a summary), plus two clearly separated closing sections:
- Top 10 broken or missing connections between modules
- Proposed improvements (kept apart from the inventory)

## Scope anchor

- Branch: `edit/edt-cb8a7e03-adfd-44a2-971a-f182560be718`, commit `5866fb5`, dated 2026-09-10.
- Environment inspectable: the running preview app, the Lovable Cloud backend behind it (same instance serves preview and the published site), 174 routes, 314 backend functions, and the full source tree.
- Not inspectable: the live published traffic, third-party dashboards (payment processor, email, telephony, transcription vendors), and anything requiring secrets. These are reported as unknown, never guessed.

## Evidence rules applied to every entry

Each feature gets one status: verified working · built but unverified · partial · placeholder · hidden/legacy · explicitly planned · not found.

- "Verified working" requires a real end-to-end observation: the flow driven in the running app, or the backing rows/policies queried and confirmed to support it.
- A visible button, an existing table, or a configured API name is never treated as proof.
- Anything that cannot be reached is written as unknown with the reason.
- No secrets, keys, or identifiable customer data in the document. Counts and aggregates only.

## Register structure

Every feature entry carries: purpose and user type · route and components/backend objects · status · the evidence behind that status · dependencies, restrictions, plan entitlement, known failures.

Sections, in order:

1. Creative Passport — credits, Co-Signs, evidence levels, claiming, disputes, privacy, EPK, comp cards, website templates/editor, custom domains, exports, sharing.
2. Dashboards & organisations — personal and company modes, roles, rosters, representation, client/supplier portals, administration.
3. Studio — briefs, tasks, chat, files, approvals, milestones, budgets, schedules, call sheets, repeat projects.
4. Scout / Scouted / Match — ingestion, freshness, applications, shortlists, handoffs.
5. Services & bookings — enquiries, availability, bookings, recurring bookings, resource conflicts.
6. Events — creation, discovery, registration, ticketing, check-in, programme, speakers/performers, sponsors, suppliers, reporting.
7. SoundStages — live audio/video, auditions, queues, timed rotations, networking, showcases, moderation, recording, transcription, feedback, follow-up.
8. Kreto — tools, genuinely executable actions, permissions, approvals, memory, receipts, recovery, usage limits.
9. KrePay — invoices, collection, payment status, refunds, commissions, transfers, payouts, reconciliation.
10. Everything else — community, messaging, notifications, Near You, Spotlight, integrations, subscriptions, paywalls, analytics, and features found outside the categories above.

## How the audit runs

- Parallel investigation agents, one per section, each reading routes, components, backend functions and database objects for its area and reporting file-level evidence.
- Database-side checks are read-only queries: table presence, row-level security policies, whether tables hold real rows or are empty scaffolding.
- Runtime checks drive the running app for the highest-traffic flows (Passport, Today, Studio, Scout, KrePay surfaces) to separate "renders" from "works".
- Findings are merged into the single document, with conflicts between code and runtime evidence reported rather than smoothed over.

## Technical notes

- Read-only throughout: no migrations, no function deploys, no writes, no publish.
- Audit scratch work stays outside the source tree; only the final markdown document is added.
- Expect the document to be long — it is a register, not a highlight reel.
