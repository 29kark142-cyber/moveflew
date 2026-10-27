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
