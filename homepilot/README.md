# HomePilot — One Home. One App. Total Control.

Production-oriented smart-home platform for monitoring and controlling household devices.

## Architecture Overview

```
┌─────────────────┐     HTTPS / WSS      ┌──────────────────────┐
│  Mobile App     │◄────────────────────►│  Backend (Fastify)    │
│  (Expo + RN)    │                      │  + Prisma + Postgres │
└─────────────────┘                      └──────────┬───────────┘
                                                    │ MQTT
                                                    ▼
                                         ┌──────────────────────┐
                                         │  MQTT Broker (Mosquitto)
                                         └──────────┬───────────┘
                                                    │
                         ┌──────────────────────────┼──────────────────────────┐
                         ▼                          ▼                          ▼
              ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
              │ Device Simulator │      │ ESP32 Controllers│      │ Ring Adapter     │
              │ (demo devices)   │      │ (real hardware)  │      │ (OAuth + webhooks)
              └──────────────────┘      └──────────────────┘      └──────────────────┘
```

### Technology Stack

| Layer        | Choice                          | Notes                                      |
|--------------|---------------------------------|--------------------------------------------|
| Mobile       | React Native + Expo + TypeScript| Expo SDK 52, Expo Router                   |
| Backend      | Node.js + Fastify + TypeScript  | Lightweight, high-performance              |
| Database     | PostgreSQL + Prisma ORM         | SQLite fallback for pure local dev         |
| Realtime     | MQTT (Mosquitto) + WebSockets   | Household-scoped topics                    |
| Validation   | Zod                             | Shared schemas                             |
| Auth         | JWT + refresh tokens            | Role-based (OWNER, ADMIN, MEMBER, GUEST)   |
| Charts       | victory-native / react-native-gifted-charts | Energy analytics                |
| AI           | Optional Qwen3 / Ollama         | Structured intent → validated commands     |
| Deployment   | Docker Compose                  | Backend + Postgres + Mosquitto             |

## Quick Start (Local Development)

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker & Docker Compose (recommended for Postgres + MQTT)
- Expo Go app on your phone (or Android/iOS emulator)

### 1. Clone & Install

```bash
cd homepilot
npm install
```

### 2. Environment

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit .env if needed (defaults work with docker-compose)
```

### 3. Start Infrastructure

```bash
docker compose up -d
# Starts: PostgreSQL (5432), Mosquitto MQTT (1883, 9001)
```

### 4. Database Setup

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Start Backend

```bash
npm run dev:backend
# API: http://localhost:3000
# Swagger: http://localhost:3000/docs
# Health: http://localhost:3000/health
```

### 6. Start Device Simulator

```bash
npm run simulator
# Publishes realistic device state & energy readings via MQTT
```

### 7. Start Mobile App

```bash
npm run dev:mobile
# Scan QR with Expo Go, or press `a` / `i` for emulator
```

Default demo login:

- Email: `demo@homepilot.app`
- Password: `HomePilot2024!`

## Project Structure

```
homepilot/
├── apps/
│   ├── backend/          # Fastify API, Prisma, MQTT, AI adapter, Ring adapter
│   └── mobile/           # Expo React Native app
├── packages/
│   └── shared/           # Zod schemas, types, constants shared by mobile & backend
├── simulator/            # Realistic software device + energy simulator
├── docs/                 # Architecture, Ring setup, AI setup, controller firmware notes
├── docker-compose.yml
├── package.json          # Workspaces root
└── README.md
```

## Key Features Implemented

- ✅ Onboarding, auth, household creation
- ✅ Capability-based device registry
- ✅ Room-wise & detailed device controls (ON/OFF, brightness, fan speed, AC temp/mode, etc.)
- ✅ Live system health dashboard
- ✅ MQTT device simulator with heartbeats, ACKs, state reports
- ✅ Energy metering abstraction + analytics charts
- ✅ Automation engine (schedules, state triggers, energy thresholds)
- ✅ Water tank & pump monitoring (simulated)
- ✅ Ring integration path (OAuth + webhook skeleton + demo event simulator)
- ✅ Optional AI assistant (Ollama/Qwen3 or rule-based fallback)
- ✅ Role-based permissions
- ✅ Notifications & activity history
- ✅ Docker deployment ready
- ✅ OpenAPI/Swagger docs

## Important Distinctions

| Type                    | Label in UI              | Behavior                                      |
|-------------------------|--------------------------|-----------------------------------------------|
| Simulated demo devices  | "Simulated" badge        | Full control via MQTT simulator               |
| Real hardware (future)  | Integration-specific     | Requires paired controller / certified device |
| Ring devices            | Ring logo / "Ring"       | Events & notifications only; not appliance control |
| AI                      | Optional                 | Falls back to deterministic rules if no model |

## AI Configuration (Optional)

AI is **never required** for core controls.

Local development (recommended):

```bash
# Install Ollama → https://ollama.com
ollama pull qwen2.5:3b   # or qwen3 equivalent when available
# Set in backend .env:
AI_PROVIDER=ollama
AI_ENDPOINT=http://localhost:11434
AI_MODEL=qwen2.5:3b
```

If `AI_PROVIDER` is unset or unreachable, the backend uses a deterministic rule-based parser for common commands.

See `docs/AI_SETUP.md` for licence, resource requirements, and limitations.

## Ring Integration

See `docs/RING_INTEGRATION.md` for official developer account setup, OAuth flow, webhook verification, and the demo-event simulator.

The simulator can inject motion events for hackathon demos without real Ring credentials.

## Security Notes

- Household isolation enforced at every query
- Commands validated against device capabilities server-side
- MQTT topics scoped by household ID
- No secrets in mobile code
- Rate limiting & audit logs
- Sensitive actions require confirmation
- Electrical safety remains the responsibility of certified hardware and independent local protection

## Deployment

See `docs/DEPLOYMENT.md` for production HTTPS, environment variables, migrations, and public endpoint configuration.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Acceptance Checklist

- [x] Mobile app launches and navigation works
- [x] Demo devices controllable; state persists
- [x] Fan speed / brightness / AC controls respect capabilities
- [x] Command lifecycle: pending → confirmed / failed / offline
- [x] Energy charts update from simulator readings
- [x] Units & estimated costs calculated correctly
- [x] Automations execute without loops
- [x] Permissions block unauthorised actions
- [x] AI absence does not break controls
- [x] Ring path documented + demo simulator
- [x] Deployment instructions match the project

## Hackathon Submission

**One-liner:** HomePilot unifies lights, climate, energy, water, and Ring security into a single production-ready mobile app with optional local AI and a full device simulator.

**Demo script (< 3 min):** See `docs/DEMO_SCRIPT.md`.

## Licence

MIT (application code). Device firmware interfaces and third-party SDKs retain their respective licences. Qwen models follow their Alibaba licences.
