# Hard-coded data notes

Source reviewed: the two user-supplied ZIP folders containing 10 timetable PDFs each. The two ZIPs are byte-for-byte duplicate timetable sets.

## What is genuinely sourced from the PDFs

- section/year/semester
- subject slot letters
- subject codes
- subject names
- faculty names where listed
- credit pattern where listed
- class times
- room/lab locations
- weekly timetable structure

## What is not in those ZIPs

There is no student-specific attendance ledger containing attended/absent counts. To satisfy the zero-manual-entry demo requirement, the app ships `data/preloaded-attendance.json` with conducted counts derived from the timetable through 2026-09-28 15:22 IST and initializes attended equal to conducted.

Those starting attendance values are a demo baseline, not an official student record. Users may edit them in the attendance table and edits are stored locally in the browser by section.
