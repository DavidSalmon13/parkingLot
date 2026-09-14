# Parking Lot Management Web App — Technical Specification

Version: 1.0
Status: Approved for implementation

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Models](#2-data-models)
3. [API Design](#3-api-design)
4. [Frontend Architecture](#4-frontend-architecture)
5. [UX Flows](#5-ux-flows)
6. [Real-Time Strategy](#6-real-time-strategy)
7. [Edge Cases](#7-edge-cases)
8. [Performance Considerations](#8-performance-considerations)
9. [Security Considerations](#9-security-considerations)
10. [Future Improvements](#10-future-improvements)

---

## 1. System Architecture

### 1.1 Overview

The system is a single-page application (SPA) that gives employees a live, always-visible dashboard of every parking lot and every spot within it, so that the location of any parked car (which lot, which spot) is answerable at a glance, without clicking.

```
┌─────────────────────────┐        REST (HTTPS)        ┌──────────────────────────┐
│   React SPA (frontend)  │ ─────────────────────────► │  Spring Boot API (backend)│
│   - Dashboard, Admin UI │ ◄───────────────────────── │  - REST controllers       │
│                         │                             │  - Business/service layer│
│                         │        WebSocket (STOMP)    │  - Spring Data JPA        │
│                         │ ◄───────────────────────── │  - Spring Security (open) │
└─────────────────────────┘                             │  - Rate limiter (bucket)  │
                                                          └───────────┬──────────────┘
                                                                      │ JDBC
                                                                      ▼
                                                          ┌──────────────────────────┐
                                                          │   PostgreSQL             │
                                                          │   (Railway managed)      │
                                                          └──────────────────────────┘
```

### 1.2 Stack Selection

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model fits a grid-of-grids dashboard; TypeScript catches shape mismatches against the API contract at compile time. |
| Styling | Tailwind CSS | Utility classes make consistent color-coding (green/red) and per-lot grid layout fast to build and easy to keep visually uniform across lots. |
| Frontend state | Zustand | Single lightweight global store for lots/spots/cars that both REST responses and WebSocket events write into — far less ceremony than Redux for this size of app. |
| Data fetching | TanStack Query | Handles initial REST fetch, caching, and the ~30s polling-fallback refetch interval declaratively. |
| Backend | Java 21 + Spring Boot 3.x | Team-specified. Spring Data JPA gives declarative repositories over Postgres; Spring WebSocket/STOMP gives first-class real-time support; Spring Security gives a pre-wired path to add auth later without re-architecting. |
| Database | PostgreSQL 15+ | Relational integrity (FKs, partial unique constraints) directly enforces the domain invariants: one active assignment per spot, one car per 6-char ID, no orphaned spots. |
| Real-time transport | STOMP over WebSocket (SockJS fallback) | Native to Spring; brokers pub/sub topics per lot (or one global topic — see §6) so every connected dashboard gets pushed updates immediately. |
| Deployment | Railway, 3 services | `parkinglot-frontend` (static site), `parkinglot-api` (Spring Boot container), `parkinglot-db` (managed Postgres plugin). Decoupled so frontend and backend redeploy/rollback independently. |

### 1.3 Deployment Topology (Railway)

- **`parkinglot-frontend`**: static build output (`npm run build`) served via Railway's static hosting (or Nginx buildpack). Environment variable `VITE_API_BASE_URL` / `VITE_WS_URL` point at the backend service's public Railway URL.
- **`parkinglot-api`**: Dockerized Spring Boot app (`Dockerfile` with a multi-stage Maven build). Reads `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` injected by Railway's Postgres plugin. Exposes `PORT` per Railway convention.
- **`parkinglot-db`**: Railway's managed PostgreSQL plugin, attached to `parkinglot-api` via Railway's service variable references.
- CORS on the backend allows the frontend service's origin (configured via `CORS_ALLOWED_ORIGIN` env var) since frontend and backend are on different origins.
- No login in v1 — see §9 for the security posture this implies and the safeguards in place regardless.

---

## 2. Data Models

Four entities. `Car` and `ParkingSpot` are decoupled — a car's current location is *derived*, not stored directly on the car — via `CarAssignment`, which also doubles as the history log.

### 2.1 `ParkingLot`

| Field | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, generated |
| `name` | `varchar(100)` | NOT NULL, UNIQUE |
| `rowLabels` | `varchar(50)[]` | e.g. `["A","B","C"]` — the row structure used at last grid generation; informational, editable independently of actual spots |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()`, updated on write |

Relationships: one `ParkingLot` has many `ParkingSpot` (`ON DELETE RESTRICT` — see §7.4).

### 2.2 `ParkingSpot`

| Field | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, generated |
| `lotId` | `UUID` | FK → `ParkingLot.id`, NOT NULL |
| `label` | `varchar(20)` | NOT NULL — e.g. `A1`, `B12`; UNIQUE within `(lotId, label)` |
| `row` | `varchar(10)` | NOT NULL — e.g. `A` (used for grid rendering) |
| `position` | `int` | NOT NULL — ordinal within the row, for consistent grid ordering |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` |

Status (`available` / `occupied`) is **not** a stored column — it's derived at read-time from whether an active `CarAssignment` exists for the spot (`removedAt IS NULL`). This avoids a dual-source-of-truth bug where the flag and the assignment could disagree.

Unique constraint: `UNIQUE (lot_id, label)`.

### 2.3 `Car`

| Field | Type | Constraints |
|---|---|---|
| `id` | `varchar(6)` | PK — the 6-character car ID exactly as entered by the user; no charset restriction, case-sensitive, exactly 6 characters |
| `ownerName` | `varchar(100)` | NOT NULL |
| `employeeId` | `varchar(50)` | NOT NULL |
| `phoneNumber` | `varchar(30)` | nullable |
| `notes` | `varchar(500)` | nullable |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()`, updated on write |

A `Car` row persists indefinitely once created, independent of whether it's currently parked anywhere — this lets the "existing car" assignment flow work with just the ID, no metadata re-entry.

### 2.4 `CarAssignment`

The join entity that both represents "this car is currently in this spot" (when `removedAt IS NULL`) and the historical log of every parking session.

| Field | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, generated |
| `carId` | `varchar(6)` | FK → `Car.id`, NOT NULL |
| `spotId` | `UUID` | FK → `ParkingSpot.id`, NOT NULL |
| `assignedAt` | `timestamptz` | NOT NULL, default `now()` |
| `removedAt` | `timestamptz` | nullable — NULL means the assignment is currently active |
| `createdByUserId` | `UUID` | nullable — unused in v1, reserved for future auth (see §10) |
| `removedByUserId` | `UUID` | nullable — unused in v1, reserved for future auth |

**Critical constraint** (enforces "one active car per spot" and prevents the concurrent-assignment race condition at the DB level, not just in application code):

```sql
CREATE UNIQUE INDEX uq_car_assignments_active_spot
  ON car_assignments (spot_id)
  WHERE removed_at IS NULL;
```

A second constraint enforces "a car can only be actively parked in one place":

```sql
CREATE UNIQUE INDEX uq_car_assignments_active_car
  ON car_assignments (car_id)
  WHERE removed_at IS NULL;
```

Supporting indexes:

```sql
CREATE INDEX idx_car_assignments_car_id ON car_assignments (car_id);
CREATE INDEX idx_car_assignments_spot_id ON car_assignments (spot_id);
```

### 2.5 Entity-Relationship Summary

```
ParkingLot (1) ───< (many) ParkingSpot (1) ───< (0 or 1 active) CarAssignment (many) >─── (1) Car
```

A spot's "current car" (if any) = the `CarAssignment` for that `spotId` where `removedAt IS NULL`, joined to `Car`.

---

## 3. API Design

Base URL: `/api`. All request/response bodies are JSON. All timestamps are ISO-8601 UTC.

### 3.1 `GET /api/lots`

Returns every lot with its spots and, for occupied spots, a summary of the current car. This is the single call that hydrates the entire dashboard.

**Request**: none.

**Response `200`**:
```json
[
  {
    "id": "b3f1...",
    "name": "North Garage",
    "rowLabels": ["A", "B"],
    "spots": [
      {
        "id": "a1c2...",
        "label": "A1",
        "row": "A",
        "position": 1,
        "status": "occupied",
        "car": { "id": "ABC123", "ownerName": "Jane Doe" }
      },
      {
        "id": "a1c3...",
        "label": "A2",
        "row": "A",
        "position": 2,
        "status": "available",
        "car": null
      }
    ]
  }
]
```

### 3.2 `POST /api/lots`

Creates a lot, optionally bulk-generating its spot grid in the same call.

**Request**:
```json
{
  "name": "North Garage",
  "grid": { "rows": [{ "label": "A", "count": 10 }, { "label": "B", "count": 15 }] }
}
```
`grid` is optional — omit it to create an empty lot and add spots later via §3.4/3.5. Each row picks its own spot count (added one row at a time in the UI — see §5.7), rather than one uniform count applied to every row. `count` spots are appended starting right after wherever that row currently ends (position 0 for a brand-new row, so it simply starts at 1) — the identical mechanism §3.5 uses to extend a row that already exists.

**Validation**:
- `name`: required, 1–100 chars, unique (case-insensitive) — else `409` with `{"error": "LOT_NAME_TAKEN"}`.
- `grid.rows`: if present, 1–26 entries.
- `grid.rows[].label`: required, 1–10 chars.
- `grid.rows[].count`: required, integer 1–200.

**Response `201`**: the created lot in the shape of §3.1's array element.

**Response `400`** (invalid grid):
```json
{ "error": "VALIDATION_ERROR", "details": ["count must be between 1 and 200"] }
```

### 3.3 `PUT /api/lots/{id}`

Renames a lot. Does not touch spots.

**Request**: `{ "name": "North Garage — Building 2" }`

**Response `200`**: updated lot object. **`404`** if lot doesn't exist. **`409`** `LOT_NAME_TAKEN` if name collides.

### 3.4 `DELETE /api/lots/{id}`

**Response `204`** on success.

**Response `409`** if any spot in the lot has an active assignment:
```json
{ "error": "LOT_HAS_OCCUPIED_SPOTS", "message": "Remove all cars from this lot before deleting it.", "occupiedSpotLabels": ["A1", "B3"] }
```

### 3.5 `POST /api/lots/{id}/spots/generate`

Bulk-generates spots for an existing lot from a grid definition. Additive — never removes or renumbers existing spots. A `label` that names a row already present in the lot **extends that row**: `count` new spots are appended starting right after its current highest position, rather than restarting at position 1. A `label` not yet present in the lot creates a brand-new row of `count` spots. Either way, any individual label that happens to already exist is skipped rather than erroring.

**Request — new row**: `{ "rows": [{ "label": "C", "count": 5 }] }` (lot has no row "C" yet → creates C1–C5)

**Request — extend an existing row**: `{ "rows": [{ "label": "A", "count": 3 }] }` (row "A" already ends at A10 → creates A11–A13)

**Response `201`**: array of newly created spots (shape as in §3.1).

**Validation**: same bounds as §3.2's `grid`. If every generated label already exists, returns `200` with an empty array (no-op, not an error).

### 3.6 `POST /api/lots/{id}/spots`

Adds a single spot manually (for overrides/custom labels outside the grid convention).

**Request**: `{ "label": "VIP-1", "row": "VIP", "position": 1 }`

**Validation**: `label` required, 1–20 chars, unique within the lot → else `409 SPOT_LABEL_TAKEN`.

**Response `201`**: the created spot.

### 3.7 `PUT /api/spots/{id}`

Relabels/repositions a spot.

**Request**: `{ "label": "A1", "row": "A", "position": 1 }`

**Response `200`**: updated spot. **`409 SPOT_LABEL_TAKEN`** if the new label collides within the lot.

### 3.8 `DELETE /api/spots/{id}`

**Response `204`** on success.

**Response `409`** if the spot has an active assignment:
```json
{ "error": "SPOT_OCCUPIED", "message": "Remove the car from this spot before deleting it.", "carId": "ABC123" }
```

### 3.9 `POST /api/cars`

Creates a new `Car` record with no spot assignment (rarely called standalone — normally used implicitly via §3.11's combined flow — but exposed for the admin/data-entry case of pre-registering a car).

**Request**:
```json
{ "id": "ABC123", "ownerName": "Jane Doe", "employeeId": "E4821", "phoneNumber": "555-0100", "notes": "Guest badge" }
```

**Validation**:
- `id`: required, exactly 6 characters, any characters allowed.
- `ownerName`: required, 1–100 chars.
- `employeeId`: required, 1–50 chars.
- `phoneNumber`, `notes`: optional; `notes` max 500 chars.

**Response `201`**: the created car.

**Response `409`** if `id` already exists:
```json
{ "error": "CAR_ID_EXISTS", "message": "A car with this ID already exists. Use the existing-car flow to assign it to a spot." }
```

### 3.10 `GET /api/cars/{carId}`

**Response `200`**: `{ "id": "ABC123", "ownerName": "...", "employeeId": "...", "phoneNumber": "...", "notes": "...", "currentLocation": { "lotName": "North Garage", "spotLabel": "A1" } }` (`currentLocation` is `null` if not currently parked). **`404`** if no such car.

### 3.11 `POST /api/spots/{spotId}/assign`

The single endpoint backing both "Add existing car" and "Add new car" UI flows.

**Request — existing car**:
```json
{ "carId": "ABC123" }
```

**Request — new car** (same endpoint; presence of metadata fields signals "create-if-absent"):
```json
{
  "carId": "XYZ789",
  "newCar": { "ownerName": "John Smith", "employeeId": "E9012", "phoneNumber": "555-0199", "notes": "" }
}
```

**Behavior**:
1. If `newCar` is present and `carId` does not already exist as a `Car` → create the `Car`, then assign.
2. If `newCar` is present and `carId` already exists → `409 CAR_ID_EXISTS` (don't silently ignore the metadata — force the user to use the existing-car flow instead).
3. If `newCar` is absent and `carId` does not exist → `404 CAR_NOT_FOUND`.
4. Spot must currently have no active assignment → else `409 SPOT_OCCUPIED`.
5. Car must not currently have an active assignment elsewhere → else `409 CAR_ALREADY_PARKED` with the current location.

**Response `201`**:
```json
{
  "id": "assignment-uuid",
  "carId": "ABC123",
  "spotId": "a1c2...",
  "assignedAt": "2026-09-14T18:04:00Z",
  "lotName": "North Garage",
  "spotLabel": "A1"
}
```

**Response `409` (spot occupied)**:
```json
{ "error": "SPOT_OCCUPIED", "message": "Spot A1 already has a car parked in it.", "carId": "DEF456" }
```

**Response `409` (car already parked elsewhere)**:
```json
{ "error": "CAR_ALREADY_PARKED", "message": "Car ABC123 is already parked in North Garage, Spot B3. Remove it from there first.", "lotName": "North Garage", "spotLabel": "B3" }
```

### 3.12 `DELETE /api/spots/{spotId}/assign`

Removes the current car from a spot (closes the active `CarAssignment` by setting `removedAt = now()`).

**Response `204`** on success.

**Response `409`** if the spot has no active assignment:
```json
{ "error": "SPOT_NOT_OCCUPIED" }
```

### 3.13 Search (client-side, no dedicated endpoint)

Given the ≤5-lot / few-hundred-spot scale target (§8), car-ID search is implemented client-side by filtering the already-fetched `GET /api/lots` payload (§4.3) — no server round-trip needed. If scale later grows meaningfully, revisit as a proper `GET /api/cars/{carId}/location` endpoint (trivial to add: same lookup as §3.10's `currentLocation`).

---

## 4. Frontend Architecture

### 4.1 Component Tree

```
<App>
 ├─ <Dashboard>
 │   ├─ <SearchBar>                     — car-ID input, triggers highlight
 │   ├─ <LotCard>  (one per lot)
 │   │   ├─ <LotHeader>                 — lot name (large/prominent), spot count summary
 │   │   └─ <SpotGrid>
 │   │       └─ <SpotCell>  (one per spot)
 │   │           ├─ label + status color, car ID if occupied
 │   │           ├─ hover → <SpotTooltip>  "Lot X → Spot A3"
 │   │           └─ click → <CarDetailPanel>  (expand/collapse, animated)
 │   │               └─ breadcrumb "Lot X / Spot A3", full car metadata, Remove button
 │   └─ <AddCarModal>                   — opened from an empty <SpotCell>; existing/new car sub-forms
 └─ <AdminPanel>                        — separate route/section
     ├─ <LotList> → create/rename/delete lot
     └─ <LotEditor> → grid-generate spots, add/edit/delete individual spots
```

### 4.2 State Management (Zustand)

Single store, updated by both the initial REST fetch and incoming WebSocket messages:

```ts
interface DashboardState {
  lots: Lot[];                       // full nested lots+spots+car-summary, source of truth for rendering
  highlightedSpotId: string | null;  // set by search, drives the highlight animation
  applyLotSnapshot(lots: Lot[]): void;       // from initial fetch / polling fallback
  applySpotUpdate(update: SpotUpdateEvent): void; // from WebSocket push — patches one spot in place
}
```

`applySpotUpdate` does an in-place patch of the single affected spot (found via `lotId`+`spotId`) rather than refetching everything, so a WebSocket-driven update doesn't cause a full-dashboard re-render flicker.

### 4.3 Data Fetching (TanStack Query)

- `useQuery(['lots'], fetchLots)` — initial load; `refetchInterval: 30_000` only enabled when the WebSocket connection is reported disconnected (see §6), acting as the fallback.
- Mutations (`useMutation`) for assign/remove/create/delete, each invalidating/patching the `['lots']` cache on success — but the WebSocket push (received by all clients, including the one that made the change) is the primary update path; the mutation's own optimistic/settled state just drives that specific user's loading/error UI.

### 4.4 Visual Hierarchy & Color Coding

- Lot name: `text-2xl font-bold` in `<LotHeader>`, one per `<LotCard>`.
- Spot label: always rendered, `font-semibold`, top of each `<SpotCell>` regardless of status.
- Car ID: rendered below the label only when occupied, `text-sm` (secondary weight vs. the label).
- Status color: `bg-green-100 border-green-500` (available) / `bg-red-100 border-red-500` (occupied) applied to the `<SpotCell>` container — color plus label plus (when occupied) car ID together satisfy the "no-click understanding" requirement.
- `<SpotGrid>` uses CSS grid with columns derived from the lot's max `position` per row, so every lot renders as a clean, consistent grid regardless of row/spot counts.

### 4.5 Location-Clarity Enhancements

- **Tooltip**: native browser `title` attribute is insufficient for styling — implemented as a small Tailwind-styled floating panel on `onMouseEnter`, text `"{lotName} → Spot {label}"`.
- **Breadcrumb**: first line of `<CarDetailPanel>`, `"{lotName} / {spotLabel}"`.
- **Search + highlight**: `<SearchBar>` filters the Zustand `lots` array client-side; on match, sets `highlightedSpotId`, scrolls the matching `<SpotCell>` into view (`scrollIntoView({behavior: 'smooth'})`), and applies a pulsing outline animation for ~2s.

### 4.6 Animations

Implemented with Tailwind's `transition`/`animate-*` utilities (or a small dependency like `framer-motion` if richer sequencing is needed):
- `<CarDetailPanel>` expand/collapse: height/opacity transition, ~200ms.
- Add/remove car: the affected `<SpotCell>` briefly flashes/fades between its color states rather than snapping instantly, so a WebSocket-driven change is noticeable even without staring at that exact cell.

---

## 5. UX Flows

### 5.1 Viewing the dashboard
1. Employee opens the app URL.
2. `GET /api/lots` fires; all lots render side-by-side/grid as `<LotCard>`s, each showing its full spot grid with color-coded, labeled cells.
3. WebSocket connects in the background; no further action needed to stay live.

### 5.2 Identifying where a car is located
- **Passive path**: scan the dashboard — occupied cells already show spot label + car ID + red color, grouped clearly under their lot's name.
- **Hover path**: hover any occupied cell → tooltip confirms `"{Lot} → Spot {label}"`.
- **Search path**: type a car ID into `<SearchBar>` → matching spot scrolls into view and pulses, across whichever lot it's in.
- **Expand path**: click the cell → `<CarDetailPanel>` opens with breadcrumb + full metadata.

### 5.3 Adding a car (existing)
1. Employee clicks an available (`green`) spot.
2. `<AddCarModal>` opens, "Existing car" tab selected by default.
3. Employee types the 6-character car ID, submits.
4. `POST /api/spots/{spotId}/assign` with `{carId}`.
   - Success: modal closes, cell turns red with the car ID (via WebSocket push, near-instant for all viewers).
   - `CAR_NOT_FOUND`: inline error, "No car with that ID — switch to 'New car' to register it."
   - `CAR_ALREADY_PARKED`: inline error showing current lot+spot, no state change.

### 5.4 Adding a car (new)
1. Employee clicks an available spot → `<AddCarModal>` → "New car" tab.
2. Fills in car ID, owner name, employee ID (required), phone/notes (optional).
3. Submits → `POST /api/spots/{spotId}/assign` with `{carId, newCar: {...}}`.
   - Success: same as 5.3.
   - `CAR_ID_EXISTS`: inline error, "This ID is already registered — switch to 'Existing car'."

### 5.5 Removing a car
1. Employee clicks the occupied cell → `<CarDetailPanel>` expands showing breadcrumb + metadata + a "Remove car" button.
2. Confirms removal (simple inline confirm, not a separate modal).
3. `DELETE /api/spots/{spotId}/assign`.
   - Success: panel collapses, cell turns green (via WebSocket push for all viewers).

### 5.6 Expanding car details
1. Click any occupied `<SpotCell>`.
2. Panel animates open in place, showing: breadcrumb (`Lot / Spot`), car ID, owner name, employee ID, phone (if set), notes (if set), assigned-since timestamp, Remove button.
3. Click again (or an explicit close control) to collapse.

### 5.7 Creating a lot with a generated grid (Admin)
1. Admin navigates to `<AdminPanel>` → "New Lot".
2. Enters lot name, then builds the grid row by row: picks a spot count, the row label is generated automatically (next letter after the last row added — not editable, no typing needed) — "Add" stages it, repeatable with a different count per row (e.g. Row A: 10 spots, Row B: 15 spots). Staged rows can be removed before submitting.
3. Submits → `POST /api/lots` with `grid`.
4. Redirected to the lot's editor showing the generated spots (e.g. A1–A10, B1–B15); can add/relabel/remove individual spots from here. The same row builder is reused by §5.8's "Generate spots" form on an existing lot.

### 5.8 Editing/deleting spots (Admin)
- Add spots via the grid builder: `<LotEditor>` → "Generate spots" — the same row builder as §5.7's new-lot flow, with one addition: since the lot already has rows, admin can toggle between "New row" (auto-labeled, as in §5.7) and "Add to existing row" (pick one of the lot's current row labels from a dropdown, pick a count) — the picked row is extended with that many more spots starting right after its current highest position, no relabeling or renumbering of what's already there. `POST /api/lots/{id}/spots/generate`.
- Add one-off spot: `<LotEditor>` → "Add custom spot" — for a single spot outside the row/grid convention (e.g. a "VIP-1" label) → `POST /api/lots/{id}/spots` (§3.6), unaffected by the row-builder changes above.
- Relabel: inline edit on a spot row → `PUT /api/spots/{id}`.
- Delete: delete icon on a spot row → `DELETE /api/spots/{id}`; if occupied, UI surfaces the `SPOT_OCCUPIED` error with the blocking car's ID rather than a generic failure.

---

## 6. Real-Time Strategy

### 6.1 Why WebSocket + polling fallback

A pure-polling approach (even at a few seconds) means every connected dashboard is briefly wrong after any change — unacceptable when the entire point of the app is "instantly know where every car is." A pure-WebSocket approach is instant but silently breaks if a client's connection drops (proxy timeout, laptop sleep, network blip) with no self-healing. The hybrid gives instant updates in the normal case and guarantees eventual correctness even when a socket is lost, without requiring the user to notice or refresh.

### 6.2 Transport

- Spring Boot exposes a STOMP endpoint at `/ws` (SockJS-wrapped for fallback compatibility in restrictive network environments).
- Given the ≤5-lot scale target, a single broadcast topic is sufficient: `/topic/lot-updates`. (Per-lot topics like `/topic/lots/{lotId}` are a trivial future change if scale grows — see §8 — not needed now.)

### 6.3 Message contract

Every mutating operation (assign, remove, spot/lot create/update/delete) publishes one event after the DB transaction commits:

```json
{
  "type": "SPOT_UPDATED",
  "lotId": "b3f1...",
  "spot": {
    "id": "a1c2...",
    "label": "A1",
    "row": "A",
    "position": 1,
    "status": "occupied",
    "car": { "id": "ABC123", "ownerName": "Jane Doe" }
  }
}
```

Other event types: `SPOT_CREATED`, `SPOT_DELETED`, `LOT_CREATED`, `LOT_UPDATED`, `LOT_DELETED` — same envelope shape, payload varies accordingly.

### 6.4 Client behavior

- On mount, the frontend opens the STOMP connection and subscribes to `/topic/lot-updates`.
- Each message patches the Zustand store in place (§4.2) — no refetch.
- TanStack Query's `refetchInterval` for `GET /api/lots` is disabled while the WebSocket reports `connected`, and enabled (30s interval) while `disconnected` — so a dropped socket degrades to "at most 30s stale" rather than "frozen forever," and reconnection attempts happen continuously in the background via STOMP's built-in reconnect-with-backoff.

---

## 7. Edge Cases

| # | Scenario | Resolution |
|---|---|---|
| 7.1 | Assign to a spot that's already occupied | `409 SPOT_OCCUPIED` (§3.11) — enforced first at the application layer, backstopped by the DB partial unique index on `spot_id` (§2.4) so a race between two requests can't both succeed. |
| 7.2 | Assign a car ID that's already actively parked elsewhere | `409 CAR_ALREADY_PARKED` with current location (§3.11); no auto-move. Backstopped by the DB partial unique index on `car_id` (§2.4). |
| 7.3 | Create a new car with an ID that already exists | `409 CAR_ID_EXISTS` (§3.9, §3.11) directing to the existing-car flow. |
| 7.4 | Delete a lot/spot that has an occupied spot | `409 LOT_HAS_OCCUPIED_SPOTS` / `409 SPOT_OCCUPIED` (§3.4, §3.8) — deletion blocked until vacated; no cascading auto-removal. |
| 7.5 | Race: two employees assign different cars to the same empty spot simultaneously | Both requests reach the service layer; the DB partial unique index on `spot_id` guarantees only one `INSERT` succeeds inside its transaction. The losing request's transaction fails with a constraint violation, which the service layer catches and translates to `409 SPOT_OCCUPIED` — no corrupted or duplicate assignment state is possible. |
| 7.6 | Race: two employees assign the same car ID to two different spots simultaneously | Same mechanism via the partial unique index on `car_id` — one succeeds, the other gets `409 CAR_ALREADY_PARKED`. |
| 7.7 | Invalid grid generation input (e.g. `count: 0` or `500`) | `400 VALIDATION_ERROR` with field-level details (§3.2). |
| 7.8 | Car ID not exactly 6 characters | `400 VALIDATION_ERROR`, `{"details": ["id must be exactly 6 characters"]}`. |
| 7.9 | Duplicate spot label within the same lot | `409 SPOT_LABEL_TAKEN` (§3.6, §3.7) — labels are unique per-lot, not globally (two different lots can both have an "A1"). |
| 7.10 | Duplicate lot name | `409 LOT_NAME_TAKEN` (§3.2, §3.3), case-insensitive comparison. |
| 7.11 | WebSocket disconnects mid-session | Client falls back to 30s polling (§6.4) until reconnected; no user action required. |
| 7.12 | Client submits assign request for a spot/lot ID that no longer exists (deleted by another user moments earlier) | `404` with `{"error": "SPOT_NOT_FOUND"}` — UI shows a toast and refetches to resync the stale view. |

---

## 8. Performance Considerations

Designed and justified against the agreed scale target: **≤5 parking lots, a few hundred spots total, a small number of concurrent connected dashboards.**

- **No pagination or list virtualization** — `GET /api/lots` returning every lot+spot in one payload is cheap at this scale (a few hundred small JSON objects); virtualizing the `<SpotGrid>` render would be premature complexity for what fits comfortably in the DOM.
- **Indexing**: the two partial unique indexes on `car_assignments` (§2.4) double as the lookup indexes needed for "does this spot have an active assignment" and "is this car currently parked" checks — no separate covering index required at this volume.
- **WebSocket fan-out**: a single broadcast topic (§6.2) is sent to every connected client on every change; at a few hundred spots and a handful of concurrent users, this is negligible load. If either lot count or concurrent-viewer count grows an order of magnitude, the documented next step is splitting into per-lot topics so clients only subscribe to (and receive updates for) lots currently rendered.
- **`GET /api/lots` query shape**: implemented as a single query with `JOIN FETCH` (JPA) across lot → spot → active assignment → car, avoiding N+1 queries regardless of lot/spot count within the target scale.
- **Client-side search** (§3.13, §4.3): filtering the already-loaded in-memory `lots` array is O(spots), trivially fast at a few hundred entries — no server round-trip or index needed.

---

## 9. Security Considerations

### 9.1 Public, unauthenticated write surface

The app is deployed live on the internet with **no login required in v1**. This is a deliberate scope decision, but it means every write endpoint (assign/remove car, create/edit/delete lot/spot) is callable by anyone with the URL — including automated abuse, not just employees. Mitigations:

- **Per-IP rate limiting** on all write endpoints (e.g. token-bucket via `bucket4j` or a Spring interceptor), suggested defaults: 30 write requests/minute/IP, `429 Too Many Requests` beyond that, with a `Retry-After` header.
- **Spring Security included from day one**, configured `permitAll()` on every route. This means enabling real authentication later (e.g. OAuth2/OIDC via company SSO, or simple form login) is a configuration change to the `SecurityFilterChain` bean plus adding a `User` entity — not a structural rewrite. The `createdByUserId`/`removedByUserId` columns on `CarAssignment` (§2.4) are already in place, unused, for this future.
- **Input validation** on every endpoint (Bean Validation annotations — `@NotBlank`, `@Size`, etc.) rejects malformed payloads before they reach the service layer (§3's validation rules throughout).
- **No destructive bulk operations** exposed (e.g. no "delete all lots") — every destructive action is scoped to one entity and guarded by the occupied-check in §7.4.

### 9.2 CORS

Backend restricts `Access-Control-Allow-Origin` to the known frontend origin (Railway service URL / custom domain), configured via env var — not a wildcard, even though there's no auth cookie at risk yet, to avoid the API being trivially embeddable/scriptable from arbitrary third-party pages.

### 9.3 Transport security

HTTPS enforced end-to-end (Railway provides TLS termination by default on generated domains); WebSocket connections use `wss://` accordingly.

### 9.4 SQL injection / persistence layer

Spring Data JPA + parameterized queries throughout (no raw string-concatenated SQL) — standard framework protection, called out explicitly since this is a from-scratch build.

### 9.5 Data sensitivity

Car metadata (owner name, employee ID, phone number) is PII. Even without login, this data should not be publicly *readable* beyond what the operational use case requires — `GET /api/lots` intentionally returns only `{id, ownerName}` per occupied spot (§3.1), not phone/notes; full metadata requires the explicit `GET /api/cars/{carId}` or the assign-flow response, matching the "secondary but clear" visual-hierarchy intent rather than exposing everything on the always-visible dashboard.

---

## 10. Future Improvements

- **Authentication & roles**: activate the pre-wired Spring Security configuration with real login (company SSO/OAuth2 or simple credentials); introduce admin vs. employee roles so lot/spot CRUD (§3.2–3.8) is admin-only while assign/remove stays open to all logged-in employees. Populate `createdByUserId`/`removedByUserId` once users exist.
- **Reservations**: a `Reservation` entity (spot + car/employee + time window) layered on top of the existing `available`/`occupied` model, likely introducing a third visual state ("reserved," e.g. amber) distinct from occupied.
- **Additional spot statuses**: "out of service"/"disabled" spots that are excluded from assignment but visually distinct from both available and occupied.
- **Mobile support**: responsive breakpoints for the `<SpotGrid>` (already Tailwind-based, so this is primarily a layout-density pass rather than a rewrite) or a dedicated lightweight mobile view optimized for "quickly find my car."
- **Assignment history reporting**: a UI over the existing `CarAssignment` history table (already capturing every `assignedAt`/`removedAt`) — e.g. "where has car X been," "utilization per lot over time" — no new data model needed, purely a reporting UI + query layer addition.
- **Server-side search endpoint**: if scale grows well past the ≤5-lot target (§8), promote the client-side search filter (§3.13) to a real `GET /api/cars/{carId}/location` endpoint and/or add full-text/fuzzy matching.
- **Per-lot WebSocket topics**: if concurrent-viewer count grows significantly, split the single broadcast topic (§6.2) into per-lot topics so clients only receive updates for lots they're actually viewing.
