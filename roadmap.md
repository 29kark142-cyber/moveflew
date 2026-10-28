# Northwest Moving Crew migration

## Crew onboarding refresh
- [x] Verify safe invitation revocation, toast feedback, and pending-only actions.
- [x] Refresh the branded invitation card, mobile and dark appearance, fields and loading/error states.
- [x] Support /invite/:token alongside /join-crew and verify registration saves a worker and opens /app/field.

- [x] Phase 1a: design, marketing pages, contact form
- [x] Phase 1b: Cloud login, workspaces + core records API (customers, jobs, trucks, crew, reminders, pricing, members), workspace shell mounted
- [ ] Phase 2: verify signed-in flow; pipeline, tariffs, dispatch timeline, storage, billing, reports APIs; teammate invites
- [ ] Phase 3: workers/payroll, storage/warehouse, billing, claims, tariffs
- [ ] Phase 4: messaging (Twilio/SendGrid), Stripe payments, QuickBooks, automation, engagement
- [ ] Phase 5: public token pages, webhooks, schedules
- [ ] Phase 6: import records + users, verify (blocked on data export)

## Master update (Oct 28)
- [x] Cancelled/declined excluded from revenue + open opportunities
- [x] Admin-only job/estimate delete with confirmation
- [x] Mobile wrapping for links/table cells
- [x] Direct URLs / reloads under /app work (no 404)
- [x] Worker invites (/join-crew links + email) with Driver/Helper/Crew Lead roles
- [ ] Phone SMS login (blocked: needs SMS provider choice)
- [x] Google Maps drive time (base→pickup→drop-off→base) + workspace travel/fuel rules with per-estimate override; onboarding prompt for base address not added
- [x] Public quote intake with credential-scoped workspace delivery, idempotency, validation, and Leads read-back verified; /api/public/v1/quotes is canonical, /api/v1/public/quotes is a compatibility alias
- [ ] Connect northwestmovingcrew.com production form (blocked: external website access and publishing)
- [x] Customer-visible proposal snapshots, share links and persisted digital signatures verified
- [x] Stripe deposit checkout (amount from stored proposal) + webhook → booked (live only); test payment untried
- [x] Workspace fixed/percentage deposit settings and office proposal-level override with calculation tests
- [ ] Move storage vaults, timecards, invoices to dedicated tables
- [x] Website Integration Hub (/app/settings/integrations): widget, form webhooks, API keys
- [x] CrewAI Assistant floating copilot on /app/* (help + navigation links, role/workspace-scoped)
