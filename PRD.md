# PRD — HireFlow
**AI Candidate Screening & Interview Intelligence Agent**
Agentic AI Hackathon 2026 — Product Space

---

## 1. Problem

Recruiters review large numbers of resumes per role. Candidate information is scattered
across resumes, portfolios, application forms, and interview notes. Manual screening is
slow and inconsistent. Interviewers spend prep time on question-writing and note-review
instead of the actual conversation.

## 2. Goal

Build an agent that organizes and evaluates candidate information end-to-end —
screening through post-interview evaluation — while keeping the human recruiter as the
final decision-maker. The agent assists; it never auto-rejects or auto-hires.

## 3. Target Demo Scenario

- **Role**: Backend Engineer, 2–4 years experience (one JD, fixed for the demo)
- **Candidates**: 6 resumes — 2 strong fit, 2 borderline, 2 clear mismatch
  (real, redacted resumes preferred over synthetic for demo day)
- **Users in the demo narrative**: a recruiter screening the pool, then prepping for
  and evaluating one interview

## 4. Scope (locked — v2)

### In scope — 8 core capabilities
1. Upload JD + resumes
2. Structured extraction (skills, experience, projects, qualifications) with
   per-claim source citation
3. Map candidate against JD requirements; flag missing/unclear information
4. Group candidates: Strong fit / Possible / Not a fit, with transparent score
   breakdown
5. Human-readable candidate summary card (derived from the structured extraction)
6. Role-specific interview questions + conditional follow-up questions per candidate
7. Natural-language query over the full candidate pool
   ("Which candidates have AWS experience?")
8. Post-interview: paste notes → requirement-coverage summary, unanswered areas
   flagged, standardized evaluation report

### Explicitly out of scope
- Login / auth / multi-user accounts
- Multi-role support (only one JD active at a time)
- Editable candidate database / CRUD UI
- Email or ATS integrations
- Analytics dashboard beyond the per-candidate view
- Auto-reject or auto-hire decisions — the agent only assists

## 5. Requirement → Feature Mapping

| Problem statement requirement | Feature # | Status |
|---|---|---|
| Upload JD + resumes | 1 | Core |
| Extract skills/experience/projects/qualifications | 2 | Core |
| Map experience against job requirements | 3 | Core |
| Identify missing/unclear information | 3 | Core |
| Group candidates by relevant experience | 4 | Core |
| Generate structured candidate summaries | 5 | Core |
| Create role-specific interview questions | 6 | Core |
| Generate follow-up questions | 6 | Core |
| Summarize interview notes, map to requirements | 8 | Core |
| Identify unanswered evaluation areas | 8 | Core |
| Generate standardized interview evaluation report | 8 | Core |
| Natural-language query over candidate pool | 7 | Core |
| Audit trail (source of every insight) | cross-cutting | Core — applies to all of the above |

Every bullet in the original problem statement is covered.

## 6. Non-functional requirements ("senior engineer" checks)

- **Structured output**: every LLM call returns schema-validated JSON; malformed
  output triggers one automatic retry before surfacing an error.
- **Grounding**: every extracted fact and every score justification includes a
  `source_snippet` (verbatim text span) it was derived from. No ungrounded claims
  in the UI.
- **Confidence flags**: extractions with ambiguous or missing evidence are marked
  `needs_review` instead of guessed.
- **Graceful degradation**: an unparseable resume is skipped with a visible error,
  not allowed to crash the batch.
- **Human-in-the-loop**: the agent ranks and assists; the recruiter makes the
  final call. No feature auto-advances or auto-rejects a candidate.
- **Privacy note (verbal, in demo)**: production version would redact PII before
  sending resume text to a third-party LLM.

## 7. Success metrics (for the demo, not production)

- Pipeline runs end-to-end on all 6 resumes with zero unhandled errors
- Ranking order matches human-obvious intuition (strong fits rank above mismatches)
- Every displayed skill/claim can be clicked to reveal its source line
- NL query answers correctly on at least 3 rehearsed test questions
- Full demo walkthrough under 3 minutes

## 8. Judging alignment

| Weight | Area | Primary proof point in demo |
|---|---|---|
| 15% | Problem understanding | All 13 problem-statement bullets visibly implemented |
| 20% | Prototype quality & UX | Single clean dashboard, live pipeline status, candidate drawer |
| 25% | AI Integration | Multi-agent chain (extract → match → summarize → question-gen → NL query → interview analysis), structured outputs, grounding |
| 25% | LinkedIn content | Before/after resume-pile vs ranked shortlist, "audit trail" hook |
| 15% | Innovation & creativity | Audit trail + confidence flagging — few teams will implement this |

## 9. Open risks

- Real resume PII → redact before demo prep, not after
- LLM latency across 6 resumes × multiple calls each → pre-run and cache before
  the live demo; don't rely on live inference for every step on stage
- Prompt drift on edge-case resumes → mini eval set (see BUILD_GUIDE.md) before
  locking prompts
