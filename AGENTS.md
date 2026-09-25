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
- Auth: portal screens live under src/routes/_authenticated; the gate also requires profiles.status='approved' and reads the role from user_roles — manager approval is enforced in the database (is_approved/has_role in RLS, review_user RPC).
- Store (src/lib/store.ts) loads only after startSession(); housekeeping() carries unfinished tasks to today and generates reports from recurring_reports — keeps the client-side store pattern without a scheduler.
