import { Suspense } from "react";
import ShortlistView from "@/components/ShortlistView";

/**
 * HireFlow results screen (Part 3): ranked shortlist for ?jd_id=...
 * Data loading lives in the client ShortlistView; this shell only
 * provides layout plus a loading fallback for the suspense boundary
 * that useSearchParams requires.
 */
export default function ResultsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <div role="status" aria-label="Loading ranked candidates">
            <p className="text-sm font-medium text-neutral-600">
              Loading ranked candidates…
            </p>
          </div>
        }
      >
        <ShortlistView />
      </Suspense>
    </main>
  );
}
