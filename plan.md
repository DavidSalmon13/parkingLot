# Parking Lot Management Web App — Implementation Plan

This document walks through every section of `spec.md` and explains exactly how to build it: what files to create, what code goes where, and the order of operations. It assumes two repos/folders side by side:

```
parkingLot/
├── backend/    (Spring Boot, Maven, Java 21)
├── frontend/   (React + TypeScript, Vite)
└── spec.md
```

---

## Progress Checklist

Rule for working through this file: **find the first unchecked `[ ]` phase below, implement everything described in its corresponding section further down (all its sub-steps), verify it actually works end to end (run it / curl it / click it — not just "it compiles"), then edit this checklist to `[x]` for that phase before stopping.** Work one phase at a time unless told otherwise.

- [x] 0. Project Scaffolding — backend + frontend boot, no features yet
- [x] 1. System Architecture — REST/CORS/Security wiring, `/api/lots` reachable end to end
  - Done & verified locally (2026-09-14): `WebConfig` (CORS), `SecurityConfig` (permitAll), stub `GET /api/lots` all wired and confirmed end-to-end against a real local Postgres — `curl` returns `200 []`, CORS correctly allows `localhost:5173` and rejects other origins, and `frontend/src/api/client.ts`'s `ApiError` interceptor verified against live success/error responses.
  - §1.3 Railway provisioning was carved out of this phase — see phase 10 at the bottom of this checklist. That's a manual, human-only task (needs an interactive `railway login` and creates billed cloud resources), so it isn't part of what gets automated here.
- [x] 2. Data Models — all four entities, repositories, Flyway migrations, constraints verified in psql
- [x] 3. API Design — exception scaffolding + all endpoints (lots, spots, cars, assign/remove), each tested with curl
- [x] 4. Frontend Architecture — component tree, Zustand store, TanStack Query, visual hierarchy, clarity enhancements, animations (dashboard renders real data)
  - Built: types.ts, useDashboardStore, api/{lots,spots,cars}.ts, useLotsQuery (plain 30s polling — §6 adds the WebSocket-driven toggle), useMutations (assign/remove), and every employee-facing dashboard component (SpotTooltip, SpotCell, SpotGrid, LotHeader, LotCard, CarDetailPanel, AddCarModal, SearchBar, Dashboard).
  - Admin pages (AdminPanel/LotList/LotEditor + /admin routing) intentionally deferred to Phase 5, since §5.7/§5.8 (not §4) specify their actual CRUD behavior — building bare shells now would just be redone there.
  - Added `assignedAt` to backend `CarDetailResponse.CurrentLocation` (wasn't in spec §3.10's literal shape) since §5.6's detail panel needs an assigned-since timestamp and fabricating it on the frontend would be worse than closing the real gap.
  - Verified in an actual headless browser (Playwright, since neither a project run-skill nor chromium-cli existed yet) against the real backend: dashboard renders two seeded lots with correct grid layout/colors, hover tooltip, click-to-expand occupied spot (real fetched car detail + breadcrumb + timestamp), click-to-open Add Car modal on an available spot, full write loop (new-car assignment → refetch → spot flips color, occupancy count updates), search-and-highlight, and the not-found search path — zero console errors throughout.
- [x] 5. UX Flows — view/locate/add/remove/expand/admin flows wired and manually verified
  - Admin flows (§5.7/§5.8), deferred from Phase 4, were already implemented on disk (uncommitted) but unverified: `GridInput`, `AdminPanel`/`LotList`/`LotEditor` pages, `react-router-dom` wiring in `App.tsx`/`main.tsx`, the admin-facing mutations in `useMutations.ts`, and `api/lots.ts`/`api/spots.ts` calls for create/rename/delete lot and generate/add/update/delete spot.
  - Verified end-to-end (2026-09-14) with Playwright against a real backend (fresh dedicated `parkinglot-postgres` container on port 5433, since port 5432 was occupied by an unrelated project's container) and the Vite dev server: create lot with generated grid (redirects to editor showing all generated spots) → add custom spot → relabel a spot inline → delete a spot with inline confirm → rename the lot inline → back to lot list shows correct occupancy summary → dashboard renders the new lot → new-car assign flow from an available cell → search-and-highlight (pulsing ring, exact-ID match) → click-to-expand occupied cell shows breadcrumb + full metadata (fetched via `GET /api/cars/{id}`) → remove car via inline confirm (not a modal) → attempting to delete an occupied lot from admin correctly surfaces the `LOT_HAS_OCCUPIED_SPOTS` error (§7.4) instead of deleting. No console errors during the run.
- [x] 6. Real-Time Strategy — WebSocket transport, message contract, frontend socket hook, polling fallback (verify with two browser tabs)
  - Backend: `config/WebSocketConfig.java` (STOMP + SockJS on `/ws`, single `/topic/lot-updates` broker), `websocket/LotUpdatePublisher.java`, and event records (`SpotUpdatedEvent`, `SpotCreatedEvent`, `SpotDeletedEvent`, `LotCreatedEvent`, `LotUpdatedEvent`, `LotDeletedEvent`) in `websocket/events/`. Wired into `AssignmentService` (assign/remove → `SPOT_UPDATED`), `ParkingSpotService` (generate/add → `SPOT_CREATED`, update → `SPOT_UPDATED`, delete → `SPOT_DELETED`), and `ParkingLotService` (create/rename/delete → `LOT_CREATED`/`LOT_UPDATED`/`LOT_DELETED`), each published inline at the end of its `@Transactional` method per the spec's sketch (not yet split to `AFTER_COMMIT` — noted as the documented refinement, not needed at this scale).
  - Frontend: `hooks/useLotSocket.ts` (STOMP/SockJS client, dispatches to new store actions `applyLotCreated`/`applyLotUpdated`/`applyLotDeleted` alongside the existing spot actions) mounted once in `App.tsx` — not inside `Dashboard.tsx` as the plan's per-file sketch implied — so the single connection persists across Dashboard↔Admin navigation instead of tearing down/reconnecting on every route change. `useLotsQuery.ts` now toggles `refetchInterval` off a new `wsConnected` store field instead of always polling. Added a small Live/Reconnecting… status dot to `Dashboard.tsx`'s header (plan §6.4 step 3).
  - Removed the `queryClient.invalidateQueries(['lots'])` calls from every hook in `useMutations.ts` — now that the WebSocket push is live, that REST-refetch-on-every-mutation was exactly the redundant temporary measure phase 4's notes flagged for removal here, and spec §4.3 explicitly says not to patch/refetch from mutation `onSuccess` once the socket is the source of truth. Call-site `onSuccess` handlers (closing modals, navigation, resetting fields) are untouched since those are passed separately to `.mutate()`.
  - Two real bugs found and fixed during verification (both silent — no error surfaced in the UI, the socket just never reached `connected`): (1) `sockjs-client` references Node's `global`, which Vite doesn't polyfill — added `define: { global: 'globalThis' }` to `vite.config.ts`. (2) SockJS's XHR-streaming fallback sends `withCredentials: true`, which CORS rejects unless the server also sends `Access-Control-Allow-Credentials: true` — added `config.setAllowCredentials(true)` to `WebConfig.java`'s CORS bean.
  - Verified (2026-09-14) with Playwright across two browser tabs against a real backend/Postgres: both tabs show the "Live" status dot; Tab A creates a lot via admin and Tab B's already-open dashboard shows it appear with no refresh; Tab B assigns a car and Tab A's already-open admin `LotEditor` (a different route) reflects the occupied spot with no refresh; Tab A removes the car and Tab B reflects the vacancy with no refresh. Separately verified the polling fallback: with `/ws/**` blocked at the network layer, the dashboard still loads lots via the initial REST fetch and the header correctly shows "Reconnecting…" instead of silently failing.
- [x] 7. Edge Cases — verification pass through every row in the table
  - All 12 rows were already implemented as a side effect of phases 2/3/6 (per this section's own framing: "this section is the checklist to verify against"). Verified 7.1–7.10 and 7.12 against a real backend with a scripted battery of 19 assertions (all passing): occupied-spot/already-parked/duplicate-ID conflicts, occupied lot/spot deletion blocks, invalid grid bounds, 5/8-char car IDs, per-lot-not-global label uniqueness, case-insensitive lot-name uniqueness, and a stale-spot 404. 7.5/7.6 (the two concurrency races) were verified with genuinely parallel `Promise.all` requests, each producing exactly one `201` and one `409` — confirming the DB partial unique indexes + `GlobalExceptionHandler`'s `DataIntegrityViolationException` translation actually close the TOCTOU window, not just the pre-check. 7.11 was re-verified as a real mid-session disconnect (killing and restarting the actual backend process, not just blocking new connections) — the "Live"/"Reconnecting…" indicator flipped correctly both ways and STOMP auto-reconnected with no user action once the backend came back.
  - One real gap found and fixed for 7.12: phase 6 removed all `queryClient.invalidateQueries(['lots'])` calls from `useMutations.ts` in favor of the WebSocket being the sole source of truth — correct for successful mutations, but it meant a `404` from a stale assign (spot/lot deleted by someone else) no longer resynced the view as spec §7.12 requires (the WS push that would normally reflect the deletion was already delivered *before* the stale request even failed, so there was nothing left to trigger a refetch). Added a narrow `onError` in `useAssignCar` (`hooks/useMutations.ts`) that calls `invalidateQueries(['lots'])` specifically on a `404` response, plus a `SPOT_NOT_FOUND` inline message in `AddCarModal.tsx`. Verified end-to-end with two tabs: Tab A deletes a spot while Tab B has an Add-Car modal open on it; submitting in Tab B shows the "no longer exists" message and the dashboard grid drops the dead spot once the modal closes — no manual refresh needed.
- [x] 8. Performance Considerations — JOIN FETCH confirmed non-N+1, dev seed load test
- [x] 9. Security Considerations — rate limiting, Spring Security scaffold, CORS lockdown, input validation + PII minimization audit
- [ ] 10. Manual Railway Deployment — **human task, not automated.** See §11 below.

  - Added `application-dev.yml` (activated via `SPRING_PROFILES_ACTIVE=dev`) that appends `classpath:db/dev-seed` to `spring.flyway.locations` — keeps the seed data out of every real deployment without any DB-side environment branching — and turns on `hibernate.generate_statistics`/`show-sql` for local query-count inspection. Added `db/dev-seed/V3__dev_seed.sql`: a `DO $$` block generating the spec's target scale (5 lots × 60 spots = 300 spots, ~100 occupied) directly in SQL rather than hand-writing 300 rows.
  - `ParkingLotRepository.findAllWithSpots()`'s `LEFT JOIN FETCH l.spots` and `CarAssignmentRepository.findBySpotIdInAndRemovedAtIsNull` (batched, not per-spot) were already in place from phase 3/7 work — but running the dev seed against a real Postgres (dedicated `parkinglot-postgres` container on port 5433) with `show-sql` on surfaced a real N+1 the plan's §3.1 step 3 didn't fully close: `CarAssignment.car` is a `LAZY @ManyToOne`, and `ParkingSpotService.toDto`'s `a.getCar().getOwnerName()` was triggering one `SELECT ... FROM cars WHERE id = ?` per occupied spot (100 extra queries against the 300-spot seed — first `GET /api/lots` measured 102 Hibernate statements and ~150ms). Fixed by adding an explicit `JOIN FETCH ca.car` to `findBySpotIdInAndRemovedAtIsNull`'s `@Query`. Re-verified: exactly 2 SQL statements per `GET /api/lots` call (lot+spot join, assignment+car join) regardless of occupancy count, ~60ms warm, and the JSON response is byte-identical before/after the fix (confirmed via diff).
  - Confirmed `WebSocketConfig.java` already carries the single-topic-by-design comment (done in phase 6) and no pagination/virtualization/per-lot-topic code was added, per spec's explicit scope guardrail.
  - Cleaned up: stopped the test backend process and removed the throwaway `parkinglot-postgres` container after verification.

- Audited §9.2–9.5 first and found them already in place as a side effect of earlier phases: `SecurityConfig.java` (`permitAll()` with the `// TODO(auth)` flip-point comment), `WebConfig.java`'s locked-down `CorsConfigurationSource` (exact env-var origin, no wildcard, `allowCredentials` for the SockJS fallback), every write DTO already carrying Bean Validation annotations with `@Valid` wired at each controller, and `CarSummaryResponse` already minimized to `{id, ownerName}` only. Only §9.1 (rate limiting) was an actual gap — nothing under `config/` implemented it yet.
  - Built §9.1: `config/RateLimitInterceptor.java` — a hand-rolled per-IP token bucket (`ConcurrentHashMap<String, TokenBucket>`, 30 tokens/min continuous refill, not `bucket4j`, to avoid a dependency for one interceptor at this app's scale), applied only to `POST`/`PUT`/`DELETE` under `/api/**` via `config/WebMvcConfig.java`. Resolves the client IP from `X-Forwarded-For` first (Railway terminates TLS and proxies), falling back to `request.getRemoteAddr()`. On exhaustion: `429` with a `Retry-After: 60` header and a `{"error":"RATE_LIMITED", ...}` JSON body, short-circuiting before the request reaches controller/Bean Validation.
  - Verified end-to-end against a real backend (dedicated `parkinglot-postgres` container, port 5433, cleaned up afterward): a rapid burst of `POST /api/cars` requests returns `201`/`400` (validation still running normally) for the first ~30, then `429` with `Retry-After: 60` for the rest; confirmed the 429 body is well-formed JSON and that `GET /api/lots` is never rate-limited even while the write bucket for that IP is fully exhausted; confirmed tokens refill continuously (a request several seconds after a burst succeeds again, rather than waiting for a hard per-minute reset).

- **Post-phase-9 change (2026-09-14)**: per-row custom spot counts for grid generation, requested after the initial build. Previously `grid.spotsPerRow` was one number applied uniformly to every row; now each row carries its own `spotsPerRow` (spec §3.2/§3.5/§5.7 updated accordingly). Backend: `dto/GridRequest.java` now nests `rows: List<RowSpec>` (`RowSpec{label, spotsPerRow}`) instead of `rows: List<String>` + a top-level `spotsPerRow`; `ParkingSpotService.generateGrid` and both call sites (`ParkingLotService.createLot`, `ParkingLotController.generateSpots`) updated to match. Frontend: `types.ts`'s `GridPayload` now holds `rows: GridRowSpec[]`; `components/GridInput.tsx` rewritten from two static fields (row-letters CSV + one spot count) into an incremental row builder — add one row at a time with an auto-suggested-but-editable next letter and its own spot count, staged rows listed with a remove option before submit. Shared by both `LotList.tsx` (new lot) and `LotEditor.tsx` (generate more spots on an existing lot), so both flows picked up the change from the one component per the plan's original §3.5 note to reuse it.
- **Follow-up change (2026-09-14)**: user found the editable-label version confusing and wanted two things instead: (1) never type a row label — always auto-derive it from the last row, and (2) be able to pick an *existing* row and append more spots to it, not just create brand-new rows. Renamed `GridRequest.RowSpec.spotsPerRow` → `count`, and redefined its meaning uniformly as "N spots appended starting right after wherever this row currently ends" (position 0, i.e. starts at 1, for a row that doesn't exist yet) — this makes "new row" and "extend existing row" the exact same backend code path, no branching needed. Added `ParkingSpotRepository.findMaxPositionByLotIdAndRow` to compute that starting position; `ParkingSpotService.generateGrid` uses it instead of always looping from position 1. Frontend `GridInput.tsx`: dropped the editable label input entirely (label is now always read-only, auto-computed); added a `existingRowLabels` prop (only passed by `LotEditor.tsx`, since `LotList.tsx`'s new-lot flow has no existing rows) that, when non-empty, shows a "New row" / "Add to existing row" radio toggle — the latter swaps the read-only label for a `<select>` of the lot's current row labels. Verified against a real backend/lot (North Garage, seeded with rows A–F): extending row A (previously ending at A10) by 2 appended A11–A12 with no renumbering of A1–A10; adding a brand-new row G created G1–G3; both confirmed via direct API calls and a real Playwright browser session (screenshots), zero console errors, occupied-spot count unchanged throughout. Test spots deleted afterward to restore the seed lot to its original 60 spots.

Section "Future Improvements" (originally §10 in spec.md) has no checklist item — it's intentionally not built now.

---

## 0. Project Scaffolding (prerequisite for everything below)

### Backend
1. `cd backend && mvn archetype:generate` or use [start.spring.io] with dependencies: `Spring Web`, `Spring Data JPA`, `PostgreSQL Driver`, `Spring Security`, `Spring WebSocket`, `Validation`, `Flyway`.
2. Base package: `com.parkinglot`. Folders: `config/`, `entity/`, `repository/`, `dto/`, `service/`, `controller/`, `exception/`, `websocket/`.
3. `src/main/resources/application.yml` — reads `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `CORS_ALLOWED_ORIGIN`, `PORT` from env vars (Railway injects these).
4. Add Flyway; migrations live in `src/main/resources/db/migration/`.
5. Add `Dockerfile` (multi-stage: `maven:3.9-eclipse-temurin-21` build stage → `eclipse-temurin:21-jre` runtime stage, `EXPOSE ${PORT}`).

### Frontend
1. `npm create vite@latest frontend -- --template react-ts`
2. Install: `npm i zustand @tanstack/react-query axios @stomp/stompjs sockjs-client`, `npm i -D tailwindcss postcss autoprefixer`
3. `npx tailwindcss init -p`; configure `tailwind.config.js` `content` globs over `src/**/*.{ts,tsx}`.
4. Folders: `src/api/`, `src/store/`, `src/hooks/`, `src/components/`, `src/pages/`, `src/types.ts`.
5. `.env` → `VITE_API_BASE_URL`, `VITE_WS_URL`.

---

## 1. System Architecture

### 1.1 Overview — REST + WebSocket + JPA + Postgres

**What needs to be built**: the wiring that lets the four layers (React SPA, Spring REST controllers, JPA/Postgres, STOMP broker) talk to each other. This isn't a feature itself — it's the skeleton every other section plugs into.

**Backend files**:
- `com.parkinglot.ParkingLotApplication` — `@SpringBootApplication` entry point.
- `config/WebConfig.java` — registers CORS globally (used by every controller).

**Implementation steps**:
1. Create the Spring Boot main class with `@SpringBootApplication`.
2. Confirm `application.yml` has `spring.datasource.url=${DATABASE_URL}` etc., and `spring.jpa.hibernate.ddl-auto=validate` (schema comes from Flyway, not Hibernate auto-DDL — this avoids Hibernate silently diverging from the migrations that define the constraints in §2).
3. Add `spring.jpa.open-in-view=false` (avoids lazy-loading surprises outside transactions — matters once §2's `JOIN FETCH` queries are in place).
4. Run `mvn spring-boot:run` locally against a local Postgres (`docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15`) to confirm the app boots before writing any endpoints.

**Frontend files**:
- `src/api/client.ts` — Axios instance with `baseURL: import.meta.env.VITE_API_BASE_URL`.

**Implementation steps**:
1. Create the Axios client with a response interceptor that unwraps error JSON bodies (`{error, message, ...}`) into a typed `ApiError` class — every later component/hook catches this one shape instead of parsing raw Axios errors.

### 1.2 Stack Selection

Nothing to implement directly — this is the dependency list. Action item: pin these in `pom.xml` (backend) and `package.json` (frontend) at scaffold time (§0), not incrementally, so version conflicts surface early.

### 1.3 Deployment Topology (Railway)

**What needs to be built**: three Railway services and the env-var wiring between them.

**Steps**:
1. `railway init` in `backend/` → creates `parkinglot-api` service. Add the Postgres plugin (`railway add postgresql`) → creates `parkinglot-db`; Railway auto-injects `DATABASE_URL` into `parkinglot-api`.
2. Add `backend/Dockerfile` (from §0.5); Railway auto-detects and builds it.
3. `railway init` in `frontend/` → creates `parkinglot-frontend` as a static-site service (Railway's Nixpacks static builder, or an Nginx `Dockerfile` serving `dist/`).
4. Set `parkinglot-frontend`'s env vars `VITE_API_BASE_URL` / `VITE_WS_URL` to `parkinglot-api`'s public Railway URL (`https://...up.railway.app` / `wss://...up.railway.app/ws`).
5. Set `parkinglot-api`'s `CORS_ALLOWED_ORIGIN` to `parkinglot-frontend`'s public URL.
6. Verify with `curl https://<api-url>/api/lots` returns `[]` before wiring the frontend to it.

---

## 2. Data Models

All four entities live in `backend/src/main/java/com/parkinglot/entity/`. Schema is defined via Flyway migration, not `ddl-auto=update`, so the constraints below are explicit and reviewable.

### 2.1 `ParkingLot`

**Backend files**: `entity/ParkingLot.java`, `repository/ParkingLotRepository.java`, migration `V1__init_schema.sql`.

**Steps**:
1. In `V1__init_schema.sql`:
   ```sql
   CREATE TABLE parking_lots (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     row_labels TEXT[] NOT NULL DEFAULT '{}',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE UNIQUE INDEX uq_parking_lots_name_ci ON parking_lots (LOWER(name));
   ```
   (Case-insensitive uniqueness via a `LOWER()` index, since §3.2/3.3 need case-insensitive name-collision checks.)
2. Enable the `pgcrypto` or `uuid-ossp` extension for `gen_random_uuid()` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;` at the top of `V1`).
3. `entity/ParkingLot.java`: `@Entity @Table(name = "parking_lots")`, fields `id` (`@Id @GeneratedValue`), `name`, `rowLabels` (`@Column(columnDefinition = "text[]")` mapped via a converter or Hibernate's array support), `createdAt`/`updatedAt` (`@CreationTimestamp`/`@UpdateTimestamp`).
4. `repository/ParkingLotRepository.java extends JpaRepository<ParkingLot, UUID>` with `boolean existsByNameIgnoreCase(String name)` and `Optional<ParkingLot> findByNameIgnoreCase(String name)`.

### 2.2 `ParkingSpot`

**Backend files**: `entity/ParkingSpot.java`, `repository/ParkingSpotRepository.java`.

**Steps**:
1. Add to `V1__init_schema.sql`:
   ```sql
   CREATE TABLE parking_spots (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
     label VARCHAR(20) NOT NULL,
     row_label VARCHAR(10) NOT NULL,
     position INT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE UNIQUE INDEX uq_parking_spots_lot_label ON parking_spots (lot_id, label);
   ```
2. `entity/ParkingSpot.java`: `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lot_id")` for the lot reference; `label`, `row` (map to `row_label` column — `row` is a reserved-ish word in some contexts, keep the Java field `row` but `@Column(name = "row_label")`), `position`.
3. Status is **not** a column — do not add an `@Enumerated` status field. Instead, add a service-layer method `ParkingSpotService.getStatus(ParkingSpot spot)` that checks for an active `CarAssignment` (see 2.4) — this is enforced by *not building the column at all*, so no one can accidentally write to it and desync it from the assignment table.
4. `repository/ParkingSpotRepository.java`: `boolean existsByLotIdAndLabel(UUID lotId, String label)`, `List<ParkingSpot> findByLotIdOrderByRowLabelAscPositionAsc(UUID lotId)`.

### 2.3 `Car`

**Backend files**: `entity/Car.java`, `repository/CarRepository.java`.

**Steps**:
1. Add to `V1__init_schema.sql`:
   ```sql
   CREATE TABLE cars (
     id VARCHAR(6) PRIMARY KEY,
     owner_name VARCHAR(100) NOT NULL,
     employee_id VARCHAR(50) NOT NULL,
     phone_number VARCHAR(30),
     notes VARCHAR(500),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```
2. `entity/Car.java`: `@Id` on `id` (String, no `@GeneratedValue` — the ID is user-supplied, not auto-generated). Add a `@PrePersist`/`@Column` check is not enough for "exactly 6 chars" — enforce that in the DTO validation layer (§3.9), not the DB (a `CHECK (length(id) = 6)` constraint is a reasonable belt-and-suspenders addition — add it: `ALTER TABLE cars ADD CONSTRAINT chk_car_id_length CHECK (length(id) = 6);`).
3. `repository/CarRepository.java extends JpaRepository<Car, String>`.

### 2.4 `CarAssignment`

**Backend files**: `entity/CarAssignment.java`, `repository/CarAssignmentRepository.java`.

**Steps**:
1. Add to `V1__init_schema.sql`:
   ```sql
   CREATE TABLE car_assignments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     car_id VARCHAR(6) NOT NULL REFERENCES cars(id),
     spot_id UUID NOT NULL REFERENCES parking_spots(id),
     assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     removed_at TIMESTAMPTZ,
     created_by_user_id UUID,
     removed_by_user_id UUID
   );
   ```
2. In a second migration `V2__constraints.sql` (kept separate so the partial-unique-index intent is reviewable on its own), add the two critical constraints from the spec:
   ```sql
   CREATE UNIQUE INDEX uq_car_assignments_active_spot
     ON car_assignments (spot_id) WHERE removed_at IS NULL;
   CREATE UNIQUE INDEX uq_car_assignments_active_car
     ON car_assignments (car_id) WHERE removed_at IS NULL;
   CREATE INDEX idx_car_assignments_car_id ON car_assignments (car_id);
   CREATE INDEX idx_car_assignments_spot_id ON car_assignments (spot_id);
   ```
3. `entity/CarAssignment.java`: `@ManyToOne @JoinColumn(name = "car_id")` → `Car`; `@ManyToOne @JoinColumn(name = "spot_id")` → `ParkingSpot`; `assignedAt`, `removedAt` (nullable `Instant`), `createdByUserId`/`removedByUserId` (nullable `UUID`, unused fields — just map them, no logic yet, per §10's future-auth note).
4. `repository/CarAssignmentRepository.java`:
   - `Optional<CarAssignment> findBySpotIdAndRemovedAtIsNull(UUID spotId)`
   - `Optional<CarAssignment> findByCarIdAndRemovedAtIsNull(String carId)`
   - `boolean existsBySpotIdAndRemovedAtIsNull(UUID spotId)`
5. **This is the mechanism that makes §7.5/7.6 (race conditions) actually safe** — write the service-layer insert (§3.11) inside a `@Transactional` method that calls `save()` and lets the DB constraint violation surface as a `DataIntegrityViolationException`, caught and translated in `GlobalExceptionHandler` (§ below) into the `409` responses. Do not pre-check-then-insert as two separate steps and trust the pre-check alone — that's exactly the TOCTOU race the constraint exists to close.

### 2.5 ER Summary — derived status

**What needs to be built**: `ParkingSpotService.toDto(ParkingSpot spot)` — the single place that computes `status` (`"available"`/`"occupied"`) and `car` summary by looking up `CarAssignmentRepository.findBySpotIdAndRemovedAtIsNull`. Every controller that returns spot data (§3.1, 3.5, 3.6, 3.7) calls through this one method — never duplicate the derivation logic in multiple controllers.

---

## 3. API Design

All controllers in `backend/src/main/java/com/parkinglot/controller/`, services in `.../service/`, request/response shapes in `.../dto/`. Global error handling in `exception/GlobalExceptionHandler.java` (`@RestControllerAdvice`) — build this **before** the first endpoint, since every endpoint below throws typed exceptions into it.

**Exception scaffolding (build first)**:
1. `exception/ApiException.java` — abstract base: `errorCode` (String), `httpStatus`, `message`, optional `Map<String, Object> details`.
2. Concrete subclasses: `LotNameTakenException`, `SpotLabelTakenException`, `SpotOccupiedException`, `SpotNotOccupiedException`, `CarAlreadyParkedException`, `CarIdExistsException`, `CarNotFoundException`, `LotHasOccupiedSpotsException`, `NotFoundException` (generic 404).
3. `exception/GlobalExceptionHandler.java`: `@ExceptionHandler(ApiException.class)` → serializes `{error: errorCode, message, ...details}` with the right HTTP status. Also handle `MethodArgumentNotValidException` (Bean Validation failures) → `400 {"error": "VALIDATION_ERROR", "details": [...]}`, and `DataIntegrityViolationException` → inspect the constraint name and rethrow as the appropriate `409` (`uq_car_assignments_active_spot` → `SpotOccupiedException`, `uq_car_assignments_active_car` → `CarAlreadyParkedException`).

### 3.1 `GET /api/lots`

**Backend**:
1. `dto/LotResponse.java`, `dto/SpotResponse.java` (nested `car: CarSummaryResponse` with just `id`+`ownerName`, per §9.5's PII-minimization rule).
2. `repository/ParkingLotRepository`: add `@Query("SELECT DISTINCT l FROM ParkingLot l LEFT JOIN FETCH l.spots")` — a `JOIN FETCH` query so this is one round trip, not N+1 (per §8).
3. `service/ParkingLotService.getAllLotsWithSpots()`: fetch lots, then for each lot's spots batch-load active assignments in one query (`CarAssignmentRepository.findBySpotIdInAndRemovedAtIsNull(spotIds)`) rather than one query per spot, and assemble `LotResponse` objects.
4. `controller/ParkingLotController.java`: `@GetMapping("/api/lots")` calling the service, returning `List<LotResponse>`.

**Frontend**:
1. `src/api/lots.ts`: `export function fetchLots(): Promise<Lot[]>` — `client.get('/lots')`.
2. `src/types.ts`: `Lot`, `Spot`, `CarSummary` interfaces matching the DTO shape exactly.
3. `src/hooks/useLotsQuery.ts`: `useQuery({queryKey: ['lots'], queryFn: fetchLots})`, feeding `Dashboard.tsx` (built in §4).

### 3.2 `POST /api/lots`

**Backend**:
1. `dto/CreateLotRequest.java`: `name` (`@NotBlank @Size(max=100)`), `grid` (nullable nested `GridRequest { rows: List<String>, spotsPerRow: Integer }` with `@Size(max=26)` on rows, `@Min(1) @Max(200)` on `spotsPerRow`).
2. `service/ParkingLotService.createLot(CreateLotRequest req)`:
   - Check `existsByNameIgnoreCase` → throw `LotNameTakenException`.
   - Save the `ParkingLot`.
   - If `grid` present, call `ParkingSpotService.generateGrid(lot, grid.rows, grid.spotsPerRow)` (shared with §3.5 — implement grid generation once, reuse here).
3. `controller/ParkingLotController.java`: `@PostMapping("/api/lots")`, `@Valid @RequestBody CreateLotRequest`, return `201` with the assembled `LotResponse`.

**Frontend**:
1. `src/components/AdminPanel/LotList.tsx`: "New Lot" button opens a form (name + optional rows/spotsPerRow inputs).
2. `src/api/lots.ts`: `createLot(payload)`.
3. `useMutation` in `LotList.tsx`, `onSuccess` invalidates `['lots']` query cache and navigates to the new lot's editor.

### 3.3 `PUT /api/lots/{id}`

**Backend**:
1. `dto/UpdateLotRequest.java`: `name` (`@NotBlank`).
2. `service/ParkingLotService.renameLot(UUID id, String newName)`: fetch-or-404, check name collision (excluding self), save.
3. `controller`: `@PutMapping("/api/lots/{id}")`.

**Frontend**: `LotEditor.tsx` — inline-editable lot name field, `updateLot` mutation on blur/submit.

### 3.4 `DELETE /api/lots/{id}`

**Backend**:
1. `service/ParkingLotService.deleteLot(UUID id)`:
   - Fetch lot's spots.
   - Query which spot IDs have active assignments (`CarAssignmentRepository.findBySpotIdInAndRemovedAtIsNull`).
   - If any, throw `LotHasOccupiedSpotsException` with the offending spot labels attached.
   - Else, delete spots then the lot in a `@Transactional` method.
2. `controller`: `@DeleteMapping("/api/lots/{id})`, `204` on success.

**Frontend**: `LotList.tsx` delete button → on `409`, show a toast/inline message listing `occupiedSpotLabels` from the error payload.

### 3.5 `POST /api/lots/{id}/spots/generate`

**Backend**:
1. `service/ParkingSpotService.generateGrid(ParkingLot lot, List<String> rows, int spotsPerRow)`:
   - For each row, for `position` 1..spotsPerRow, compute `label = row + position`.
   - Skip any label that already exists in the lot (`existsByLotIdAndLabel`) — collect only the new ones.
   - Bulk-save the new `ParkingSpot` rows.
   - Return the created list (empty list, not an error, if nothing new).
2. `controller/ParkingSpotController.java`: `@PostMapping("/api/lots/{id}/spots/generate")`.

**Frontend**: `LotEditor.tsx` "Generate spots" sub-form (rows + spotsPerRow inputs) reusing the same form component as the create-lot grid input (§3.2) — extract a shared `<GridInput>` component.

### 3.6 `POST /api/lots/{id}/spots`

**Backend**:
1. `dto/CreateSpotRequest.java`: `label` (`@NotBlank @Size(max=20)`), `row` (`@NotBlank`), `position` (`@NotNull`).
2. `service/ParkingSpotService.addSpot(UUID lotId, CreateSpotRequest req)`: check `existsByLotIdAndLabel` → `SpotLabelTakenException`; else save.
3. `controller`: `@PostMapping("/api/lots/{id}/spots")`, `201`.

**Frontend**: `LotEditor.tsx` "Add custom spot" row — small inline form for label/row/position.

### 3.7 `PUT /api/spots/{id}`

**Backend**: `service/ParkingSpotService.updateSpot(UUID id, UpdateSpotRequest req)` — fetch-or-404, check label collision within `lotId` excluding self, save. `controller/ParkingSpotController.java`: `@PutMapping("/api/spots/{id}")`.

**Frontend**: `LotEditor.tsx` — click-to-edit on each spot row, `updateSpot` mutation.

### 3.8 `DELETE /api/spots/{id}`

**Backend**: `service/ParkingSpotService.deleteSpot(UUID id)` — check `existsBySpotIdAndRemovedAtIsNull` on assignments; if occupied, throw `SpotOccupiedException` with `carId` attached; else delete. `controller`: `@DeleteMapping("/api/spots/{id})`, `204`.

**Frontend**: `LotEditor.tsx` delete icon per spot row → on `409`, inline error "Spot occupied by {carId} — remove the car first."

### 3.9 `POST /api/cars`

**Backend**:
1. `dto/CreateCarRequest.java`: `id` (`@NotBlank @Size(min=6, max=6)`), `ownerName` (`@NotBlank @Size(max=100)`), `employeeId` (`@NotBlank @Size(max=50)`), `phoneNumber` (`@Size(max=30)`, nullable), `notes` (`@Size(max=500)`, nullable).
2. `service/CarService.createCar(CreateCarRequest req)`: check `carRepository.existsById(id)` → `CarIdExistsException`; else save.
3. `controller/CarController.java`: `@PostMapping("/api/cars")`, `201`.

**Frontend**: standalone car pre-registration isn't in the main flow (§5 uses §3.11 instead) — build `src/api/cars.ts: createCar()` for completeness/admin use, but no dedicated screen required for v1.

### 3.10 `GET /api/cars/{carId}`

**Backend**:
1. `service/CarService.getCarWithLocation(String carId)`: fetch car-or-404; look up active assignment via `CarAssignmentRepository.findByCarIdAndRemovedAtIsNull`; if present, join to spot+lot for `currentLocation`.
2. `dto/CarDetailResponse.java`: full metadata + nullable `currentLocation: {lotName, spotLabel}`.
3. `controller`: `@GetMapping("/api/cars/{carId}")`.

**Frontend**: `src/api/cars.ts: fetchCarDetail(carId)`, used by `CarDetailPanel.tsx` (§4/§5.6) — actually, per §3.1's response already nested car summary; `CarDetailPanel` calls this endpoint on expand to get the *full* metadata (phone/notes) not included in the dashboard payload.

### 3.11 `POST /api/spots/{spotId}/assign`

This is the most important endpoint — implement its ordering exactly as specified, inside one `@Transactional` service method to keep the checks and the insert atomic against the race conditions in §7.5/7.6.

**Backend**:
1. `dto/AssignCarRequest.java`: `carId` (`@NotBlank @Size(min=6,max=6)`), `newCar` (nullable nested `NewCarDetails { ownerName, employeeId, phoneNumber, notes }`).
2. `service/AssignmentService.assignCarToSpot(UUID spotId, AssignCarRequest req)`:
   ```java
   @Transactional
   public CarAssignment assignCarToSpot(UUID spotId, AssignCarRequest req) {
     ParkingSpot spot = spotRepo.findById(spotId).orElseThrow(NotFoundException::new);
     Optional<Car> existing = carRepo.findById(req.carId());

     if (req.newCar() != null) {
       if (existing.isPresent()) throw new CarIdExistsException(req.carId());
       carRepo.save(new Car(req.carId(), req.newCar()));
     } else if (existing.isEmpty()) {
       throw new CarNotFoundException(req.carId());
     }

     // Explicit pre-checks give a fast, friendly error in the common case;
     // the DB partial unique indexes (see entity/CarAssignment) are the real
     // guarantee against a concurrent double-booking slipping through.
     assignmentRepo.findBySpotIdAndRemovedAtIsNull(spotId)
         .ifPresent(a -> { throw new SpotOccupiedException(spot.getLabel(), a.getCarId()); });
     assignmentRepo.findByCarIdAndRemovedAtIsNull(req.carId())
         .ifPresent(a -> { throw new CarAlreadyParkedException(lotNameOf(a), spotLabelOf(a)); });

     CarAssignment saved = assignmentRepo.save(new CarAssignment(req.carId(), spotId));
     lotUpdatePublisher.publishSpotUpdated(spot.getLotId(), spot); // see §6
     return saved;
   }
   ```
3. `controller/AssignmentController.java`: `@PostMapping("/api/spots/{spotId}/assign")`, `201` with `AssignmentResponse` (includes `lotName`/`spotLabel` per the spec's response example).
4. Wrap the `assignmentRepo.save(...)` call so a caught `DataIntegrityViolationException` (from the partial unique index, in the race scenario the pre-checks missed) still resolves to `SpotOccupiedException`/`CarAlreadyParkedException` via `GlobalExceptionHandler` — don't let a raw 500 leak through in that narrow race window.

**Frontend**:
1. `src/components/AddCarModal.tsx`: two tabs ("Existing car" / "New car"), form state for `carId` + optional metadata fields.
2. `src/api/spots.ts: assignCar(spotId, payload)`.
3. `useMutation` in `AddCarModal.tsx`: on error, switch on `err.error` (`"CAR_NOT_FOUND"`, `"CAR_ALREADY_PARKED"`, `"CAR_ID_EXISTS"`, `"SPOT_OCCUPIED"`) to show the exact inline messages from §5.3/§5.4. On success, close modal — the resulting cell update arrives via WebSocket (§6), not via a manual cache patch, so no extra code needed here beyond closing the modal.

### 3.12 `DELETE /api/spots/{spotId}/assign`

**Backend**:
1. `service/AssignmentService.removeCarFromSpot(UUID spotId)`: `@Transactional` — find active assignment or throw `SpotNotOccupiedException`; set `removedAt = Instant.now()`; save; publish `SPOT_UPDATED` (§6).
2. `controller`: `@DeleteMapping("/api/spots/{spotId}/assign")`, `204`.

**Frontend**: `src/components/CarDetailPanel.tsx` "Remove car" button → `removeCar(spotId)` mutation → on success, collapse the panel (cell color change arrives via WebSocket).

### 3.13 Search (client-side, no endpoint)

**Frontend only**:
1. `src/components/SearchBar.tsx`: controlled text input bound to Zustand store's `searchTerm` (or local state).
2. On submit/change, run a plain `Array.prototype.flatMap` over the Zustand `lots` array to find the spot whose `car?.id === searchTerm` (or a case-insensitive/partial match — spec doesn't require fuzzy match, exact-ID match is sufficient for v1).
3. If found, `store.setHighlightedSpotId(spot.id)`; if not found, show a small "not found" inline message.
4. No backend work for this item — explicitly skip building `GET /api/cars/{carId}/location`, per the spec's scale justification; leave it as a documented future item (§10 in spec).

---

## 4. Frontend Architecture

### 4.1 Component Tree

**Steps** (build in this order, each depending on the previous):
1. `src/types.ts` — `Lot`, `Spot`, `CarSummary`, `CarDetail` interfaces mirroring backend DTOs exactly (copy field names/casing to avoid silent mapping bugs).
2. `src/store/useDashboardStore.ts` (§4.2) — build before any component, since components read from it.
3. `src/api/*.ts` — thin wrappers per §3's endpoints.
4. `src/hooks/useLotsQuery.ts`, `src/hooks/useLotSocket.ts` (§6.4) — data-fetching hooks.
5. `src/components/SpotCell.tsx` — leaf component first: props `{spot, onExpand}`, renders label always, car ID + red background if `spot.status === 'occupied'`, green otherwise; wraps in a hover handler for `SpotTooltip.tsx`.
6. `src/components/SpotGrid.tsx` — CSS grid laid out from `spot.row`/`spot.position` (§4.4), maps `SpotCell` per spot.
7. `src/components/LotHeader.tsx` — lot name + spot count summary (`{occupied}/{total} occupied`).
8. `src/components/LotCard.tsx` — composes `LotHeader` + `SpotGrid`.
9. `src/components/CarDetailPanel.tsx` — expand/collapse panel, fetches full detail via `fetchCarDetail` on open.
10. `src/components/AddCarModal.tsx` (built in §3.11).
11. `src/components/SearchBar.tsx` (built in §3.13).
12. `src/components/Dashboard.tsx` — top-level: `SearchBar` + `useLotsQuery()` + maps `lots` to `LotCard`s in a responsive flex/grid wrapper.
13. `src/pages/AdminPanel.tsx`, `LotList.tsx`, `LotEditor.tsx` — admin CRUD screens (§3.2–3.8), routed separately (`react-router-dom`, add `/admin` route in `App.tsx`).

### 4.2 State Management (Zustand)

**File**: `src/store/useDashboardStore.ts`.

**Steps**:
1. Define the store exactly as specified:
   ```ts
   import { create } from 'zustand';
   interface DashboardState {
     lots: Lot[];
     highlightedSpotId: string | null;
     applyLotSnapshot: (lots: Lot[]) => void;
     applySpotUpdate: (evt: SpotUpdateEvent) => void;
     setHighlightedSpotId: (id: string | null) => void;
   }
   export const useDashboardStore = create<DashboardState>((set) => ({
     lots: [],
     highlightedSpotId: null,
     applyLotSnapshot: (lots) => set({ lots }),
     applySpotUpdate: (evt) => set((state) => ({
       lots: state.lots.map((lot) =>
         lot.id !== evt.lotId ? lot : {
           ...lot,
           spots: lot.spots.map((s) => (s.id === evt.spot.id ? evt.spot : s)),
         }
       ),
     })),
     setHighlightedSpotId: (id) => set({ highlightedSpotId: id }),
   }));
   ```
2. `useLotsQuery.ts`'s `onSuccess` calls `applyLotSnapshot`; `useLotSocket.ts`'s message handler calls `applySpotUpdate` (and equivalents for `SPOT_CREATED`/`SPOT_DELETED`/`LOT_*` — add matching store actions `applySpotCreated`, `applySpotDeleted`, `applyLotCreated/Updated/Deleted` following the same in-place-patch pattern).

### 4.3 Data Fetching (TanStack Query)

**Files**: `src/main.tsx` (QueryClientProvider setup), `src/hooks/useLotsQuery.ts`.

**Steps**:
1. `main.tsx`: wrap `<App>` in `<QueryClientProvider client={new QueryClient()}>`.
2. `useLotsQuery.ts`:
   ```ts
   export function useLotsQuery() {
     const connected = useSocketStatus(); // from useLotSocket.ts, see §6.4
     const applySnapshot = useDashboardStore((s) => s.applyLotSnapshot);
     return useQuery({
       queryKey: ['lots'],
       queryFn: fetchLots,
       refetchInterval: connected ? false : 30_000,
       onSuccess: applySnapshot,
     });
   }
   ```
3. Mutation hooks (`useAssignCar`, `useRemoveCar`, `useCreateLot`, etc.) in the same file or `src/hooks/useMutations.ts` — each just calls the API function; do not manually patch the Zustand store from these mutations' `onSuccess` (the WebSocket push is the source of truth, per spec §4.3) — only use `onSuccess`/`onError` here to drive the calling component's own loading/error UI (e.g. closing a modal, showing an inline error).

### 4.4 Visual Hierarchy & Color Coding

**File**: `src/components/SpotCell.tsx`, `tailwind.config.js`.

**Steps**:
1. In `tailwind.config.js`, no custom colors needed — use Tailwind's built-in `green-*`/`red-*` palette directly for consistency with the spec's literal `bg-green-100 border-green-500` / `bg-red-100 border-red-500` classes.
2. `SpotCell.tsx`:
   ```tsx
   <div className={clsx(
     'border-2 rounded p-2 flex flex-col items-center cursor-pointer transition-colors',
     spot.status === 'occupied' ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'
   )}>
     <span className="font-semibold">{spot.label}</span>
     {spot.status === 'occupied' && <span className="text-sm text-gray-700">{spot.car?.id}</span>}
   </div>
   ```
3. `LotHeader.tsx`: `<h2 className="text-2xl font-bold">{lot.name}</h2>`.
4. `SpotGrid.tsx`: compute `maxPosition = Math.max(...spots.map(s => s.position))`, apply `style={{gridTemplateColumns: `repeat(${maxPosition}, minmax(60px, 1fr))`}}`, and render spots grouped by `row` in row order so the grid visually matches the lot's physical layout.

### 4.5 Location-Clarity Enhancements

**Files**: `src/components/SpotTooltip.tsx`, `src/components/CarDetailPanel.tsx`, `src/components/SearchBar.tsx`.

**Steps**:
1. `SpotTooltip.tsx`: absolutely-positioned `<div>` shown conditionally on `SpotCell`'s hover state (`useState` + `onMouseEnter`/`onMouseLeave`), text `{lotName} → Spot {spot.label}` — pass `lotName` down as a prop from `LotCard` → `SpotGrid` → `SpotCell` (small prop-drill, acceptable at this depth).
2. `CarDetailPanel.tsx`: first rendered line is `<div className="text-sm text-gray-500">{lotName} / {spot.label}</div>` (the breadcrumb).
3. `SearchBar.tsx` + store: on match (§3.13), call `document.getElementById(`spot-${spot.id}`).scrollIntoView({behavior: 'smooth', block: 'center'})`; give each `SpotCell` root element `id={`spot-${spot.id}`}`. Apply a `highlightedSpotId === spot.id` conditional class (`ring-4 ring-yellow-400 animate-pulse`) that auto-clears after 2s via `setTimeout` + `setHighlightedSpotId(null)`.

### 4.6 Animations

**Steps**:
1. Add `transition-all duration-200` classes to `CarDetailPanel.tsx`'s expand/collapse wrapper; drive open/closed via a `max-h-0 opacity-0` ↔ `max-h-96 opacity-100` class toggle (pure Tailwind, no extra library needed for this simple case — only reach for `framer-motion` if this feels insufficient once built).
2. `SpotCell.tsx` already has `transition-colors` (§4.4) — this alone makes WebSocket-driven flips between green/red animate smoothly without extra code.

---

## 5. UX Flows

Each flow below is an integration of components/endpoints already built in §3/§4 — this section is about wiring them together correctly, not new files.

### 5.1 Viewing the dashboard
**Steps**: `Dashboard.tsx` mounts → `useLotsQuery()` fires → `useLotSocket()` (§6.4) connects in a `useEffect`. Verify manually: load the page, confirm all seeded lots render with correct colors before building anything else in this section.

### 5.2 Identifying where a car is located
**Steps**: no new code — verify the three paths (passive glance, hover tooltip, search) all work against the same underlying `lots` state built in §4.2. Manually test: hover an occupied cell → tooltip appears; type a car's ID into the search bar → correct cell scrolls+pulses.

### 5.3 Adding a car (existing)
**Steps**: `SpotCell.tsx` — clicking an *available* spot sets `store` state `activeModalSpotId` (or local `Dashboard` state) opening `AddCarModal` with `mode="existing"` default. Wire the `409 CAR_ALREADY_PARKED` / `404 CAR_NOT_FOUND` branches in the modal's mutation error handler to the exact copy in spec §5.3.

### 5.4 Adding a car (new)
**Steps**: `AddCarModal.tsx` "New car" tab renders the metadata form; on submit, `assignCar(spotId, {carId, newCar: {...}})`. Wire `409 CAR_ID_EXISTS` to the exact copy in spec §5.4.

### 5.5 Removing a car
**Steps**: `CarDetailPanel.tsx` "Remove car" button → simple inline confirm (`useState` toggling a "Are you sure?" sub-view in the same panel, not a separate modal, per spec) → `removeCar(spotId)` mutation → collapse panel on success.

### 5.6 Expanding car details
**Steps**: `SpotCell.tsx` click handler (on *occupied* cells) → `CarDetailPanel` opens for that spot, fetching `GET /api/cars/{carId}` (§3.10) for full metadata not present in the dashboard payload. Render: breadcrumb, car ID, owner name, employee ID, phone (conditionally), notes (conditionally), `assignedAt` (formatted relative or absolute timestamp), Remove button.

### 5.7 Creating a lot with a generated grid (Admin)
**Steps**: `LotList.tsx` "New Lot" → form with name + `<GridInput rows spotsPerRow>` (shared component from §3.5) → `createLot` mutation → on success, `navigate(`/admin/lots/${newLot.id}`)` to `LotEditor.tsx`, which lists the generated spots in a table (label, row, position, delete icon).

### 5.8 Editing/deleting spots (Admin)
**Steps**: `LotEditor.tsx` spot table — inline edit (click label → becomes an input, blur/enter → `updateSpot` mutation), delete icon → `deleteSpot` mutation, `409 SPOT_OCCUPIED` error rendered inline next to that row with the blocking `carId` from the error payload.

---

## 6. Real-Time Strategy

### 6.1–6.2 Transport setup

**Backend files**: `config/WebSocketConfig.java`, `websocket/LotUpdatePublisher.java`.

**Steps**:
1. `WebSocketConfig.java`:
   ```java
   @Configuration
   @EnableWebSocketMessageBroker
   public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
     public void registerStompEndpoints(StompEndpointRegistry registry) {
       registry.addEndpoint("/ws").setAllowedOrigins("${cors.allowed-origin}").withSockJS();
     }
     public void configureMessageBroker(MessageBrokerRegistry registry) {
       registry.enableSimpleBroker("/topic");
       registry.setApplicationDestinationPrefixes("/app"); // unused for now — no client→server messages needed
     }
   }
   ```
2. `websocket/LotUpdatePublisher.java`: thin wrapper around `SimpMessagingTemplate`:
   ```java
   @Component
   public class LotUpdatePublisher {
     private final SimpMessagingTemplate template;
     public void publishSpotUpdated(UUID lotId, ParkingSpot spot) {
       template.convertAndSend("/topic/lot-updates", new SpotUpdatedEvent(lotId, toSpotResponse(spot)));
     }
     // publishSpotCreated, publishSpotDeleted, publishLotCreated/Updated/Deleted — same pattern
   }
   ```
3. Inject `LotUpdatePublisher` into `AssignmentService` (§3.11/3.12) and `ParkingSpotService`/`ParkingLotService` (§3.5–3.8, 3.2–3.4) — call the matching `publish*` method at the end of every mutating service method, **after** the transaction's DB write succeeds (Spring's default propagation means the publish call at the end of an `@Transactional` method still runs before commit; if strict "only publish after commit" is desired, use `@TransactionalEventListener(phase = AFTER_COMMIT)` with a Spring `ApplicationEvent` instead of calling `LotUpdatePublisher` directly — recommended refinement once the direct-call version works).

### 6.3 Message contract

**Backend files**: `websocket/events/SpotUpdatedEvent.java`, `SpotCreatedEvent.java`, `SpotDeletedEvent.java`, `LotCreatedEvent.java`, etc. — each a simple record with a `type` discriminator field matching the spec's JSON envelope exactly (`{"type": "SPOT_UPDATED", "lotId": ..., "spot": {...}}`).

### 6.4 Client behavior

**Frontend file**: `src/hooks/useLotSocket.ts`.

**Steps**:
1. Build a small connection wrapper:
   ```ts
   import { Client } from '@stomp/stompjs';
   import SockJS from 'sockjs-client';

   export function useLotSocket() {
     const applySpotUpdate = useDashboardStore((s) => s.applySpotUpdate);
     const [connected, setConnected] = useState(false);

     useEffect(() => {
       const client = new Client({
         webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL),
         reconnectDelay: 3000,
         onConnect: () => {
           setConnected(true);
           client.subscribe('/topic/lot-updates', (msg) => {
             const evt = JSON.parse(msg.body);
             if (evt.type === 'SPOT_UPDATED') applySpotUpdate(evt);
             // else-if branches for SPOT_CREATED/DELETED, LOT_*
           });
         },
         onDisconnect: () => setConnected(false),
       });
       client.activate();
       return () => client.deactivate();
     }, []);

     return connected;
   }
   ```
2. `useLotsQuery.ts` (§4.3) consumes this hook's `connected` boolean to toggle `refetchInterval` between `false` and `30_000` — this is the literal implementation of the fallback described in spec §6.4.
3. Expose `connected` in the UI as a small status dot (optional but recommended for debugging during development — e.g. in `Dashboard.tsx`'s header).

---

## 7. Edge Cases

Each row in the spec's table is implemented as part of the service-layer logic already described above; this section is the checklist to verify against, plus where each lives.

| # | Where it's implemented | Verification step |
|---|---|---|
| 7.1 | `AssignmentService.assignCarToSpot` pre-check + `uq_car_assignments_active_spot` (§2.4, §3.11) | Manually assign a car to an occupied spot via API → expect `409 SPOT_OCCUPIED`. |
| 7.2 | Same method, `uq_car_assignments_active_car` | Assign an already-parked car ID to a different spot → expect `409 CAR_ALREADY_PARKED` with correct location. |
| 7.3 | `AssignmentService`/`CarService` existence check | `POST /api/cars` or assign-with-`newCar` using an existing ID → expect `409 CAR_ID_EXISTS`. |
| 7.4 | `ParkingLotService.deleteLot` / `ParkingSpotService.deleteSpot` | Try deleting an occupied spot/lot → expect `409` with the documented payload shape. |
| 7.5/7.6 | DB partial unique indexes (§2.4) + `GlobalExceptionHandler`'s `DataIntegrityViolationException` mapping | Load-test with two near-simultaneous `curl` requests (e.g. via `xargs -P2`) assigning different cars to the same spot → confirm exactly one `201` and one `409`, never two `201`s. |
| 7.7 | `CreateLotRequest`/`GridRequest` Bean Validation annotations | `POST /api/lots` with `spotsPerRow: 0` → expect `400 VALIDATION_ERROR`. |
| 7.8 | `@Size(min=6, max=6)` on all car-ID DTO fields | Submit a 5-char car ID → expect `400`. |
| 7.9 | `uq_parking_spots_lot_label` index + `SpotLabelTakenException` | Add a spot with a label already used in that lot → expect `409 SPOT_LABEL_TAKEN`; confirm the *same* label in a *different* lot succeeds. |
| 7.10 | `uq_parking_lots_name_ci` index + `LotNameTakenException` | Create two lots with names differing only in case → expect `409` on the second. |
| 7.11 | `useLotSocket.ts` disconnect → `useLotsQuery.ts` fallback polling | Kill the backend, confirm frontend keeps working off stale-but-refreshing data every 30s, no crash. |
| 7.12 | 404 handling in `AssignmentController`/`ParkingSpotController` + frontend error toast + refetch | Delete a spot in one tab, try to assign a car to it from a second (stale) tab → expect `404`, and add a `.catch` in the relevant mutation that triggers `queryClient.invalidateQueries(['lots'])` to resync. |

---

## 8. Performance Considerations

**What needs to be built**, concretely, beyond what's already described:

1. **`JOIN FETCH` query** (§3.1, step 2) — implement and verify with Hibernate SQL logging (`spring.jpa.properties.hibernate.generate_statistics=true` locally) that `GET /api/lots` issues a small constant number of queries, not one-per-spot.
2. **Batch assignment lookup** (§3.1, step 3) — `findBySpotIdInAndRemovedAtIsNull(List<UUID>)` instead of looping `findBySpotIdAndRemovedAtIsNull` per spot; add this repository method explicitly, don't skip it.
3. Do **not** build pagination, virtualized lists, or per-lot WebSocket topics in v1 — explicitly out of scope per the spec's scale target; leave a one-line code comment in `WebSocketConfig.java` noting `/topic/lot-updates` as the single-topic-by-design choice, so a future contributor doesn't "fix" it prematurely.
4. Load-test locally with a seed script (`db/migration/V3__dev_seed.sql`, dev-profile-only) generating 5 lots × 60 spots to confirm dashboard load time and WebSocket fan-out feel instant at the target scale before considering this section done.

---

## 9. Security Considerations

### 9.1 Rate limiting

**Backend files**: `config/RateLimitInterceptor.java`, `config/WebMvcConfig.java`.

**Steps**:
1. Add `bucket4j-spring-boot-starter` dependency (or hand-roll a simple in-memory `ConcurrentHashMap<String, Bucket>` keyed by client IP if avoiding the extra dependency).
2. `RateLimitInterceptor implements HandlerInterceptor`: in `preHandle`, only apply to write methods (`POST`/`PUT`/`DELETE`) — extract client IP (`request.getRemoteAddr()`, or `X-Forwarded-For` if behind Railway's proxy), look up/create a bucket allowing 30 requests/minute, consume 1 token; if empty, `response.setStatus(429)`, set `Retry-After` header, return `false`.
3. `WebMvcConfig implements WebMvcConfigurer`: register the interceptor over `/api/**`.

### 9.2 Spring Security scaffold

**Backend file**: `config/SecurityConfig.java`.

**Steps**:
1. ```java
   @Configuration
   @EnableWebSecurity
   public class SecurityConfig {
     @Bean
     public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
       http.csrf(csrf -> csrf.disable()) // stateless JSON API, no cookie-based session yet
           .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
       return http.build();
     }
   }
   ```
2. Leave a clear comment marking this as the "flip point" for future auth (§10) — e.g. `// TODO(auth): replace permitAll() with role-based rules once login exists (see spec §10)`.

### 9.3 CORS

**Backend file**: `config/WebConfig.java` (or inline in `SecurityConfig`).

**Steps**: `@Bean CorsConfigurationSource corsConfigurationSource()` restricting `allowedOrigins` to `${cors.allowed-origin}` (env var, set to the exact Railway frontend URL — never `"*"`), `allowedMethods` GET/POST/PUT/DELETE, applied via `http.cors(...)` in `SecurityConfig` and registered for both REST (`/api/**`) and the WebSocket handshake endpoint (`/ws`).

### 9.4 Input validation

Already covered per-endpoint in §3 via Bean Validation (`@NotBlank`, `@Size`, `@Min`/`@Max`) — no additional files; the action item here is discipline: every new DTO added later must carry these annotations before its controller is wired up, not after.

### 9.5 PII minimization

**Backend**: confirm `dto/SpotResponse.java`'s nested car field is `CarSummaryResponse {id, ownerName}` only — explicitly do **not** add `phoneNumber`/`notes`/`employeeId` to this DTO, even if convenient, so `GET /api/lots` never leaks full PII to the always-visible dashboard. Full detail only via `GET /api/cars/{carId}` (§3.10), which is only called on explicit user action (expanding a panel).

---

## 10. Future Improvements

No implementation required now — but leave the codebase in a state that doesn't block these later:

1. **Auth**: `SecurityConfig`'s `permitAll()` (§9.2) is the single flip point; `CarAssignment.createdByUserId`/`removedByUserId` columns already exist unused (§2.4) — when a `User` entity is added, populate these in `AssignmentService` from the authenticated principal.
2. **Reservations**: additive — new `Reservation` entity/table, new endpoints, new spot-status branch (`"reserved"`) in `ParkingSpotService.getStatus` and a new Tailwind color class in `SpotCell.tsx`. Does not require changing the existing `available`/`occupied` model, only extending it.
3. **Mobile support**: add responsive Tailwind breakpoints (`sm:`/`md:`) to `SpotGrid.tsx`/`Dashboard.tsx` — no new components required as a first pass.
4. **Assignment history reporting**: new read-only endpoint(s) (e.g. `GET /api/cars/{carId}/history`) over the existing `car_assignments` table — no schema change needed, it's already a full history log.
5. **Server-side search**: promote §3.13's client-side filter to `GET /api/cars/{carId}/location`, reusing `CarService.getCarWithLocation` (§3.10) logic almost verbatim.
6. **Per-lot WebSocket topics**: change `/topic/lot-updates` to `/topic/lots/{lotId}` in `WebSocketConfig`/`LotUpdatePublisher`, and update `useLotSocket.ts` to subscribe per-visible-lot instead of once globally.

---

## 11. Manual Railway Deployment (Human Task)

**This phase is not automated.** It requires an interactive `railway login` (browser OAuth) and provisions real, billed cloud resources tied to your personal Railway account — an agent should not do this without you present and explicitly driving it. Do this yourself once the backend/frontend are far enough along to be worth deploying (reasonable checkpoint: after §3 API Design is done, so there's a real API to hit — but the steps below work with just the §1 stub too).

**Prerequisites**: a Railway account (https://railway.app), the Railway CLI installed (`npm i -g @railway/cli` or see Railway's docs for your platform), and `railway login` completed in your own terminal.

**Steps** (mirrors spec §1.3):
1. From `backend/`, run `railway init` → creates the `parkinglot-api` service in a new (or existing) Railway project.
2. Run `railway add` and select the PostgreSQL plugin → creates `parkinglot-db`. Railway auto-injects `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` into `parkinglot-api`'s environment.
3. Deploy the backend: `railway up` (Railway auto-detects `backend/Dockerfile` and builds it). Confirm it boots by checking `railway logs` for `Started ParkingLotApplication`.
4. From `frontend/`, run `railway init` → creates `parkinglot-frontend` as a separate service in the same project (Railway's static-site/Nixpacks builder, or add an Nginx `Dockerfile` serving `dist/` if you prefer a container).
5. In the Railway dashboard (or `railway variables --set`), set `parkinglot-frontend`'s `VITE_API_BASE_URL` and `VITE_WS_URL` to `parkinglot-api`'s public URL (find it via `railway domain` on the api service, or generate one if it doesn't have one yet) — e.g. `https://parkinglot-api-production.up.railway.app/api` and `wss://parkinglot-api-production.up.railway.app/ws`.
6. Set `parkinglot-api`'s `CORS_ALLOWED_ORIGIN` env var to `parkinglot-frontend`'s public URL.
7. Redeploy both services if you changed env vars after the first deploy (`railway up` again, or trigger a redeploy from the dashboard).
8. **Verify**: `curl https://<api-url>/api/lots` should return `200 []` (or real data, if §2/§3 are done by then). Then open the frontend's public URL in a browser and confirm it loads without CORS errors in the console.
9. Once this is done, report back (or update this checklist yourself) so the automated work can pick back up knowing live infra exists — e.g. future phases' "verify end to end" steps could optionally also be checked against the live Railway URLs, not just localhost.

**Update (2026-09-14)**: `frontend/Dockerfile` now exists (multi-stage: Node build → `nginx:alpine` runtime), resolving step 4's "static-site builder or Dockerfile" choice in favor of the Dockerfile route, matching `backend/Dockerfile`'s pattern so both services auto-detect the same way when their Railway "Root Directory" is set (`backend` / `frontend`). Nginx serves `frontend/dist/` with SPA fallback (`try_files ... /index.html`, needed for `/admin` and `/admin/lots/:id` client-side routes) and listens on Railway's `$PORT` via `envsubst` on `frontend/nginx.conf.template` at container start (no hardcoded `EXPOSE` port, same as the backend). Verified locally: `docker build -t parkinglot-frontend frontend/` then `docker run -e PORT=8080 -p 18080:8080 parkinglot-frontend` — `curl` against `/`, `/admin`, and `/admin/lots/123` all returned `200` with the SPA shell (no 404s on client routes).
