import UploadForm from "@/components/UploadForm";

/**
 * HireFlow upload screen.
 * The recruiter's entry point: role + JD + a batch of PDF/TXT resumes.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-4xl font-bold tracking-tight text-neutral-900">
          HireFlow
        </p>
        <p className="mt-1 text-sm font-semibold tracking-[0.18em] text-neutral-500 uppercase">
          AI Candidate Intelligence
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          Turn resumes into an evidence-backed shortlist.
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-neutral-600">
          Give HireFlow a job description and a batch of resumes, and HireFlow
          will screen them — ranked candidates with evidence you can inspect,
          ready for your decision.
        </p>
      </header>
      <UploadForm />
    </main>
  );
}
