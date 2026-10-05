# Strict role separation: Manager / Customer Success Engineer / Execution Engineer

No rebuild and no data deletion. Existing records keep working. Every existing task, reminder and chat is treated as Customer Success work unless it is clearly Execution work.

## What each person will see

| Area | Manager | Customer Success (Isha, Laxmi) | Execution (Abhisek) |
|---|---|---|---|
| Dashboard | Both sides, with an All / Customer Success / Execution switch | Current CS dashboard, own data only | New "My Execution Dashboard" |
| Daily Work | Both kinds of work | CS tasks and reminders only | Execution tasks and reminders only |
| Discussion & Tickets | All | CS plant chats and their own tickets | Only chats for their own execution jobs |
| Visits / Reports | Yes | Yes | Hidden, and blocked if the address is typed in directly |
| Plants | Yes | Yes | Only basic details (customer, location, contact) for plants on their jobs |
| Execution | Yes | Hidden and blocked | Only their own jobs and schedule |
| Engineers | Yes | No | No |

Top-bar alerts follow the same rules. The overdue-reports alert, unread count, tickets and bell alerts each count only what that person is allowed to see.

## My Execution Dashboard (for Abhisek)
- **Cards:** Visits This Month (site visits from his jobs), Upcoming, In Progress, Pending, Completed This Month, Overdue.
- **Sections, in this order:** Current / Next Execution with an Open Job button, then Needs My Attention (pending jobs, missing daily update, AIP sheet pending, customer confirmation), then My Upcoming Execution, then My Jobs, then Recent Updates.

## Technical details
- **Role source:** add an `execution_engineer` role to the `app_role` enum and give it to everyone whose engineer role is `execution`, including Abhisek. Add a `user_domain(uid)` helper that returns `manager`, `customer_success` or `execution`.
- **Domain columns:** add `work_domain` (default `customer_success`) to tasks, reminders, day_closures and messages. Messages for execution job threads get `execution`.
- **Database rules:**
  - visits, reports, recurring_reports, daily_updates and tickets: readable by approved manager or Customer Success users only.
  - execution_*: manager, or the execution engineer assigned to the job (primary or secondary) only.
  - tasks, reminders, day_closures and messages: the row's domain must match the user's domain, and the manager sees everything.
  - plants: Customer Success users and the manager see all plants. Execution engineers see only plants linked to their jobs, through a reduced view.
- **App:** the sidebar and phone menu are built from the user's domain. The visits, reports and execution pages redirect unauthorized users to the dashboard. The store skips loading data the user isn't allowed to see. New tasks, reminders and messages are stamped with the creator's domain.
- **Execution chat:** each job gets its own chat thread (`exec:<jobId>`), shared by the assigned engineers and the manager.
- **Verification:** sign in as Isha, Abhisek and the manager. Check the menus, try opening blocked pages directly, and confirm the counts.
