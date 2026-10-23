# Ring Integration

Official docs: https://developer.ring.com/ and https://developer.amazon.com/docs/ring/develop.html

## Implemented

- OAuth skeleton (`/api/ring/authorize`, `/callback`)
- Webhook receiver (`/api/ring/webhook`)
- Demo event simulator (`/api/ring/demo/inject`) — labelled SIMULATED
- Automation hook (motion → lighting routine)

## Demo without credentials

```bash
curl -X POST http://localhost:3000/api/ring/demo/inject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"<id>","eventType":"motion"}'
```

Ring is events-only — not a general appliance controller.
