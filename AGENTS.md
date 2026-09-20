# AGENTS.md — instructions for opencode

This file is read by opencode as persistent project context. Keep it at the repo
root. Update the "Current status" section as you progress — this is what keeps the
agent's suggestions relevant across sessions instead of re-explaining the project
every time.

## Project

HireFlow — a recruiter-facing dashboard that lets a recruiter upload a job
description and a batch of resumes, and see a ranked, evidence-backed shortlist
with auto-generated interview kits. Full spec: see `PRD.md` and `ARCHITECTURE.md`
in this repo — read both before generating code for the first time.

This is a 2-day hackathon build. Prioritize working end-to-end over polish. Do not
add features not listed in `PRD.md` section 4 ("Scope — locked v2") without being
asked.

## What you are building (this repo)

- A Next.js + Tailwind frontend only. All AI orchestration (LLM calls, scoring,
  ranking) happens in n8n, **outside this repo** — you are not implementing the
  extraction/scoring logic in application code, only the UI that calls n8n
  webhooks and renders their responses.
- Thin API routes (or direct client-side fetch, whichever is faster) that forward
  requests to the n8n webhook URLs defined in `.env.local`.

## Tech constraints

- Next.js (App Router), TypeScript, Tailwind CSS
- No auth, no database access from this repo — Supabase is written to/read from
  by n8n, not by this frontend directly, unless explicitly told otherwise
- Keep components simple and readable over clever — this code will not be
  maintained past the hackathon submission

## Folder structure to create

```
/app
  /page.tsx                → upload screen (JD + resumes)
  /results/page.tsx        → shortlist table + pipeline status
  /candidate/[id]/page.tsx → candidate detail drawer/page (summary, audit trail,
                              interview kit, NL query, notes-paste box)
/components
  UploadForm.tsx           → handles the multi-file select, then loops the
                              ingest webhook call once per resume file (see
                              "Ingest architecture decision" below) — the loop
                              itself lives here, invisibly to the recruiter.
                              CRITICAL: resumes must be read client-side via
                              FileReader.readAsText() into plain strings before
                              sending — the ingest webhook expects resume_text
                              as a JSON string field, NOT a binary file upload
                              (no PDF parsing exists in n8n yet). Restrict the
                              file picker to .txt for now (accept=".txt") since
                              only plain text is supported end to end.
  PipelineStatus.tsx
  ShortlistTable.tsx
  CandidateSummary.tsx
  AuditTrailTooltip.tsx     → click/hover a skill → shows source_snippet
  InterviewKit.tsx
  NLQueryBox.tsx
  InterviewNotesForm.tsx
/lib
  api.ts                   → fetch wrappers for the n8n webhook endpoints
  types.ts                 → TypeScript interfaces matching ARCHITECTURE.md section 3
.env.local.example
```

## API contract (what the frontend expects back)

Match the JSON schemas in `ARCHITECTURE.md` section 3 exactly — do not invent
different field names.

**Ingest architecture decision**: the ingest webhook processes ONE resume per
call — it does NOT accept an array of resumes. When the recruiter uploads a JD
plus multiple resume files and clicks Upload, this repo's frontend must loop
through each selected resume file and call the ingest webhook once per resume,
sending the same `jd` text and `jd_id` on every call for that batch. This
looping must be invisible to the recruiter: show ONE combined progress view
(e.g. "Processing 3 of 6") advancing as each call completes — never a UI that
looks like 6 separate uploads. This decision was made deliberately over an
internal n8n-side loop, to avoid restructuring an already-validated pipeline
this late in the build.

There is a **fifth field on the interview kit's questions**, `question_type`
(`"gap_validation" | "strength_verification"`) and `target` (not `targets_gap`
— renamed) — match `PROMPTS.md` section 4 and `ARCHITECTURE.md` schema 3.4
exactly, they're the current source of truth, not memory of an earlier draft.

**Endpoints — current real status:**

1. `POST {N8N_INGEST_WEBHOOK_URL}` — ✅ LIVE, tested with 3 real candidates.
   Body: `{ jd, jd_id, resume_text, candidate_id }` (ONE resume per call, see
   above). Returns: `{ status, candidate, score, kit }` — candidate/score/kit
   are the full objects from schemas 3.2/3.3/3.4, NOT wrapped further.
2. `POST {N8N_SHORTLIST_WEBHOOK_URL}` — ✅ LIVE, tested with 3 real candidates
   including a verified sort (not just a lucky tie). Body: `{ jd_id }`.
   Returns: `{ status, jd_id, candidates: [...] }` — array of full stored rows
   (each with `id, jd_id, profile_json, score_json, kit_json, status,
   created_at`), sorted by `score_json.overall_score` descending, with
   `skill_match_pct` and `years_experience` as tiebreakers. Note the field
   names inside each array item are `profile_json`/`score_json`/`kit_json`
   (matching the Supabase column names), not `candidate`/`score`/`kit` like
   endpoint 1's response — don't assume they match, write separate TypeScript
   types for each response shape in `types.ts`.
3. `POST {N8N_QUERY_WEBHOOK_URL}` — ❌ NOT BUILT YET. Do not wire `NLQueryBox.tsx`
   to a real call — build the component so it renders and is visually present,
   but disabled/hidden behind a "coming soon" state, OR simply omit it from
   this build pass entirely and add it only once the endpoint exists.
4. `POST {N8N_NOTES_WEBHOOK_URL}` — ❌ NOT BUILT YET. Same treatment as #3 for
   `InterviewNotesForm.tsx`.

Given #3 and #4 aren't built, **build the upload screen, shortlist view, and
candidate detail page (with audit trail + interview kit) first** — that's a
complete, demo-able product on its own. NL query and notes-analysis are
additive, not blocking.

Every LIVE webhook response includes a top-level `status: "ok" | "partial" |
"error"`. Always render `partial` results rather than blocking on a full
success — this matters for the live demo if one candidate fails to parse.

## UX priorities, in order

1. The audit trail must be visibly clickable — this is the single most important
   interaction in the whole demo. Every skill/claim shown anywhere in the UI
   should be hoverable/clickable to reveal its `source_snippet`.
2. Pipeline status while processing (parsing → extracting → scoring → generating)
   — do not just show a spinner, show which stage is active.
3. Everything else (visual polish, animations) is secondary — build for clarity,
   not decoration, given the time budget.

## What NOT to do

- Do not implement your own resume parsing, scoring, or prompt logic in this repo
  — that all lives in n8n. If a task seems to require it, stop and flag it rather
  than building a parallel implementation.
- Do not add login/auth.
- Do not add features outside `PRD.md` scope without being explicitly asked.
- Do not silently swallow webhook errors — surface them in the UI.

## Current status

**n8n pipeline (backend)**: FULLY BUILT and validated end-to-end — ingest
chain (Webhook → Parse JD/Parse Resume parallel → Unwrap/Wrap → Merge →
Match & Score → Bucket Check → Merge (with score) → Interview Kit → Unwrap Kit
→ Write to Supabase → Respond) and a separate shortlist webhook (Webhook →
Supabase Get Many by jd_id → sort by score → Respond). Tested with 3 real,
different candidates (A: strong fit/Python stack, B: strong fit/Node stack —
genuine tie at overall_score 81 resolved correctly by tiebreakers, F: clear
mismatch/score 22) stored and retrieved correctly, sort order verified as
real (not a tie-masked coincidence). Real bugs found and fixed across the
build — see `SESSION_HANDOFF.md` for the full list if any of this needs
re-litigating.

Reasoning-effort inconsistency observed across LLM runs (~9-point score
variance on identical input across separate runs) — plan to pre-run and
snapshot results before live demo rather than trusting live inference under
time pressure.

**Not built**: NL-query webhook, interview-notes webhook. Deliberately
deprioritized — see API contract section above for how the frontend should
handle their absence.

**Frontend (this repo)**: not yet started. This is now the priority — the
backend is demo-ready but there is currently nothing for a judge to look at.
Build in this order: upload screen → shortlist view → candidate detail page
(audit trail + interview kit). NL query and interview-notes UI come last, if
time allows, since their backends don't exist yet.

- [ ] Upload screen scaffolded, with the multi-file-select → per-resume-loop
      behavior described above
- [ ] Results table wired to n8n ingest webhook (once per resume, looped)
- [ ] Shortlist view wired to the live shortlist webhook
- [ ] Candidate detail page — summary + audit trail (top UX priority, see above)
- [ ] Interview kit display — remember `question_type` + `target` fields,
      and that strength_verification questions aren't "gaps," see API
      contract note above
- [ ] NL query box — omit or stub, endpoint doesn't exist yet
- [ ] Interview notes form — omit or stub, endpoint doesn't exist yet
- [ ] Pipeline status indicator (real stages, not a generic spinner)
