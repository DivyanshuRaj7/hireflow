"use client";

/** Re-runs the server page fetch without losing the current URL. */
import { useRouter } from "next/navigation";

export default function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      Retry
    </button>
  );
}
