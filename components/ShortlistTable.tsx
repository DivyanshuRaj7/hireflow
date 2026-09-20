/**
 * Ranked shortlist table (Part 3).
 *
 * Presentational only: renders stored Supabase rows in the exact order
 * received — backend ordering (overall_score DESC, skill_match_pct DESC,
 * years_experience DESC) is authoritative and is never re-sorted here.
 * Row shapes are profile_json / score_json / kit_json (NOT the ingest
 * candidate / score / kit shapes). Source snippets stay attached to the
 * data for Part 4; only skill names are shown here.
 */

import Link from "next/link";
import type { FitBucket, StoredCandidateRow } from "@/lib/types";

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

const MAX_SKILLS_SHOWN = 5;

function experienceLabel(years: unknown): string {
  return typeof years === "number" && Number.isFinite(years)
    ? `${years} yr${years === 1 ? "" : "s"}`
    : "Not specified";
}

export default function ShortlistTable({
  candidates,
  jdId,
}: {
  candidates: StoredCandidateRow[];
  jdId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-3xl border-collapse text-left text-sm">
        <caption className="sr-only">
          Ranked candidate shortlist, best score first
        </caption>
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
            <th scope="col" className="px-4 py-3 font-semibold">
              Rank
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Candidate
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Score
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Fit
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Key skills
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Experience
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {candidates.map((row, index) => {
            const profile = row.profile_json;
            const score = row.score_json;
            const candidateId = profile?.candidate_id ?? row.id;
            const skills = Array.isArray(profile?.skills) ? profile.skills : [];
            const shown = skills.slice(0, MAX_SKILLS_SHOWN);
            return (
              <tr key={row.id} className="align-top hover:bg-neutral-50">
                <td className="px-4 py-3 text-xl font-bold text-neutral-900 tabular-nums">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <span className="block text-xs text-neutral-500">
                    Candidate
                  </span>
                  <span className="block font-mono text-sm font-semibold break-all text-neutral-900">
                    {candidateId}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="block text-base font-semibold text-neutral-900 tabular-nums">
                    {score?.overall_score} / 100
                  </span>
                  <span className="block text-xs text-neutral-500 tabular-nums">
                    {score?.skill_match_pct}% skill match
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${FIT_STYLES[score?.bucket]}`}
                  >
                    {FIT_LABEL[score?.bucket]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {shown.length > 0 ? (
                    <ul aria-label={`Key skills for ${candidateId}`} className="flex max-w-64 flex-wrap gap-1.5">
                      {shown.map((skill) => (
                        <li
                          key={skill.name}
                          className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-800"
                        >
                          {skill.name}
                        </li>
                      ))}
                      {skills.length > shown.length && (
                        <li className="px-1 py-0.5 text-xs text-neutral-500">
                          +{skills.length - shown.length} more
                        </li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      No skills listed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-neutral-700">
                  {experienceLabel(profile?.years_experience)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/candidate/${encodeURIComponent(candidateId)}?jd_id=${encodeURIComponent(jdId)}`}
                    aria-label={`Open details for candidate ${candidateId}`}
                    className="rounded-md px-2 py-1 text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
