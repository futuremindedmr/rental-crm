---
name: date-fns format() crashes on corrupted date strings
description: Why a single bad date value in a text column can take down an entire CRM page, and the defensive pattern to prevent it.
---

date-fns `format(new Date(value), fmt)` throws a **RangeError: "Invalid time value"** when `new Date(value)` is an Invalid Date. In React this throws during render with no error boundary, so one corrupted value crashes the WHOLE page, not just the cell.

**Why this matters:** several date columns in this CRM are `text` (not real `date`/`timestamp`) — e.g. `rentals.start_date` / `rentals.end_date`. The rental edit form builds `end_date` as `<month-input>-01`, so a bad month entry persists an unparseable string (a real incident: `"11/30/36-01"` crashed a client profile on open). Text columns accept anything; assume any persisted date string may be malformed.

**How to apply:**
- Never call date-fns `format(new Date(x), ...)` directly on persisted values in render. Use the shared helpers in `artifacts/crm/src/lib/utils.ts`: `safeFormatDate(value, fmt, fallback="—")` for display and `toDateInputValue(value)` for prefilling `<input type=date>`. Both guard `isNaN(date.getTime())` and never throw.
- The same crash class hides in non-render conversions too (e.g. `new Date(x).toISOString()` in form-prefill handlers) — guard those as well.
- Server-side: prefer validating/normalizing date fields before write so malformed strings never land in text columns in the first place.
