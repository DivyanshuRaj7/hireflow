"use client";

/**
 * Audit trail evidence disclosure (Part 4, #1 priority).
 *
 * Every grounded claim (skill, project, education, justification source)
 * renders through here. The trigger exposes the claim; opening it reveals
 * the EXACT verbatim source_snippet received from the backend — never
 * paraphrased, never generated.
 *
 * Works with mouse (hover or click), keyboard (Enter/Space toggle, Escape
 * closes), and touch (tap toggles). Never hover-only.
 */

import { useId, useState } from "react";

interface AuditTrailTooltipProps {
  /** Claim text shown on the trigger, e.g. a skill name. */
  label: string;
  /** Verbatim backend source_snippet, or null when none was attached. */
  source: string | null | undefined;
  /** Short context for accessible naming, e.g. "skill", "project". */
  context?: string;
}

export default function AuditTrailTooltip({
  label,
  source,
  context = "item",
}: AuditTrailTooltipProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasEvidence = typeof source === "string" && source.length > 0;

  if (!hasEvidence) {
    return (
      <span className="inline-flex flex-col">
        <span className="text-sm text-neutral-900">{label}</span>
        <span className="text-xs text-neutral-500">
          No evidence attached by the extraction result.
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Show resume evidence for ${context} ${label}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-left text-xs font-medium text-neutral-900 underline decoration-dotted underline-offset-2 hover:bg-neutral-100"
      >
        {label} <span aria-hidden="true">[evidence]</span>
      </button>
      {open && (
        <span
          id={panelId}
          role="region"
          aria-label={`Resume evidence for ${label}`}
          className="mt-1.5 max-w-sm rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2"
        >
          <span className="block text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            Resume evidence
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed break-words text-neutral-800">
            &ldquo;{source}&rdquo;
          </span>
        </span>
      )}
    </span>
  );
}
