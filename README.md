# HomePilot — One Home. One App. Total Control.

Production-oriented smart-home platform for monitoring and controlling household devices.

**Amazon Ring Hackathon project** — Expo mobile app + Fastify backend + MQTT + optional local AI + Ring integration path.

## Quick Start

```bash
npm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev:backend   # http://localhost:3000  ·  /docs
npm run simulator
cd apps/mobile && npx expo start
```

**Demo login:** `demo@homepilot.app` / `HomePilot2024!`

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
apps/mobile/      Expo React Native app
packages/shared/  Zod schemas + shared types
simulator/        MQTT device + energy simulator
docs/             Ring, AI, deployment, demo script
```

See `docs/HACKATHON.md` and `docs/DEMO_SCRIPT.md` for submission notes.

## Licence

MIT
