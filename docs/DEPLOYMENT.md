# Deployment Guide

## Local Full Stack

```bash
docker compose up -d          # Postgres + Mosquitto
cd apps/backend && cp .env.example .env
npm install                   # from monorepo root
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:backend           # terminal 1
npm run simulator             # terminal 2
npm run dev:mobile            # terminal 3
```

## Production Checklist

1. **Secrets**: Strong `JWT_SECRET`, database password, MQTT credentials. Use a secrets manager.
2. **HTTPS**: Terminate TLS at a reverse proxy (Caddy, nginx, Traefik, or platform load balancer).
3. **Database**: Managed PostgreSQL; run migrations in CI/CD.
4. **MQTT**: Do not expose Mosquitto anonymously to the public internet. Use TLS + authentication. Prefer a private network between backend and broker.
5. **CORS**: Set `CORS_ORIGIN` to your mobile / web origins.
6. **PUBLIC_API_URL**: Must be reachable HTTPS URL (not localhost) for any deep links or OAuth redirects.
7. **Mobile builds**: Configure `EXPO_PUBLIC_API_URL` to the public API before EAS build.

## Example Production Env

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-host:5432/homepilot
JWT_SECRET=<32+ random bytes>
MQTT_URL=mqtts://mqtt.internal:8883
MQTT_USERNAME=homepilot
MQTT_PASSWORD=<secret>
CORS_ORIGIN=https://app.homepilot.example
PUBLIC_API_URL=https://api.homepilot.example
AI_PROVIDER=ollama
AI_ENDPOINT=http://ai-internal:11434
AI_MODEL=qwen2.5:3b
```

## Docker Backend Image (optional)

```dockerfile
# apps/backend/Dockerfile (example)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
CMD ["node", "dist/index.js"]
```

## Limitations Honesty

- Free-tier Postgres / hosting may sleep or have connection limits.
- A continuously running GPU model endpoint is rarely free.
- SMS / push notification providers have quotas.
- Real Ring production access requires developer approval and compliance.
