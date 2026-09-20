/**
 * Product-level pipeline stages for one resume in flight.
 *
 * These are conceptual stages (Parsing → Extracting → Scoring → Generating),
 * NOT n8n node telemetry — the frontend never sees node-level execution.
 * Status is conveyed with text labels plus shape/color, never color alone.
 */

export const PIPELINE_STAGES = [
  "Parsing",
  "Extracting",
  "Scoring",
  "Generating",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

interface PipelineStatusProps {
  /** Index of the currently active stage, or null when idle/complete. */
  activeStage: number | null;
  /** True while a resume is being processed. */
  isProcessing: boolean;
  /** Filename of the resume currently in flight, if any. */
  currentFileName?: string;
}

function stageState(
  index: number,
  activeStage: number | null,
  isProcessing: boolean,
): "done" | "active" | "pending" {
  if (!isProcessing || activeStage === null) return "pending";
  if (index < activeStage) return "done";
  if (index === activeStage) return "active";
  return "pending";
}

export default function PipelineStatus({
  activeStage,
  isProcessing,
  currentFileName,
}: PipelineStatusProps) {
  return (
    <section
      aria-label="Screening pipeline stages"
      className="rounded-lg border border-neutral-200 bg-white px-5 py-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
          Pipeline
        </h2>
        <p aria-live="polite" className="truncate text-sm text-neutral-500">
          {isProcessing && currentFileName
            ? `Screening ${currentFileName}`
            : "Idle — stages light up while a resume is screened."}
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PIPELINE_STAGES.map((stage, index) => {
          const state = stageState(index, activeStage, isProcessing);
          return (
            <li
              key={stage}
              aria-current={state === "active" ? "step" : undefined}
              className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
            >
              <span
                aria-hidden="true"
                className={
                  state === "done"
                    ? "inline-block h-2 w-2 rounded-full bg-neutral-900"
                    : state === "active"
                      ? "inline-block h-2 w-2 animate-pulse rounded-full bg-neutral-900 motion-reduce:animate-none"
                      : "inline-block h-2 w-2 rounded-full border border-neutral-400 bg-white"
                }
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-neutral-900">
                  {stage}
                </span>
                <span className="text-xs text-neutral-500">
                  {state === "done"
                    ? "Done"
                    : state === "active"
                      ? "In progress"
                      : "Waiting"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
