# Exhibition opportunities
- [x] Add Exhibition type and save exhibition name/location with each opportunity; show in details and search.
- [x] Verify storage columns, mapping tests (7 checks passed), and clean build.
- [ ] Signed-in form/save/read-back check — blocked: no portal account matches the requesting user's email; user must sign in to the preview.

# Demo expiry and AMC separation
- [ ] Exclude demo plants from AMC renewal indicators and dashboard counts.
- [ ] Add demo-end reminders through existing Daily Work, with quotation/order follow-up links.
- [ ] Test category rules and verify the signed-in reminder flow.

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
