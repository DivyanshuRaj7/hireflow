/**
 * HireFlow data contracts.
 *
 * Field names match ARCHITECTURE.md section 3 and PROMPTS.md exactly.
 * Do not rename fields here without updating those specs first.
 */

/** Top-level status present on every live n8n webhook response. */
export type ResponseStatus = "ok" | "partial" | "error";

/** ARCHITECTURE.md 3.1 — output of the JD-parsing LLM call. */
export interface JDRequirements {
  role_title: string;
  seniority_years_min: number;
  seniority_years_max: number;
  required_skills: string[];
  nice_to_have_skills: string[];
  responsibilities: string[];
}

/** One grounded skill claim from a resume (ARCHITECTURE.md 3.2). */
export interface SkillClaim {
  name: string;
  /** Verbatim substring of the resume text. Powers the audit trail. */
  source_snippet: string;
}

/** One discrete project from a resume (ARCHITECTURE.md 3.2). */
export interface ProjectItem {
  description: string;
  /** Verbatim substring of the resume text. Powers the audit trail. */
  source_snippet: string;
}

/** One education entry from a resume (ARCHITECTURE.md 3.2). */
export interface EducationItem {
  detail: string;
  /** Verbatim substring of the resume text. Powers the audit trail. */
  source_snippet: string;
}

/** ARCHITECTURE.md 3.2 — output of the resume-extraction LLM call. */
export interface CandidateProfile {
  candidate_id: string;
  skills: SkillClaim[];
  years_experience: number;
  projects: ProjectItem[];
  education: EducationItem[];
  missing_or_unclear: string[];
  confidence: "high" | "medium" | "low";
}

/** Score bucket. The backend recomputes this deterministically from
 * overall_score (>=75 strong_fit, 45-74 possible, <45 not_a_fit). */
export type FitBucket = "strong_fit" | "possible" | "not_a_fit";

/** ARCHITECTURE.md 3.3 — output of the match & score LLM call. */
export interface MatchScore {
  candidate_id: string;
  overall_score: number;
  bucket: FitBucket;
  skill_match_pct: number;
  experience_fit: string;
  gaps: string[];
  justification: string;
  /** Verbatim source_snippet values the justification relies on. */
  justification_sources: string[];
}

/** Interview question kind (PROMPTS.md section 4, ARCHITECTURE.md 3.4).
 * NOTE: `strength_verification` questions are NOT candidate gaps. */
export type InterviewQuestionType =
  | "gap_validation"
  | "strength_verification";

/** One interview question (ARCHITECTURE.md 3.4).
 * `target` holds the exact gap / missing_or_unclear item for gap_validation,
 * or the exact skill name for strength_verification. */
export interface InterviewQuestion {
  question: string;
  question_type: InterviewQuestionType;
  target: string;
  follow_ups: string[];
}

/** ARCHITECTURE.md 3.4 — output of the interview-kit LLM call. */
export interface InterviewKit {
  candidate_id: string;
  summary_paragraph: string;
  /** All gap_validation questions first, then all strength_verification. */
  questions: InterviewQuestion[];
}

/** One JD requirement coverage entry (ARCHITECTURE.md 3.5). */
export interface RequirementCoverage {
  requirement: string;
  covered: boolean;
  evidence: string;
}

/** ARCHITECTURE.md 3.5 — output of the post-interview analysis LLM call.
 * Backend not built yet; type provided for forward compatibility only. */
export interface InterviewNotesAnalysis {
  candidate_id: string;
  requirement_coverage: RequirementCoverage[];
  unanswered_areas: string[];
  evaluation_report: string;
}

/**
 * Ingest webhook: the backend processes ONE resume per call.
 * Body sent by the frontend (same `jd` + `jd_id` on every call of a batch).
 */
export interface IngestRequest {
  jd: string;
  jd_id: string;
  /** Plain resume text (client reads files via FileReader.readAsText). */
  resume_text: string;
  candidate_id: string;
}

/**
 * Ingest webhook response. `candidate` / `score` / `kit` are the full
 * 3.2 / 3.3 / 3.4 objects — a DIFFERENT shape from shortlist rows.
 */
export interface IngestResponse {
  status: ResponseStatus;
  candidate: CandidateProfile;
  score: MatchScore;
  kit: InterviewKit;
}

/** Shortlist webhook request body. */
export interface ShortlistRequest {
  jd_id: string;
}

/**
 * One stored candidate row in the shortlist response. Field names match the
 * Supabase column names (profile_json / score_json / kit_json) — NOT the
 * ingest response names (candidate / score / kit).
 */
export interface StoredCandidateRow {
  id: string;
  jd_id: string;
  profile_json: CandidateProfile;
  score_json: MatchScore;
  kit_json: InterviewKit;
  status: string;
  created_at: string;
}

/** Shortlist webhook response, sorted by score_json.overall_score
 * descending (tiebreakers: skill_match_pct, years_experience). */
export interface ShortlistResponse {
  status: ResponseStatus;
  jd_id: string;
  candidates: StoredCandidateRow[];
}
