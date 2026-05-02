# Demo script — 12-minute walkthrough

Designed for the operations manager review. Click-by-click, honest, no smoke and mirrors. The seed data already has the right shapes; the AI mock provider returns the same output every time so the demo is rehearsable.

## Prep (one-time, ~5 min)

```bash
git clone git@github.com:Stiggtechnologies/StiggOS.git
cd StiggOS
npm run setup        # boots local Supabase, applies migrations, seeds org+admin
npm run dev          # all four apps start in parallel
```

Sign in to all four:
- console      http://localhost:5173
- guard-mobile http://localhost:5174
- monitoring   http://localhost:5175
- portal       http://localhost:5176

## Walkthrough

### 0 · Setup (15s)
"This is StiggOS. Four surfaces, one Postgres, one auth. Everything you'll see is real — it queries the database, RLS gates every row by org, every mutation is in the audit log. The AI agents work without a key right now thanks to a deterministic mock; flipping to Claude/GPT/Gemini/Llama is one env var."

### 1 · Command Center (60s)
- Land on `/`. Point at the live counters and Activity feed.
- "Realtime via Supabase channels — when a guard clocks in over there, this updates here within ~1 second."
- Open another tab → guard-mobile → Sign in → click "Clock in / out" → watch Command Center increment.

### 2 · Incident Copilot (90s)
- Console → Incidents → New incident.
- Site: Northview REIT #5. Press the mic, say:
  "around 2 AM the east loading door alarm went off, two guys jumped into a dark sedan, partial plate ABC1, peeled off"
- Click Submit. The structured incident appears with category `trespass`, severity `high`, AI confidence ~78%, full who/what/when/where filled in.
- "We never lose the original narration — it's stored verbatim. The structured fields are what feed analytics, BI, and the client portal."

### 3 · AI Intelligence with citations (90s)
- Console → AI Intelligence.
- Click "Run compliance scan". Wait ~2s.
- Insights appear. Each one cites the source row (`guards:abc12345…`).
- "These are not hardcoded strings. They come from the deterministic Compliance package — Alberta SSIA, OHS, PIPEDA — which the model triages and prose-ifies. Every claim has a row pointer."

### 4 · Schedule Agent (90s)
- Console → Scheduling. Pick next Monday → Generate.
- Returns Accepted + Rejected. Show a Rejected reason: "SSIA license expires before shift end".
- "The model proposes; the code re-validates every constraint before insert. The model is a hint; code is law."

### 5 · Forensic Search (45s)
- Console → AI Intelligence → Forensic Search.
- Type: "incidents involving sedans in the last 30 days"
- Show the interpreted plan and rows.

### 6 · Mobile guard PWA (60s)
- Switch to guard-mobile. Show the four tabs.
- Tour scan → enter token → scan queued (offline indicator).
- Toggle airplane mode. Submit an incident. It queues. Toggle off. Watch it replay.
- Hold the panic button — show the GPS-captured alert.

### 7 · Monitoring (45s)
- Switch to the monitoring app. Camera grid + alert stream.
- Click an alert → drawer with triage actions and talk-down composer.
- "Escalate to incident" creates a row in `incidents` linked back to the alert.

### 8 · Client Portal (60s)
- Switch to portal. Sign in as a `role='client'` user.
- "Note: we're now seeing only this client's sites, incidents, invoices. RLS does that — same database, different policy path."
- Ask in plain English: "show me incidents at my sites in the last 7 days".

### 9 · Compliance + Audit (45s)
- Console → Compliance. Show license expiry table with a 25-day-warning row.
- Console → Audit Log. Show the trail of what we just did, with before/after JSON on click.

### 10 · Settings (30s)
- Console → Settings. Org config + member management. Toggle a service line.

### Wrap (30s)
- "What you saw: 4 surfaces, 13 working pages on the staff console, 4 working AI agents, 5 service lines, RLS + audit on every write, Stripe-ready billing, multi-LLM (we'll use Claude/Llama/GPT/Gemini interchangeably). What's not yet wired: real camera media gateway, real radio integration, full HR. The schema has hooks for all of them."

## Common questions during demo

| Q | A |
|---|---|
| "Where does the AI run?" | Supabase Edge Functions — server-side, key never leaves. |
| "Can it run on Llama instead of Claude?" | Yes. Set `OPENAI_BASE_URL=http://your-vllm-host/v1` and pick a model. Same code path. |
| "How is data isolated between clients?" | Postgres RLS on every table. The Postgres process literally refuses to return cross-org rows. |
| "Does the guard app work without service?" | Yes — local queue replays on reconnect. |
| "What about Trackforce/Silvertrac data?" | `npm run import:csv -- --kind=guards --file=guards.csv --org=…` — column aliases handle the common header variants. |
