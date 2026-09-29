# Compact Reports Page

## Approach
Use two clear tabs directly below the page heading and KPI cards:

- **Report Register** — default tab, opens first on every visit and shows the existing report filters, search, register, and Create Report action.
- **Recurring Settings** — opens only when selected and shows the recurring schedule form and schedule list.

This keeps daily report tracking visible without scrolling past setup controls, while recurring schedules remain easy to find when changes are needed.

## Changes
- Move the Report Register above recurring schedules by making it the default tab.
- Add a compact **Report Register / Recurring Settings** tab switch with schedule count and report count.
- Show only the selected tab’s content, reducing page height and unnecessary scrolling.
- Keep all existing filters, report creation, category counts, status updates, recurring schedule controls, access, and cloud data unchanged.
- Verify both tabs and the existing report filters on desktop and mobile.

## Technical details
- Keep the change limited to the Reports screen and existing recurring-report component.
- Preserve the current shared Total / Order / Demo filter behavior and all existing report logic.
