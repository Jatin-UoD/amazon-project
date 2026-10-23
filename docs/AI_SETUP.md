# AI Home Assistant Setup

## Principle

**AI is optional.** All device controls, schedules, energy calculations, and safety rules work without any model or API key.

## Recommended Local Model

| Item | Value |
|------|-------|
| Preferred family | Qwen2.5 / Qwen3 |
| Suggested size | 3B–4B Instruct |
| Example tag | `qwen2.5:3b` (Ollama) |
| Runtime | Ollama or llama.cpp |
| RAM (approx.) | 4–8 GB for 3B quantized |

## Local Setup (Ollama)

```bash
ollama pull qwen2.5:3b
# Backend .env
AI_PROVIDER=ollama
AI_ENDPOINT=http://localhost:11434
AI_MODEL=qwen2.5:3b
```

If unset, rule-based fallback handles common commands.

See full docs in project for licence and limitations.
