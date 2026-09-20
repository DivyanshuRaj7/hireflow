export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
        HireFlow
      </p>
      <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight text-neutral-900">
        Frontend foundation is ready
      </h1>
      <p className="mt-3 max-w-md text-center text-base leading-relaxed text-neutral-600">
        Upload, shortlist, and candidate detail screens arrive in later parts.
        This page only confirms the Next.js + TypeScript + Tailwind setup builds
        and renders.
      </p>
    </main>
  );
}
