/**
 * Candidate evaluation file (Part 4 composition).
 *
 * Renders the EXACT stored profile_json / score_json / kit_json — no
 * scoring, no rewriting, no invented evidence. Every grounded claim goes
 * through AuditTrailTooltip; fields without backend evidence are presented
 * as extracted values, never with fabricated snippets.
 */

import Link from "next/link";
import AuditTrailTooltip from "./AuditTrailTooltip";
import CandidateSummary from "./CandidateSummary";
import InterviewKit from "./InterviewKit";
import type { StoredCandidateRow } from "@/lib/types";

function roleLabel(jdId: string): string {
  const label = jdId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return label || jdId;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white px-5 py-4">
      <h2 className="text-base font-semibold tracking-tight text-neutral-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function CandidateDetail({
  row,
  jdId,
  isPartial,
}: {
  row: StoredCandidateRow;
  jdId: string;
  isPartial: boolean;
}) {
  const profile = row.profile_json;
  const score = row.score_json;
  const kit = row.kit_json;
  const candidateId = profile?.candidate_id ?? row.id;
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const gaps = Array.isArray(score?.gaps) ? score.gaps : [];
  const missing = Array.isArray(profile?.missing_or_unclear)
    ? profile.missing_or_unclear
    : [];
  const justificationSources = Array.isArray(score?.justification_sources)
    ? score.justification_sources.filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      )
    : [];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link
          href={`/results?jd_id=${encodeURIComponent(jdId)}`}
          className="text-sm font-semibold text-neutral-700 underline-offset-2 hover:underline"
        >
          ← Back to shortlist
        </Link>
        <p className="mt-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Candidate
        </p>
        <h1 className="mt-1 font-mono text-2xl font-semibold break-all text-neutral-900">
          {candidateId}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {roleLabel(jdId)} · Screening ID:{" "}
          <span className="font-mono text-neutral-700">{jdId}</span>
        </p>
      </header>

      {isPartial && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
        >
          Some screening results may be incomplete — review the evidence below
          before making a decision.
        </p>
      )}

      <CandidateSummary
        candidateId={candidateId}
        bucket={score?.bucket}
        overallScore={score?.overall_score}
        skillMatchPct={score?.skill_match_pct}
        yearsExperience={profile?.years_experience}
        confidence={profile?.confidence}
        summaryParagraph={kit?.summary_paragraph ?? ""}
      />

      <Section title="Why this candidate received this score">
        <p className="text-sm leading-relaxed text-neutral-700">
          {score?.justification}
        </p>
        <h3 className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Evidence used
        </h3>
        {justificationSources.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {justificationSources.map((snippet, index) => (
              <li key={index}>
                <AuditTrailTooltip
                  label={
                    snippet.length > 72
                      ? `Evidence ${index + 1} — ${snippet.slice(0, 72)}…`
                      : `Evidence ${index + 1} — ${snippet}`
                  }
                  source={snippet}
                  context="justification evidence"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            No evidence references were attached to this justification.
          </p>
        )}
      </Section>

      <Section title="Skills — select any skill to inspect its resume evidence">
        {skills.length > 0 ? (
          <ul aria-label="Candidate skills with evidence" className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li key={skill.name}>
                <AuditTrailTooltip
                  label={skill.name}
                  source={skill.source_snippet}
                  context="skill"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No skills were extracted from this resume.
          </p>
        )}
      </Section>

      <Section title="Experience">
        <p className="text-sm text-neutral-700">
          <span className="font-semibold">
            {typeof profile?.years_experience === "number"
              ? `${profile.years_experience} yr${profile.years_experience === 1 ? "" : "s"}`
              : "Not specified"}
          </span>
          {score?.experience_fit ? ` — ${score.experience_fit}` : ""}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Extracted profile value; experience itself carries no verbatim
          snippet.
        </p>
      </Section>

      <Section title="Projects">
        {projects.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {projects.map((project, index) => (
              <li
                key={index}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                <p className="text-sm text-neutral-800">
                  {project.description}
                </p>
                <div className="mt-1.5">
                  <AuditTrailTooltip
                    label={`Project ${index + 1} evidence`}
                    source={project.source_snippet}
                    context="project"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No distinct projects were extracted from this resume.
          </p>
        )}
      </Section>

      <Section title="Education">
        {education.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {education.map((item, index) => (
              <li
                key={index}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                <p className="text-sm text-neutral-800">{item.detail}</p>
                <div className="mt-1.5">
                  <AuditTrailTooltip
                    label={`Education ${index + 1} evidence`}
                    source={item.source_snippet}
                    context="education"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            No education details were extracted from this resume.
          </p>
        )}
      </Section>

      <Section title="Gaps & missing information">
        <p className="text-xs leading-relaxed text-neutral-500">
          A gap means the resume did not clearly demonstrate something — not
          that the candidate definitely lacks it.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Role gaps
            </h3>
            {gaps.length > 0 ? (
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {gaps.map((gap, index) => (
                  <li key={index}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">
                No role gaps flagged.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Resume uncertainty
            </h3>
            {missing.length > 0 ? (
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">
                Nothing flagged as unclear.
              </p>
            )}
          </div>
        </div>
      </Section>

      <InterviewKit kit={kit} />

      <p className="text-xs text-neutral-500">
        AI-assisted screening — review the evidence before making a decision.
        The recruiter makes the final decision.
      </p>
    </div>
  );
}
