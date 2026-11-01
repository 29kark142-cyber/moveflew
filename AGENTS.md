<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Migrated Manus pages live in src/pages and import navigation from @/lib/wouter, a shim over TanStack Router; keep routes in src/routes so there is one router.
- SaaS marketing routes use SaasLayout, a separate MoveGridBrand component and locally scoped .saas-site tokens; legacy public pages retain PublicLayout and Brand so SaaS branding does not change moving-service pages or CRM styling.
- Homepage feature previews are static illustrative UI in MoveGridFeaturePreview, themed under .movegrid-home; never read real tenant records for public marketing examples. Why: public product previews must not expose customer data or change workspace settings.
- Shared domain logic from the source app lives in src/shared (alias @shared/*); server code must be rewritten as server functions, not copied from the old Express server.
- Both crew invitation routes render one shared onboarding form with locally scoped semantic theme tokens; registration uses an authenticated atomic RPC so the worker is saved before workspace selection and field navigation.
- Crew acceptance derives operational roles from the stored invitation or manager-owned candidate, never the caller's role argument; restrictive roster policies block direct crew INSERT/UPDATE, including changing a record into a crew row. Why: field privileges must remain manager-controlled.
- External website quote delivery uses /api/public/v1/quotes; /api/v1/public/quotes is a compatibility alias because only /api/public/* bypasses hosted site authentication.
- Quote intake credentials are workspace-scoped, stored only as hashes, and revealed once to an authenticated admin; external forms must relay from their server, never expose credentials in browser code.
- Published proposals store immutable customer-visible snapshots and separate signatures; deposits derive from workspace configuration or explicit office overrides, never client-supplied checkout amounts.
- Test and live deposit payments remain separate; only verified live payments may book production CRM jobs.
- Intake requests share an atomic database-backed rolling IP limiter before validation; only edge client-IP metadata is trusted, with a conservative shared bucket when absent. Why: aliases and parallel requests must not bypass limits.
- Manual test booking is a preview-host-checked, admin-only server operation with atomic job/proposal approval and explicit audit metadata, never fabricated signatures or payment receipts. Why: preview and production share records.
- Release housekeeping lives in src/lib/app-version.ts: per-build one-time cleanup of nwcrewcrm.* settings (never sign-in/theme/language) and a stale-tab Refresh banner; no auto-reload. Field-only offline support uses a generated, preview-guarded PWA worker, never auth/API response caching. Why: stale app-shell workers must not affect preview or the rest of the CRM.
- Field drafts and pending operations live in user/workspace-scoped IndexedDB with ordered foreground replay, retained failures, stable operation IDs and a sync lock; legacy unscoped data is never read or replayed. Why: shared phones must not leak records across sessions.
- Final field sign-off atomically locks an immutable document snapshot, then renders a multilingual PDF with embedded signatures/photos into private storage; downloads recheck assigned-job access. Why: invoices must remain auditable and crew access must stay scoped.
- Third-party lead intake uses per-workspace integration keys (hashed; widget/webhook tokens visible to admins, API keys shown once) via /api/public/v1/leads and /api/public/v1/hooks/$token; the older single-credential /api/public/v1/quotes stays for northwestmovingcrew.com.
- The in-app CrewAI copilot streams from the /api/copilot server route via the Lovable AI Gateway SDK; it verifies the bearer and workspace role server-side, has no CRM data access, and renders only whitelisted [[go:/app/...|Label]] links from src/lib/copilot-routes.ts; src/lib/copilot-guard.ts refuses injection, secret, cross-tenant and (for non-super-admins) platform questions before the model is called, with super-admin status read via is_platform_admin() as the caller.
- Test-mode deposits book a job only when checkout started on a preview address (host read server-side, stored on the checkout); live-mode deposits always book. Why: preview and production share one database.
- Dispatch overlap/readiness rules live in src/shared/dispatch.ts and are used by both the board (warnings) and POST /api/crm/jobs/:id/assign (enforcement, 409 on conflict). Why: one rule, no drift between UI and server.
- Move-day field work goes through /api/crm/field/* (src/server/field-api.ts) using stage/billing rules in src/shared/field.ts; crew-role members cannot edit jobs or customers directly, and row security (can_access_record) shows them only jobs they're assigned to. Why: crew must only see and change their own jobs, and card payments are confirmed with Stripe server-side, never by the phone.
- Subscription plans and limits live in the subscription_plans table; workspace billing fields change only via service role (trigger), and past_due/canceled workspaces are read-only through restrictive record policies plus a 402 in the CRM API. Why: tiers stay configurable without code changes and enforcement can't be bypassed from the browser.
- Platform super-admins are rows in public.platform_admins (checked via is_platform_admin()); /admin/platform server functions verify that as the caller before using the service client, support inspection is read-only, and suspended = non-writable status. Why: no client-side or email-based privilege checks.
