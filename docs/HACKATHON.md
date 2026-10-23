# HomePilot — Hackathon Submission

## One-liner

HomePilot unifies lights, climate, energy, water, and Ring security into a single production-oriented mobile app with optional local AI, a full MQTT device simulator, and a documented real Ring integration path.

## Problem

Homeowners juggle multiple apps for lights, AC, pumps, energy meters, and security cameras. Most "smart home" demos hide capability gaps and invent live data.

## Solution

- **One app** (Expo + React Native) for monitoring and control
- **Capability-based device registry** — a simple relay is never shown as a fan-speed controller
- **Honest labelling** — Simulated vs Measured vs Estimated
- **Ring track** — Official OAuth/webhook path + clearly labelled demo event injector
- **Optional AI** — Qwen/Ollama or deterministic rules; model never drives hardware directly
- **Energy intelligence** — live power, kWh, tariff-based cost, charts, CSV export
- **Production stack** — Fastify, Prisma, PostgreSQL, MQTT, Docker Compose, JWT RBAC

## Tech highlights for judges

| Area | Implementation |
|------|----------------|
| Mobile | Expo Router, dark/light themes, working controls |
| API | REST + Swagger, Zod validation, rate limits |
| Realtime | MQTT topics scoped by household |
| Simulator | Same protocol as future ESP32 controllers |
| Ring | Status endpoint, webhook, demo inject, automation hook |
| AI | Structured intent → capability checks → MQTT |
| Deploy | docker-compose, env examples, deployment guide |

## Demo credentials

- Email: `demo@homepilot.app`
- Password: `HomePilot2024!`

## Run (local)

See root `README.md`. Requires Node 20+, Docker for Postgres/Mosquitto (or equivalent).

## What requires external setup

- **Real Ring production tokens** — need developer account (documented)
- **Physical ESP32 controllers** — firmware interface documented; simulator used for demo
- **Local AI model** — optional; rules work without it

## Licence

MIT (application code).
