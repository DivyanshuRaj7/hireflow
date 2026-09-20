/**
 * Candidate header summary (Part 4).
 *
 * Displays backend-produced values only: identity, fit, scores, confidence,
 * and the backend-generated summary_paragraph. Nothing is computed,
 * rewritten, or decided here.
 */

import type { FitBucket } from "@/lib/types";

const FIT_LABEL: Record<FitBucket, string> = {
  strong_fit: "Strong fit",
  possible: "Possible",
  not_a_fit: "Not a fit",
};

const FIT_STYLES: Record<FitBucket, string> = {
  strong_fit: "bg-neutral-900 text-white",
  possible: "border border-neutral-400 bg-white text-neutral-800",
  not_a_fit: "bg-neutral-200 text-neutral-600",
};

const CONFIDENCE_LABEL = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — needs review",
} as const;

interface CandidateSummaryProps {
  candidateId: string;
  bucket: FitBucket;
  overallScore: number;
  skillMatchPct: number;
  yearsExperience: unknown;
  confidence: "high" | "medium" | "low";
  summaryParagraph: string;
}

function experienceLabel(years: unknown): string {
  return typeof years === "number" && Number.isFinite(years)
    ? `${years} yr${years === 1 ? "" : "s"}`
    : "Not specified";
}

export default function CandidateSummary({
  candidateId,
  bucket,
  overallScore,
  skillMatchPct,
  yearsExperience,
  confidence,
  summaryParagraph,
}: CandidateSummaryProps) {
  return (
    <section
      aria-label="Candidate summary"
      className="rounded-lg border border-neutral-200 bg-white px-5 py-4"
    >
      <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        Candidate
      </p>
      <h2 className="mt-1 font-mono text-xl font-semibold break-all text-neutral-900">
        {candidateId}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-xs text-neutral-500">Overall score</dt>
          <dd className="text-lg font-semibold text-neutral-900 tabular-nums">
            {overallScore} / 100
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-xs text-neutral-500">Skill match</dt>
          <dd className="text-lg font-semibold text-neutral-900 tabular-nums">
            {skillMatchPct}%
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-xs text-neutral-500">Fit</dt>
          <dd className="mt-0.5">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${FIT_STYLES[bucket]}`}
            >
              {FIT_LABEL[bucket]}
            </span>
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-xs text-neutral-500">Experience</dt>
          <dd className="text-lg font-semibold text-neutral-900">
            {experienceLabel(yearsExperience)}
          </dd>
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
          <dt className="text-xs text-neutral-500">Extraction</dt>
          <dd className="text-sm font-semibold text-neutral-900">
            {CONFIDENCE_LABEL[confidence]}
          </dd>
        </div>
      </dl>

      <h3 className="mt-4 text-sm font-semibold text-neutral-900">
        Recruiter summary
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">
        {summaryParagraph}
      </p>
    </section>
  );
}
