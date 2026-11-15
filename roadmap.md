# Dashboard monitoring presentation
- [ ] Replace divider-style metrics with consistent icon-led, status-accented cards across Management Overview, Customer Success and Execution; verify phone/desktop and retain all counts/actions.
- [x] Improve the manager dashboard hierarchy, searchable/expandable action queue, stored deadlines/owners and mobile layout using existing data only; retain customer-risk, delivery, execution, upcoming work, pipeline and AMC monitoring.
- [x] Thirty-six regression tests pass; signed-in manager checks cover nine real report actions, search/clear, risk filters, show-all, report navigation, Today/Month and all three views; desktop and 552/390px phone layouts have no page overflow or runtime errors, and build is clean. Engineer dashboards and live records unchanged; physical device alerts remain blocked separately below.

# Engineers monitoring presentation
- [x] Add team overview, searchable role-specific monitoring, focused account management and clearer activity views; fleet/report detail remains expandable.
- [x] Preserve non-manager Workload-only access and existing approval/work rules; reuse execScope for multi-engineer jobs and standalone site visits.
- [x] Twenty-five regression tests pass; real manager checks show four engineer cards, two Execution cards, search filtering, 80 activity entries, approved account search, edit cancellation and Workload; desktop/phone checked without runtime errors. No account or work records changed.

# Access Control presentation
- [x] Reorganize existing dashboard, module, reminder, handoff and history settings with role-focused views and phone-friendly controls.
- [x] Add permission summary, search/status filtering and review-before-save without changing enforcement rules.
- [x] Sixteen regression tests pass; signed-in manager checks cover all categories, real draft review/discard, role/search filtering and handoff reversal; desktop/phone checked with no runtime errors and clean build. No live permissions changed.

# Device notifications
- [x] Move device controls to Settings for every approved account; automatically reconnect allowed devices without prompting again.
- [x] Send saved ticket/reminder/message alerts to authorized recipients; signed-in test alert and real saved plant message each accepted by one device service, without errors; test message removed.
- [x] Twenty-five focused tests pass; manager desktop/phone Settings and Bell checked, clean build. Isha, Laxmi and Abhisek have no registered devices.
- [ ] Confirm physical phone/laptop banners for every account — requires each unregistered device to grant permission in the published portal, publication of these changes, and recipient confirmation. Engineer live Settings views remain unverified.

# Ticket status filter
- [x] Default to exact Open status, remove duplicate Open option and keep details within the filtered list.
- [x] Fifteen regression tests pass; signed-in checks confirm one Open option, 6 Responded tickets, 41 Closed tickets, 47 under All, no out-of-filter details, and Open after reopening; desktop/mobile checked with no runtime errors.

# Exhibition opportunities
- [x] Add Exhibition type and save exhibition name/location with each opportunity; show in details and search.
- [x] Verify storage columns, mapping tests (7 checks passed), and clean build.
- [ ] Signed-in form/save/read-back check — blocked: no portal account matches the requesting user's email; user must sign in to the preview.

# Approved WFH workload
- [x] Diagnose Isha and Laxmi's approved requests and overlapping leave.
- [x] Make approved WFH replace leave on overlapping working days without removing unrelated leave dates; preserve original requests for history.
- [x] 32 regression tests passed; signed-in desktop/reload/phone checks show both WFH on November 13, 2 WFH days and 0 leave days, with no runtime errors.

# Demo expiry and AMC separation
- [x] Exclude demo plants from AMC renewal indicators and dashboard counts.
- [x] Add demo-end reminders through existing Daily Work, with quotation/order follow-up links.
- [x] Eleven tests pass; signed-in save, reload, Upcoming read-back, duplicate prevention, mobile display and test-reminder cleanup verified.

# Customer contacts
- [x] Add plant-linked contact storage with protected access.
- [x] Add searchable phonebook and plant contact management.
- [x] Connect saved contacts to MOM attendees and communications.
- [x] Run tests and verify saving and reading contacts; desktop/mobile checks passed. Separate MOM/communication walkthrough remains unverified.

# Contact list export
- [x] Export the contacts currently shown as a CSV file.
- [x] Verify the downloaded file matches the on-screen filter and stays readable in Excel.

# Contact CSV import
- [x] Add upload, column matching and editable record preview.
- [x] Flag duplicates and missing details before protected batch saving.
- [x] Test parsing and validation (48 tests pass); signed-in save/read-back and duplicate warnings verified; temporary contact removed.

# Plant technical register
- [x] Areas, machines, measurement points, sensors, gateways with history (issue / resolve / replace / move), search, totals, CSV export, fault history from tickets.
- [ ] Bulk import (CSV/XLSX) with validation preview.
- [ ] Ticket form picking machine/point/sensor from the register; "View previous analysis" in tickets.
- [ ] Execution job → "Update Plant Technical Register".

# Execution multiple engineers
- [x] Database stores several engineers per job; all of them can edit.
- [ ] Multi-select in job form and counts across lists/workload.

# DFPCL K-1 import timeout
- [x] Reproduce the uploaded 152-row import with the requesting account.
- [x] Replace repeated row-by-row database operations with atomic bulk inserts, preserving access rules and history.
- [x] Verify the exact file saves, reads back, and safely skips existing sensors on repeat import; 7 areas, 43 machines and 152 points/sensors confirmed; 11 focused tests pass.

# Holiday names and dates persistence
- [x] Reproduce named-holiday save, reopen and reload behavior with a manager login.
- [x] Fix date/name persistence without changing workload access rules.
- [x] Add regression coverage and verify add, save, reload, rename, second reload and cleanup in the real settings screen; 119 tests pass.
