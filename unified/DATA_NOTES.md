# Data notes

## Source consolidation

The merged app received two additional timetable ZIP bundles. Both bundles contained the same ten PDF files already included with Roomwise and the Attendance Predictor. They were byte-identical to the existing source files, so only one canonical set is retained under `public/timetables/`.

## Attendance schedule generation

Roomwise stores occupancy records at the room level. A split laboratory class can therefore appear twice at the same time because both possible room venues are conservatively blocked. Attendance planning must not count that as two academic classes.

The merged `data/timetable.dataset.json` groups Roomwise records by:
- section,
- weekday,
- start time,
- end time,
- timetable label,
- source PDF.

All room records within one group become a single academic timetable slot, with the room names joined for display.

## Subject naming

The structured Roomwise records include labels such as `A`, `B`, `C`, `LAB`, `MPMC LAB`, and `BIO DSP LAB`. The merge does not infer unknown full course names. Single-letter entries are surfaced as `Timetable code A`, etc.

## Academic calendar

The attendance planning calendar is configuration, not evidence extracted from the supplied room timetable PDFs. Verify semester boundaries, holidays, and working Saturdays before using future-class totals for high-stakes decisions.
