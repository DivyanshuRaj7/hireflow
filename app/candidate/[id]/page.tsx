/**
 * Candidate detail route (Part 4): /candidate/[id]?jd_id=...
 *
 * Server page. Reuses the EXISTING shortlist retrieval path (lib/api.ts
 * server wrapper — n8n URLs never reach the browser), finds the row whose
 * stored candidate ID matches the route, and renders it verbatim.
 * No new backend endpoint, no re-scoring, no re-sorting.
 */

import Link from "next/link";
import { ApiError, fetchShortlist } from "@/lib/api";
import CandidateDetail from "@/components/CandidateDetail";
import RetryButton from "@/components/RetryButton";
import type { StoredCandidateRow } from "@/lib/types";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      {children}
    </main>
  );
}

function BackToShortlist({ jdId }: { jdId?: string }) {
  return (
    <Link
      href={jdId ? `/results?jd_id=${encodeURIComponent(jdId)}` : "/results"}
      className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      Back to shortlist
    </Link>
  );
}

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jd_id?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const jdId = typeof query?.jd_id === "string" ? query.jd_id.trim() : "";
  const candidateId = id;

  if (!jdId) {
    return (
      <Shell>
        <section
          aria-label="Role context required"
          className="rounded-lg border border-neutral-200 bg-white px-5 py-8 text-center"
        >
          <h1 className="text-lg font-semibold text-neutral-900">
            Role context is required to open this candidate
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            Candidates open from a shortlist, which carries the screening ID —
            for example{" "}
            <span className="font-mono">
              /candidate/{candidateId}?jd_id=backend-engineer
            </span>
            . The screening ID cannot be guessed.
          </p>
          <BackToShortlist />
        </section>
      </Shell>
    );
  }

  let rows: StoredCandidateRow[];
  let isPartial = false;
  try {
    const data = await fetchShortlist(jdId);
    if (!data || !Array.isArray(data.candidates)) {
      throw new ApiError(
        "The shortlist came back in an unexpected shape.",
        "shortlist",
      );
    }
    rows = data.candidates;
    isPartial = data.status === "partial";
  } catch (err) {
    console.error("Candidate shortlist fetch failed:", err);
    return (
      <Shell>
        <section
          role="alert"
          aria-label="Candidate failed to load"
          className="rounded-lg border border-red-300 bg-red-50 px-5 py-6"
        >
          <h1 className="text-lg font-semibold text-red-900">
            Unable to load this candidate
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-red-800">
            {err instanceof ApiError
              ? err.message
              : "The screening service could not be reached."}{" "}
            No screening data was changed.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <RetryButton />
            <BackToShortlist jdId={jdId} />
          </div>
        </section>
      </Shell>
    );
  }

  // Response order is authoritative; find without re-sorting.
  const row =
    rows.find((r) => r?.profile_json?.candidate_id === candidateId) ??
    rows.find((r) => r?.id === candidateId);

  if (!row) {
    return (
      <Shell>
        <section
          aria-label="Candidate not found"
          className="rounded-lg border border-neutral-200 bg-white px-5 py-8 text-center"
        >
          <h1 className="text-lg font-semibold text-neutral-900">
            Candidate not found in this screening
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            <span className="font-mono">{candidateId}</span> is not part of
            screening <span className="font-mono">{jdId}</span>. It may belong
            to a different screening.
          </p>
          <BackToShortlist jdId={jdId} />
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <CandidateDetail row={row} jdId={jdId} isPartial={isPartial} />
    </Shell>
  );
}
