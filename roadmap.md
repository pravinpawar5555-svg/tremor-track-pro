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
