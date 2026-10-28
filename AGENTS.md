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
- Shared domain logic from the source app lives in src/shared (alias @shared/*); server code must be rewritten as server functions, not copied from the old Express server.
- Both crew invitation routes render one shared onboarding form with locally scoped semantic theme tokens; registration uses an authenticated atomic RPC so the worker is saved before workspace selection and field navigation.
- External website quote delivery uses /api/public/v1/quotes; /api/v1/public/quotes is a compatibility alias because only /api/public/* bypasses hosted site authentication.
- Quote intake credentials are workspace-scoped, stored only as hashes, and revealed once to an authenticated admin; external forms must relay from their server, never expose credentials in browser code.
- Published proposals store immutable customer-visible snapshots and separate signatures; deposits derive from workspace configuration or explicit office overrides, never client-supplied checkout amounts.
- Test and live deposit payments remain separate; only verified live payments may book production CRM jobs.
- Release housekeeping lives in src/lib/app-version.ts: per-build one-time cleanup of nwcrewcrm.* settings (never sign-in/theme/language) and a stale-tab Refresh banner; no service worker or auto-reload, because Lovable already revalidates HTML and reload loops break the preview.
- Third-party lead intake uses per-workspace integration keys (hashed; widget/webhook tokens visible to admins, API keys shown once) via /api/public/v1/leads and /api/public/v1/hooks/$token; the older single-credential /api/public/v1/quotes stays for northwestmovingcrew.com.
