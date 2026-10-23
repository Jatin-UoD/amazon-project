# Ring Integration Guide

## Official Documentation

- https://developer.ring.com/
- https://developer.amazon.com/docs/ring/develop.html

**Always verify against the current official docs.** Endpoints and OAuth details can change.

## What HomePilot Implements

| Feature                    | Status                          | Notes                                      |
|---------------------------|---------------------------------|--------------------------------------------|
| OAuth authorization skeleton | Implemented (needs credentials) | `/api/ring/authorize`, `/api/ring/callback` |
| Webhook receiver          | Implemented                     | `/api/ring/webhook`                        |
| Event storage + history   | Implemented                     | Per-household                              |
| Demo event simulator      | Implemented                     | `/api/ring/demo/inject` — clearly labelled |
| Motion → lighting routine | Via automation engine           | User-configured                            |
| Camera live view / control| Not implemented                 | Out of scope for appliance platform        |

## Setup Steps (Real Credentials)

1. Create a Ring developer account at the official developer portal.
2. Register an application and obtain `client_id` and `client_secret`.
3. Configure redirect URI to match `RING_REDIRECT_URI` (e.g. `https://your-api.example.com/api/ring/callback`).
4. Set environment variables:

```env
RING_CLIENT_ID=...
RING_CLIENT_SECRET=...
RING_REDIRECT_URI=https://your-api.example.com/api/ring/callback
RING_WEBHOOK_SECRET=...   # if webhooks use HMAC
```

5. Complete OAuth from the mobile app Settings → Ring → Connect.
6. Register webhook URL with Ring (per current developer docs).
7. Map Ring account / location to a HomePilot household (store encrypted tokens server-side only).

## Demo Without Credentials

```bash
# After login, inject a simulated motion event:
curl -X POST http://localhost:3000/api/ring/demo/inject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"<id>","eventType":"motion"}'
```

The UI and notifications will show **SIMULATED** labels. This is **not** proof of production Ring API access.

## Security

- Never store Ring tokens in the mobile app.
- Verify webhook signatures when `RING_WEBHOOK_SECRET` is set.
- Deduplicate events by Ring event ID when available.
- Respect user privacy and Ring's terms of service.
