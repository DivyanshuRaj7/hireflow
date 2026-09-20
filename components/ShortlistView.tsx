"use client";

/**
 * Results / ranked shortlist container (Part 3).
 *
 * Reads jd_id from the URL, fetches POST /api/shortlist (never n8n
 * directly), and renders loading / error / partial / empty / table states.
 * Candidates render in backend response order — no frontend re-ranking.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ShortlistTable from "./ShortlistTable";
import type { FitBucket, ShortlistResponse } from "@/lib/types";

type LoadState =
  | { kind: "missing" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ShortlistResponse };

/** "backend-engineer" -> "Backend Engineer" for display; jd_id stays raw. */
function roleLabel(jdId: string): string {
  const label = jdId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return label || jdId;
}

function friendlyError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // fall through to the generic message below
  }
  return `Unable to load the shortlist (request failed with status ${status}). You can retry — no screening data was changed.`;
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading ranked candidates" className="flex flex-col gap-3">
      <p className="text-sm font-medium text-neutral-600">
        Loading ranked candidates…
      </p>
      <div aria-hidden="true" className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-14 animate-pulse border-b border-neutral-100 bg-neutral-100 motion-reduce:animate-none last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}

export default function ShortlistView() {
  const searchParams = useSearchParams();
  const jdId = searchParams.get("jd_id")?.trim() ?? "";
  const [state, setState] = useState<LoadState>(
    jdId ? { kind: "loading" } : { kind: "missing" },
  );
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    if (!jdId) {
      setState({ kind: "missing" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_id: jdId }),
      });
      if (!res.ok) {
        setState({
          kind: "error",
          message: friendlyError(res.status, await res.text()),
        });
        return;
      }
      const data = (await res.json()) as ShortlistResponse;
      if (!data || !Array.isArray(data.candidates)) {
        setState({
          kind: "error",
          message:
            "The shortlist came back in an unexpected shape. You can retry — no screening data was changed.",
        });
        return;
      }
      setState({ kind: "ready", data });
    } catch (err) {
      console.error("Shortlist fetch failed:", err);
      setState({
        kind: "error",
        message:
          "Could not reach the shortlist service. Check your connection and retry — no screening data was changed.",
      });
    }
  }, [jdId]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  if (state.kind === "missing") {
    return (
      <section aria-label="Missing screening ID" className="rounded-lg border border-neutral-200 bg-white px-5 py-8 text-center">
        <h2 className="text-lg font-semibold text-neutral-900">
          No screening ID was provided
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
          This page needs a screening ID in the URL, for example{" "}
          <span className="font-mono">/results?jd_id=backend-engineer</span>.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Back to upload
        </Link>
      </section>
    );
  }

  if (state.kind === "loading") return <LoadingSkeleton />;

  if (state.kind === "error") {
    return (
      <section
        role="alert"
        aria-label="Shortlist failed to load"
        className="rounded-lg border border-red-300 bg-red-50 px-5 py-6"
      >
        <h2 className="text-lg font-semibold text-red-900">
          Unable to load the shortlist
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-red-800">
          {state.message}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Back to upload
          </Link>
        </div>
      </section>
    );
  }

  const { data } = state;
  const candidates = data.candidates;
  const buckets: Record<FitBucket, number> = {
    strong_fit: 0,
    possible: 0,
    not_a_fit: 0,
  };
  for (const row of candidates) {
    const bucket = row.score_json?.bucket;
    if (bucket === "strong_fit" || bucket === "possible" || bucket === "not_a_fit") {
      buckets[bucket] += 1;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          HireFlow
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          {roleLabel(data.jd_id || jdId)}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Screening ID:{" "}
          <span className="font-mono text-neutral-700">{data.jd_id || jdId}</span>
        </p>
      </header>

      {data.status === "partial" && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900"
        >
          Some screening results may be incomplete — every candidate below is
          still usable for review.
        </p>
      )}

      {candidates.length === 0 ? (
        <section aria-label="No candidates" className="rounded-lg border border-neutral-200 bg-white px-5 py-8 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">
            No candidates found for this screening
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            The shortlist came back empty. Upload and screen resumes first,
            then return here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Back to upload
          </Link>
        </section>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-neutral-600">
            <span className="font-semibold text-neutral-900">
              {candidates.length} candidate{candidates.length === 1 ? "" : "s"} analyzed
            </span>{" "}
            · {buckets.strong_fit} strong · {buckets.possible}{" "}
            possible · {buckets.not_a_fit} not a fit
          </p>
          <ShortlistTable candidates={candidates} jdId={data.jd_id || jdId} />
        </>
      )}

      <p className="text-xs text-neutral-500">
        AI-assisted screening — review the evidence before making a decision.
        The recruiter makes the final decision.
      </p>
    </div>
  );
}
