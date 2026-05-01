# LLM Providers

StiggOS is **provider-agnostic**. The agent harness operates on a normalized message shape; vendor-specific wire formats are confined to one adapter file each. Switching providers (or self-hosting) is a config change, never a code change.

## Supported

| Provider             | Adapter name          | Setup                                                            |
|----------------------|-----------------------|------------------------------------------------------------------|
| **Anthropic Claude** | `anthropic`           | `ANTHROPIC_API_KEY`                                              |
| **OpenAI**           | `openai`              | `OPENAI_API_KEY`                                                 |
| **Google Gemini**    | `google`              | `GOOGLE_API_KEY`                                                 |
| **Open-source / self-hosted** | `openai_compatible` | `OPENAI_BASE_URL` (+ optional `OPENAI_API_KEY`)         |
| **Deterministic mock** | `mock`              | `AI_FORCE_MOCK=1` — for tests / offline                          |

The same code path exercises all five.

## Auto-selection

`LLM_PROVIDER=auto` (default) picks the first that's wired:

1. `AI_FORCE_MOCK=1` → mock
2. `ANTHROPIC_API_KEY` → anthropic
3. `OPENAI_API_KEY` → openai
4. `OPENAI_BASE_URL` (without an OpenAI key) → openai_compatible
5. `GOOGLE_API_KEY` → google

Force a specific one with `LLM_PROVIDER=anthropic|openai|openai_compatible|google|mock`.

## Open source — concrete examples

Every server below speaks the OpenAI chat-completions API, so they all work via `openai_compatible`.

### Ollama (local laptop)

```bash
ollama pull llama3.3:70b-instruct
ollama pull llama3.1:8b-instruct
```

`.env`:
```
LLM_PROVIDER=openai_compatible
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL_AGENT=llama3.3:70b-instruct
OPENAI_MODEL_FAST=llama3.1:8b-instruct
```

### vLLM (self-hosted GPU box)

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --port 8000 --enable-auto-tool-choice --tool-call-parser llama3_json
```

```
OPENAI_BASE_URL=http://your-vllm-host:8000/v1
OPENAI_MODEL_AGENT=meta-llama/Llama-3.3-70B-Instruct
```

### llama.cpp server

```bash
./server -m models/Llama-3.3-70B-Instruct-Q4_K_M.gguf --host 0.0.0.0 --port 8080
```

```
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_MODEL_AGENT=local
```

### Hosted-but-open ecosystems

Same `openai_compatible` adapter, just a different base URL + key.

| Service       | `OPENAI_BASE_URL`                              | Notes                               |
|---------------|------------------------------------------------|-------------------------------------|
| Groq          | `https://api.groq.com/openai/v1`               | Fastest open-source inference       |
| Together      | `https://api.together.xyz/v1`                  | Llama, Mistral, Qwen, DeepSeek      |
| Fireworks     | `https://api.fireworks.ai/inference/v1`        | Function-calling on most models     |
| OpenRouter    | `https://openrouter.ai/api/v1`                 | One key, every model on the market  |
| DeepInfra     | `https://api.deepinfra.com/v1/openai`          |                                     |
| Hyperbolic    | `https://api.hyperbolic.xyz/v1`                | Cheap Llama-405B                    |

## Tool calling compatibility

The four production agents (Incident Copilot, Schedule Agent, Compliance Co-pilot, Forensic Search) all use **tool calling**. Confirmed-working tool-calling models:

* Claude (Opus 4.x, Sonnet 4.x, Haiku 4.x)
* GPT-4o, GPT-4.x, GPT-4o-mini
* Gemini 2.5 Pro / Flash
* Llama 3.3 70B Instruct, Llama 3.1 70B / 8B Instruct (via Ollama / vLLM with tool-call parser enabled)
* Mistral Large / Nemo Instruct
* Qwen 2.5 72B Instruct
* DeepSeek-V3 Chat

Smaller models (Llama 3.2 3B, Phi-3.5-mini) often work for the simpler agents (Incident Copilot, Compliance Co-pilot) but struggle with multi-tool plans. If a self-hosted model is too small to plan reliably, set `OPENAI_MODEL_AGENT` to a larger model and keep `OPENAI_MODEL_FAST` at the small one.

## Cost telemetry

`ai_sessions` records input/output/cache tokens per call. The cost calculation in `packages/ai/src/models.ts` knows pricing for the major API providers. Self-hosted models log $0 marginal cost — adjust if you want to model amortized GPU cost.

## Capabilities matrix

| Feature                    | Anthropic | OpenAI | Google | OSS / OpenAI-compat | Mock |
|----------------------------|:---------:|:------:|:------:|:-------------------:|:----:|
| Tool calling               | ✅        | ✅     | ✅     | ✅ (model-dependent)| ✅   |
| Prompt caching             | ✅        | partial| partial| varies              | ✅   |
| Streaming (planned)        | ✅        | ✅     | ✅     | ✅                  | n/a  |
| Image input (planned)      | ✅        | ✅     | ✅     | varies              | n/a  |

Streaming + image inputs are not used by the four agents today; the adapter shapes already accommodate adding them.

## Why no SDK dependencies?

Every adapter uses `fetch`. No `@anthropic-ai/sdk`, no `openai`, no `@google/generative-ai`. Reasons:

* The Deno edge runtime bundles size matter — fewer cold-start MB.
* Less surface to keep in sync when vendors version-bump.
* The four wire formats are stable and well-documented; we'd be hand-rolling 95% of the SDK code anyway.

## Adding another provider

Drop a file in `packages/ai/src/providers/` exporting a `Provider`. Wire it into `provider.ts`'s `build()`. Mirror the same in `supabase/functions/_shared/llm.ts`. ~150 lines per side.
