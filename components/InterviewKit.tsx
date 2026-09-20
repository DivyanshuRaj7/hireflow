/**
 * Interview kit display (Part 4).
 *
 * Recruiter preparation, not a simulator. Renders the EXACT stored
 * questions in backend order — never sorted, grouped, added, or removed.
 * Each question keeps its question_type badge and target label.
 * strength_verification questions are verification prompts, never gaps.
 */

import type { InterviewKit as InterviewKitData } from "@/lib/types";

const TYPE_LABEL = {
  gap_validation: "Gap validation",
  strength_verification: "Strength verification",
} as const;

export default function InterviewKit({
  kit,
}: {
  kit: InterviewKitData | null | undefined;
}) {
  if (
    !kit ||
    !Array.isArray(kit.questions) ||
    typeof kit.summary_paragraph !== "string"
  ) {
    return (
      <section
        aria-label="Interview kit"
        className="rounded-lg border border-neutral-200 bg-white px-5 py-4"
      >
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          Interview kit
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Interview kit unavailable for this candidate.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Interview kit"
      className="rounded-lg border border-neutral-200 bg-white px-5 py-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-neutral-900">
        Interview kit
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Recruiter preparation — questions render in backend order: gap
        validation first, then strength verification. Verification questions
        confirm claimed strengths; they are not candidate gaps.
      </p>

      <ol className="mt-4 flex flex-col gap-4">
        {kit.questions.map((q, index) => {
          const isGap = q?.question_type === "gap_validation";
          return (
            <li
              key={`${q?.question_type}-${index}`}
              className={`rounded-md border px-4 py-3 ${
                isGap
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-300 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 tabular-nums">
                  Q{index + 1}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isGap
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-400 bg-white text-neutral-800"
                  }`}
                >
                  {TYPE_LABEL[q?.question_type] ?? q?.question_type}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed font-medium text-neutral-900">
                {q?.question}
              </p>
              <p className="mt-1.5 text-sm text-neutral-700">
                <span className="font-semibold">Target:</span> {q?.target}
              </p>
              {Array.isArray(q?.follow_ups) && q.follow_ups.length > 0 && (
                <div className="mt-1.5">
                  <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Follow-ups
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                    {q.follow_ups.map((followUp, i) => (
                      <li key={i}>{followUp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
