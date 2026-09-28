# Roomwise Student Hub

A single full-stack Next.js application that combines:

1. **Roomwise** — live classroom availability, visual building map, countdown timers, room claims, and WhatsApp squad sharing.
2. **Attendance Predictor** — subject-wise attendance tracking, 75% / 90% planning, upcoming timetable, leave simulation, and a local rule-based attendance advisor.

The two modules now share the same timetable foundation instead of running as separate demos.

## What changed in this merged build

- One Next.js application and one deployment URL.
- Shared navigation between Overview, Room Finder, and Attendance.
- Roomwise timetable data is the canonical structured schedule source.
- Attendance section schedules are generated from those same room/event records.
- Split-lab entries that block two rooms are **deduplicated into one academic class** for attendance calculations.
- Attendance course names are not guessed. Single-letter source entries are shown as `Timetable code A`, `Timetable code B`, etc.
- Student attendance counts are stored only in that browser's `localStorage`.
- Shared room metadata and active room claims are stored server-side in `server-data/`.
- Room claims automatically expire at the room's next listed class.
- WhatsApp sharing creates a message such as: `📍 Heading to IST 509. It's free until 2:30 PM. Come fast!`
- The visual map refreshes every 10 seconds and countdowns tick every second.

## Run in VS Code

Requirements:
- Node.js 20 or newer
- npm

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Main pages:
- `/` — unified overview
- `/rooms` — Roomwise room finder and live map
- `/attendance` — Attendance Predictor
- `/api/health` — health check

## Production build

```bash
npm run build
npm start
```

## Tests / validation

The repository includes a data-integrity check that verifies the merged timetable model:

```bash
npm run test:data
```

It checks:
- expected tracked-room count,
- expected Roomwise occupancy-record count,
- nine current 2026–27 sections,
- deduplicated academic slots,
- subject references.

You can also run:

```bash
npm run typecheck
```

once dependencies are installed.

## Data model

### `data/roomwise.data.json`
The structured room/occupancy model used by Roomwise. It contains:
- 14 tracked venues,
- 262 room occupancy records,
- source timetable references,
- room coverage metadata.

### `data/timetable.dataset.json`
A merged attendance-planning dataset generated from the Roomwise records. It contains:
- nine active 2026–27 sections,
- section-scoped timetable codes,
- deduplicated class slots,
- room names for each class,
- a configurable semester planning calendar.

### `public/timetables/`
One canonical copy of each supplied timetable PDF.

## Important data limitations

- The supplied timetable records are recurring weekly schedules. They do not by themselves prove room access, cancellations, ad-hoc classes, or special events.
- The PDFs do not provide confirmed Roomwise floor / AC / room-capacity metadata in the structured source used here. The Room Finder therefore keeps those fields unknown until a user enters confirmed details.
- The visual map groups numeric room codes by their first digit for navigation only. That visual grouping is **not treated as verified floor metadata** by search.
- The Attendance Predictor uses the supplied source labels. It does not invent full subject names when the Roomwise data only contains `A`, `B`, `C`, etc.
- Semester dates, holidays, and working Saturdays are planning configuration. Verify them with the institution before relying on future-class counts.
- Attendance results are planning aids, not official academic determinations.

## Persistence

### Attendance counts
Saved in browser `localStorage` per section. They are private to that browser/device and are not posted to the server.

### Room claims and room metadata
Stored in:
- `server-data/claims.json`
- `server-data/room-details.json`

This is suitable for a hackathon/demo deployment running as a single Node instance. On hosting platforms with ephemeral filesystems, these files may reset on restart or redeploy. For production, replace this storage adapter with PostgreSQL, Supabase, Firebase, Redis, or another shared database.

## Deploy as one live link

### Render
A `render.yaml` is included. Connect the repository to Render and create the web service. The service runs the single Next.js application, so all modules are available under one URL.

For persistent claims/metadata across restarts, add a persistent disk or move those two JSON stores to a hosted database.

### Docker

```bash
docker build -t roomwise-student-hub .
docker run -p 3000:3000 roomwise-student-hub
```

Then open `http://localhost:3000`.

## API summary

Roomwise:
- `GET /api/roomwise/data`
- `GET /api/roomwise/live`
- `POST /api/roomwise/search`
- `POST /api/roomwise/claims`
- `DELETE /api/roomwise/claims/:claimId`
- `GET /api/roomwise/metadata`
- `PUT /api/roomwise/metadata`

Attendance:
- `GET /api/sections`
- `GET /api/sections/:sectionId/subjects`
- `GET /api/sections/:sectionId/timetable`
- `POST /api/projections`

## Why the extra uploaded ZIPs are not treated as a separate database

The two additional uploaded ZIPs contain the same ten timetable PDFs already present in the projects. Their file hashes match the existing source PDFs, so the merged app keeps only one canonical copy rather than duplicating them.

## Chatbot reliability update

The Attendance Advisor now keeps chat history while dashboard values refresh, remembers the last subject for follow-up questions, understands timetable/tomorrow/next-class questions, supports "if I miss X classes" and "how many can I miss" scenarios, and gives clearer fallback messages when attendance inputs are missing.
