import UploadForm from "@/components/UploadForm";

/**
 * HireFlow upload screen (Part 2).
 * The recruiter's entry point: role + JD + a batch of TXT resumes.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          HireFlow
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          Screen resumes against a job description
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
