# Deployment Guide

## Local

```bash
docker compose up -d
npm install
cp apps/backend/.env.example apps/backend/.env
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev:backend
npm run simulator
cd apps/mobile && npx expo start
```

## Production notes

- Strong JWT_SECRET, HTTPS termination, private MQTT
- PUBLIC_API_URL must be reachable HTTPS (not localhost)
- Free tiers may sleep; do not assume permanent free GPU/AI
