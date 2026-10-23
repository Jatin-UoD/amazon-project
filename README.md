# HomePilot — One Home. One App. Total Control.

Production-oriented smart-home platform for monitoring and controlling household devices.

**Repo:** https://github.com/Jatin-UoD/amazon-project

## Quick Start (Hackathon / Local)

### Prerequisites

- Node.js ≥ 20
- Docker Desktop (Postgres + MQTT)
- Expo Go on phone (or emulator)

### Run

```bash
git clone https://github.com/Jatin-UoD/amazon-project.git
cd amazon-project
npm install

# Start Postgres + Mosquitto
docker compose up -d

# Backend env
cp apps/backend/.env.example apps/backend/.env

# Database (use db:push — no migration files required)
npm run db:generate
npm run db:push
npm run db:seed

# Terminal 1 — API
npm run dev:backend
# http://localhost:3000  ·  Swagger: /docs

# Terminal 2 — device simulator
npm run simulator

# Terminal 3 — mobile
npm run dev:mobile
# or: cd apps/mobile && npx expo start
```

**Demo login**

- Email: `demo@homepilot.app`
- Password: `HomePilot2024!`

If the phone cannot reach `localhost`, set API URL to your PC LAN IP:

```bash
# Windows example
set EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
cd apps/mobile && npx expo start
```

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo + TypeScript |
| Backend | Node.js + Fastify + Prisma + PostgreSQL |
| Realtime | MQTT (Mosquitto) |
| AI | Optional Ollama/Qwen + rule-based fallback |
| Ring | OAuth skeleton + webhook + demo event simulator |

## Structure

```
apps/backend/     Fastify API, Prisma, MQTT, AI, Ring
apps/mobile/      Expo app (screens + controls)
packages/shared/  Zod schemas + types
simulator/        MQTT device + energy simulator
docs/             Ring, AI, deploy, demo script
docker-compose.yml
```

## Features

- Capability-based device control (lights, fans, AC, plugs, curtains, pump, sensors)
- Energy live + history + estimated bill
- Ring security events (demo inject if no credentials)
- Optional AI assistant (works without AI via rules)
- Automations, roles, activity log
- Docker Compose for Postgres + MQTT

## Honest labels

| Type | UI |
|------|-----|
| Simulator devices | "Simulated" / SIM badge |
| Ring without credentials | Demo inject, SIMULATED events |
| AI without model | Rule-based commands still work |

## Docs

- `docs/DEMO_SCRIPT.md` — under 3 min demo
- `docs/HACKATHON.md` — submission notes
- `docs/RING_INTEGRATION.md`
- `docs/AI_SETUP.md`
- `docs/DEPLOYMENT.md`

## Licence

MIT
