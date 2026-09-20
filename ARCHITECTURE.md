# Architecture — HireFlow

## 1. System overview

```
┌─────────────────┐      ┌──────────────────────────────────────────┐      ┌─────────────┐
│   Frontend       │      │              n8n (orchestrator)           │      │  LLM API    │
│  (Next.js)       │      │                                            │      │ (Claude)    │
│                  │──1──▶│  Webhook (ingest)                          │      │             │
│ Upload JD+resumes│      │      │                                     │      │             │
│ Pipeline status  │      │      ▼                                     │      │             │
│ Shortlist table  │      │  Parse files (PDF/text → text)             │      │             │
│ Candidate drawer │      │      │                                     │      │             │
│ NL query box     │      │      ▼                                     │      │             │
│ Interview-notes  │◀──2──│  LLM: extract JD requirements    ──────────┼─────▶│             │
│ paste box        │      │  LLM: extract candidate profile   ─────────┼─────▶│             │
│                  │      │      │                                     │      │             │
│                  │      │      ▼                                     │      │             │
│                  │      │  LLM: match & score               ─────────┼─────▶│             │
│                  │      │      │                                     │      │             │
│                  │      │      ▼                                     │      │             │
│                  │      │  Function: rank & group                    │      │             │
│                  │      │      │                                     │      │             │
│                  │      │      ▼                                     │      │             │
│                  │      │  LLM: summary + interview Qs + follow-ups ─┼─────▶│             │
│                  │      │      │                                     │      │             │
│                  │      │      ▼                                     │      │             │
│                  │      │  Write to DB (Supabase)                    │      │             │
│                  │      │      │                                     │      │             │
│                  │◀──3──│  Webhook response                          │      │             │
│                  │      │                                            │      │             │
│                  │──4──▶│  Webhook (NL query)  → LLM (with DB context)──────▶│             │
│                  │──5──▶│  Webhook (interview notes) → LLM (analysis) ──────▶│             │
└──────────────────┘      └──────────────────────────────────────────┘      └─────────────┘
```

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) + Tailwind | Fast to scaffold with opencode; good default styling primitives |
| Coding agent | opencode | Scaffolds frontend + thin API routes; terminal-based, fast iteration |
| Orchestration | n8n (cloud trial) | Visual pipeline, easy webhook triggers, no custom backend needed for the agent chain |
| LLM | Claude API (Sonnet) | Strong structured-output + long-context resume reasoning |
| File parsing | n8n's PDF extraction node (or a small Python/Node function node) | Avoid building a custom parser |
| Storage | Supabase (Postgres) — or Airtable if you want zero-schema setup | Needs to hold candidate JSON, scores, audit snippets for the NL-query step to reuse |
| Hosting (demo) | Vercel (frontend) + n8n cloud (workflow) | No infra work during the hackathon |

**Why not skip storage and keep everything in-memory?** The natural-language query
feature needs to query *all* candidates for the active JD after the pipeline has run —
that requires persistence, not just passing data through a single request/response.

## 3. Data contracts (JSON schemas)

### 3.1 JD requirements (output of JD-parsing LLM call)
```json
{
  "role_title": "string",
  "seniority_years_min": 0,
  "seniority_years_max": 0,
  "required_skills": ["string"],
  "nice_to_have_skills": ["string"],
  "responsibilities": ["string"]
}
```

### 3.2 Candidate profile (output of extraction LLM call)
```json
{
  "candidate_id": "string",
  "skills": [
    { "name": "string", "source_snippet": "string" }
  ],
  "years_experience": 0,
  "projects": [
    { "description": "string", "source_snippet": "string" }
  ],
  "education": [{ "detail": "string", "source_snippet": "string" }],
  "missing_or_unclear": ["string"],
  "confidence": "high | medium | low"
}
```

### 3.3 Match/score (output of scoring LLM call)
```json
{
  "candidate_id": "string",
  "overall_score": 0,
  "bucket": "strong_fit | possible | not_a_fit",
  "skill_match_pct": 0,
  "experience_fit": "string",
  "gaps": ["string"],
  "justification": "string",
  "justification_sources": ["source_snippet strings referenced"]
}
```

### 3.4 Interview kit (output of question-gen LLM call)
```json
{
  "candidate_id": "string",
  "summary_paragraph": "string",
  "questions": [
    {
      "question": "string",
      "question_type": "gap_validation | strength_verification",
      "target": "string",
      "follow_ups": ["string", "string"]
    }
  ]
}
```
Composition is deterministic, not model judgment: one gap_validation question
per item in `gaps` + `missing_or_unclear` (capped at 5, gaps prioritized),
followed by exactly 2 strength_verification questions on JD-required skills the
candidate has. Gap-validation questions always come first in the array. See
PROMPTS.md section 4 for the exact rules.
  "candidate_id": "string",
  "summary_paragraph": "string",
  "questions": [
    {
      "question": "string",
      "targets_gap": "string",
      "follow_ups": ["string", "string"]
    }
  ]
}
```

### 3.5 Interview-notes analysis (output of post-interview LLM call)
```json
{
  "candidate_id": "string",
  "requirement_coverage": [
    { "requirement": "string", "covered": true, "evidence": "string" }
  ],
  "unanswered_areas": ["string"],
  "evaluation_report": "string"
}
```

## 4. n8n workflow — node list

**Ingest architecture**: ONE resume per webhook call — not a batch/array. The
frontend loops per resume (see AGENTS.md); n8n does not internally loop over a
resume array. This was a deliberate decision to avoid restructuring an
already-validated pipeline late in the build. Every ingest call includes
`jd_id` (a stable string identifying the role, e.g. `"backend-eng-v1"`),
supplied by the frontend, so multiple candidates can later be grouped and
queried together by role.

Actual node names in the built workflow (canvas: `hireflow`), status as of
last update:

| # | Node (as named in n8n) | Type | Status | Notes |
|---|---|---|---|---|
| 1 | Webhook | Webhook | ✅ Built | Receives `{ jd, jd_id, resume_text, candidate_id }` — one resume per call |
| 2 | Parse JD | HTTP Request (Groq) | ✅ Built, validated | Returns raw Groq response wrapping schema 3.1 |
| 2b | Unwrap JD | Code | ✅ Built | `JSON.parse(choices[0].message.content)` |
| 2c | Wrap JD | Edit Fields | ✅ Built | Nests result under `{ jd: {...} }` |
| 3 | Parse Resume | HTTP Request (Groq) | ✅ Built, validated | Runs in parallel with Parse JD, same webhook trigger |
| 3b | Unwrap Resume | Code | ✅ Built | Same unwrap pattern |
| 3c | Wrap Resume | Edit Fields | ✅ Built | Nests result under `{ candidate: {...} }` |
| 4 | Merge (1) | Merge, Combine by Position | ✅ Built | Joins Wrap JD + Wrap Resume → `{ jd, candidate }` |
| 5 | Match & Score | HTTP Request (Groq) | ✅ Built, validated | Input: `$json.jd` + `$json.candidate`, returns schema 3.3 |
| 5b | Unwrap Score | Code | ✅ Built | Same unwrap pattern |
| 5c | Bucket Check | Code | ✅ Built | Deterministically recomputes `bucket` from `overall_score`, overriding the model's self-reported value if they disagree — caught one real wiring bug this way |
| 5d | Wrap Score | Edit Fields | ⬜ Next | Nests result under `{ score: {...} }` |
| 6 | Merge (2) | Merge, Combine by Position | ⬜ Next | Joins Merge(1) output (branched, not re-consumed) + Wrap Score → `{ jd, candidate, score }`. Two Merge nodes needed to avoid a circular dependency — do not attempt a single 3-input Merge here |
| 7 | Interview Kit | HTTP Request (Groq) | ⬜ Not built | Input: Merge(2) output, prompt in PROMPTS.md section 4, returns schema 3.4 |
| 7b | Unwrap Kit | Code | ⬜ Not built | Same unwrap pattern |
| 8 | Write to Supabase | Supabase node | ⬜ Not built | Insert row: id, jd_id, profile_json, score_json, kit_json, status |
| 9 | Respond | Respond to Webhook | ⬜ Not built | Returns the single candidate's full result to the caller |
| — | Get Shortlist | Supabase (Get Many, filtered by jd_id) + sort | ⬜ Not built, real gap | This is what actually delivers "grouping" — per-candidate scoring alone does not compare candidates against each other. Needed before demo. |
| 10-12 | NL Query (separate webhook) | Webhook → Supabase Get Many → HTTP Request | ⬜ Not built | PROMPTS.md section 5 |
| 13-14 | Interview Notes (separate webhook) | Webhook → HTTP Request | ⬜ Not built | PROMPTS.md section 6 |
| 13 | Interview Notes Webhook | Webhook (separate trigger) | Input: pasted notes + candidate_id |
| 14 | Analyze Notes | HTTP Request (Claude API) | Input: notes + JD requirements + candidate profile, returns schema 3.5 |

## 5. Error handling

- Node 2/4: if parsing fails, tag candidate `status: parse_failed`, continue batch.
- Nodes 3/4/5/7/12/14: validate JSON with a Function node; on parse failure, retry
  the HTTP Request node once with a "your last response was invalid JSON, return
  only valid JSON matching the schema" instruction appended.
- All webhook responses include a `status` field (`ok` / `partial` / `error`) so the
  frontend can render partial results instead of a blank screen.

## 6. Environment variables

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
N8N_INGEST_WEBHOOK_URL=
N8N_QUERY_WEBHOOK_URL=
N8N_NOTES_WEBHOOK_URL=
```

## 7. MCP / skills — what you actually need

- **No MCP server is required for this build.** n8n handles all external calls
  (LLM API, Supabase) natively through its own HTTP/DB nodes — MCP is for giving an
  LLM tool access *inside a conversation*, which isn't how this pipeline works (it's
  n8n calling the LLM, not the LLM calling tools).
- **opencode** just needs standard filesystem + terminal access (its default mode) to
  scaffold the Next.js app — no special skill or MCP needed there either.
- If you want to go further after the core is working: a **Supabase MCP server**
  would let you (the developer) query your candidate DB conversationally while
  debugging — genuinely useful, but optional and not demo-facing.
