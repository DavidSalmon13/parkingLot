# Parking Lot Manager

A live dashboard for tracking where every car is parked across a company's parking lots. It's in daily use at a car dealership: staff register cars by chassis number, park them in spots, and see every lot update in real time on every screen, without refreshing.

The interface is in Hebrew (right-to-left).

## Features

- **Live dashboard.** Every lot is shown as a grid of spots, green when free and red when taken, with the car shown in each taken spot. Changes made on one screen appear on all the others immediately.
- **Find any car.** Search by chassis number to jump to the lot and spot where the car is parked.
- **Cars.** Register a car on its own or while parking it, edit its details (type, plate, client, delivery date) and see where it's parked.
- **Lot layout.** Create lots with a grid of rows and spots, then add or remove spots and rows as the lot changes.
- **Safe by design.** A spot can hold only one car, a car can be in only one spot, and a lot, row or spot with a car in it can't be deleted.
- **History.** Removing a car from a spot ends its assignment instead of deleting it, so past assignments are kept.

## Tech stack

| Part | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4 (Web MVC, Data JPA, Validation, Security, WebSocket) |
| Database | PostgreSQL, schema managed with Flyway migrations |
| Real-time | STOMP over WebSocket (with SockJS fallback), plus polling while disconnected |
| Frontend | React 19, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS |
| Deployment | Docker images for the backend and frontend (Nginx), hosted on Railway |

## How it works

```
React app  ──REST──►  Spring Boot API  ──JPA──►  PostgreSQL
    ▲                       │
    └───── WebSocket ◄──────┘   (pushes each change to every open dashboard)
```

- **Layered backend:** controllers → services (business rules) → repositories, with a global exception handler that turns each rule violation into a clear error message.
- **Rules enforced twice:** the services check them first to return a friendly error, and the database enforces them with constraints (for example a partial unique index allowing only one active assignment per spot), so two people can't park two cars in the same spot at the same moment.
- **Real-time updates:** after every change the backend broadcasts an event (spot updated, lot created, …) that each dashboard applies to its local state. If the connection drops, the dashboard falls back to refreshing every 30 seconds until it reconnects.
- **Protection:** input validation on every endpoint, per-IP rate limiting on writes, and CORS restricted to the frontend's own address.

## Running locally

You need Java 21, Node.js 20+ and PostgreSQL.

```bash
git clone https://github.com/DavidSalmon13/parkingLot.git
cd parkingLot

# Backend: http://localhost:8080 (expects a local "parkinglot" database, see application.yml)
cd backend
./mvnw spring-boot:run
# Optional: SPRING_PROFILES_ACTIVE=dev also loads sample data (5 lots, 300 spots)

# Frontend: http://localhost:5173
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Tests

```bash
cd backend
./mvnw test -Dtest='*ServiceTest'
```

These unit tests cover the business rules (parking, removing cars, deleting lots and spots, resizing rows, numbering spots) with mocked repositories, so they need no database. Running plain `./mvnw test` also runs a Spring context test, which needs a local PostgreSQL.

## Project layout

```
backend/    Spring Boot API: controllers, services, entities, repositories, Flyway migrations
frontend/   React + TypeScript app
spec.md     Technical specification (data model, API, real-time design, edge cases)
plan.md     Implementation plan
```
