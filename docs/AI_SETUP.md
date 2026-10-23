# AI Home Assistant Setup

## Principle

**AI is optional.** All device controls, schedules, energy calculations, and safety rules work without any model or API key.

## Recommended Local Model

| Item              | Value                                      |
|-------------------|--------------------------------------------|
| Preferred family  | Qwen2.5 / Qwen3 (when available)           |
| Suggested size    | 3B–4B Instruct                             |
| Example tag       | `qwen2.5:3b` (Ollama)                      |
| Licence           | Apache 2.0 / model-specific Alibaba terms  |
| Runtime           | Ollama or llama.cpp                        |
| RAM (approx.)     | 4–8 GB for 3B quantized                    |
| GPU               | Optional; CPU works for low QPS            |

## Local Setup (Ollama)

```bash
# Install from https://ollama.com
ollama pull qwen2.5:3b

# Backend .env
AI_PROVIDER=ollama
AI_ENDPOINT=http://localhost:11434
AI_MODEL=qwen2.5:3b
```

Restart the backend. `/api/ai/status` will report availability.

## Behaviour

1. User message → interpreter (LLM or rules)
2. Structured JSON intent validated with Zod
3. Capability + permission checks on backend
4. Safety policy (no direct hardware execution by model)
5. MQTT command → ACK → UI update

If the model is unavailable or returns invalid JSON, the **rule-based fallback** handles common phrases:

- "Turn off the living room lights"
- "Set fan speed to 3"
- "Set AC to 24"
- "Show electricity usage"
- "Bedtime" (with confirmation)

## Production

Point `AI_ENDPOINT` at a privately hosted compatible OpenAI-style or Ollama-compatible endpoint. Do not hardcode paid API keys. Do not assume any public free tier remains available.

## Limitations

- Small models may mis-parse complex multi-room scenes.
- Always require confirmation for bulk / security-sensitive actions.
- Model never receives credentials or executes shell commands.
