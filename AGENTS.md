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
- Customer visits live in public.visits via src/lib/visits.ts (own small store, loaded on first use); completing an AMC visit creates the next visit row — keeps the big store untouched.
- MOM sign-off is a per-visit cloud field and is opt-in; PDF generation keeps its two-party signature section together on one page — preserves each MOM's approval requirement and print layout.
- Visits, Reports and Plants screens give engineers the same full access as the manager (user request); Engineers screen and approvals stay manager-only.
- Daily Work reminders and close-day summaries live in public.reminders / public.day_closures via src/lib/dailywork.ts (own small store); tasks keep one record across days (task_date moves, original_date and carry_forward_count preserved) — avoids duplicate carry-forward rows.
- Execution module data lives in public.execution_* tables via src/lib/execution.ts (own small store); daily updates and activity are separate rows per job — keeps multi-day history accurate.
- Role domains come from the database `user_domain(uid)` helper (manager / customer_success / execution) and gate both RLS and UI: execution_* tables are visible to manager + assigned execution engineers only; visits/reports/recurring/daily_updates/tickets to manager + customer_success; tasks/reminders/day_closures/messages carry work_domain and filter by it. The login gate resolves the domain once (src/routes/_authenticated/route.tsx → src/lib/domain.ts); sidebar, top-bar pills, dashboard and route guards all read it — never re-derive role from the engineers table in the UI.
- Plant commercial ownership lives in public.ho_division_kams / branches / sales_engineers via src/lib/branches.ts; plants store only branch_id + sales_engineer_id and derive RM/KAM, with DB triggers writing public.ownership_audit — one central mapping, history never overwritten.
- Customer Communication records live in public.customer_communications via src/lib/comms.ts (own small store; manager + customer_success only in RLS); edits append to the row's history jsonb and follow-ups reuse Daily Work tasks/reminders by linked id — no parallel task system.
- Report visibility/counting goes through scopedReports / scopedRecurring / activeReports in src/lib/store.ts, covered by src/lib/__tests__/report-scoping.test.ts (bun run test) — keeps top bar, Dashboard, Register and Recurring Settings in agreement for report counting.
- End-to-end role-scoping check lives in e2e/report_scoping_e2e.py (bun run test:e2e) and takes accounts from E2E_* env vars or saved session files — credentials never live in the repo.
- Manager Dashboard has three views (Management Overview / Customer Success / Execution) in src/components/console/ManagerDashboard.tsx, selected via ?view= on /; it only reads existing stores — engineers keep their own dashboards.
- Leads & Opportunities live in public.opportunities / opportunity_activity via src/lib/opportunities.ts (own small store); manager sees all, others only rows they created; handovers create real execution_jobs linked by related_execution_job_id and a DB trigger moves the opportunity on job completion — one connected lifecycle, no duplicate records.
- Engineers → Workload (src/components/console/Workload.tsx) is a read-only planning layer over tasks, reports, visits, comms and execution jobs; levels only appear when public.workload_settings thresholds are set (Settings → Workload) — no scoring from arbitrary numbers.
- Workload day types (Office / Site / Holiday work / Leave / Off) are derived in src/components/console/Workload.tsx from visits, execution job dates, public.engineer_leaves and workload_settings non-working days (default Sat+Sun) — no separate attendance records.
- Standalone Execution site visits (factory inspection, sensor collection, etc.) live in public.execution_site_visits via src/lib/execution.ts; they count as Site days in Workload and in the manager Execution view, with an optional related_job_id — avoids fake jobs for non-job visits.
