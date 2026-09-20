"use client";

/**
 * HireFlow upload + batch screening form.
 *
 * Flow: role title + JD + multiple PDF/TXT resumes → validate → extract
 * each file to plain text (TXT via FileReader.readAsText(), PDF via
 * client-side pdf.js extraction) → POST /api/ingest ONE resume at a time,
 * SEQUENTIALLY (no Promise.all) → per-file ok/partial/failed state →
 * completion summary with a link to /results?jd_id=...
 *
 * The browser never talks to n8n directly and never sees webhook URLs.
 * No scoring, ranking, or candidate summarising happens here — the backend
 * owns all AI behavior; this component only displays backend results.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import PipelineStatus, { PIPELINE_STAGES } from "./PipelineStatus";
import type { IngestResponse } from "@/lib/types";

type Phase = "idle" | "processing" | "complete";

type FileStatus = "waiting" | "processing" | "completed" | "partial" | "failed";

type ResumeKind = "PDF" | "TXT";

interface ResumeItem {
  /** Stable within this upload session; sent as candidate_id. */
  candidateId: string;
  file: File;
  kind: ResumeKind;
  status: FileStatus;
  /** Recruiter-friendly failure note, if any. */
  message?: string;
}

interface SessionResult {
  candidateId: string;
  fileName: string;
  data: IngestResponse;
}

interface FormErrors {
  title?: string;
  jd?: string;
  files?: string;
}

/** "Backend Engineer" -> "backend-engineer". Deterministic, URL-safe. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Derive a safe candidate id from "name-03.pdf" + index -> "name-03-3". */
function candidateIdFor(fileName: string, index: number): string {
  const stem = fileName.replace(/\.(txt|pdf)$/i, "");
  const clean =
    stem
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "resume";
  return `${clean}-${index + 1}`;
}

function resumeKind(file: File): ResumeKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".txt")) return "TXT";
  return null;
}

/** Read one .txt file as plain text. The exact string becomes resume_text. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}.`));
    reader.readAsText(file);
  });
}

/**
 * Extract plain text from a PDF entirely in the browser (pdf.js).
 * The joined page text becomes resume_text — binary never leaves the page.
 * Image-only/scanned PDFs yield no text and are reported, never invented.
 */
async function readPdfAsText(file: File): Promise<string> {
  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = await import("pdfjs-dist");
  } catch {
    throw new Error(`Couldn't extract text from this PDF (${file.name}).`);
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  let doc: {
    numPages: number;
    destroy?: () => Promise<void>;
  } | null = null;
  try {
    const data = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data });
    const loaded = await loadingTask.promise;
    doc = loaded as unknown as {
      numPages: number;
      destroy: () => Promise<void>;
    };
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await (
        loaded as unknown as {
          getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{ items: unknown[] }>;
          }>;
        }
      ).getPage(pageNum);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) =>
          typeof item === "object" && item !== null && "str" in item
            ? String((item as { str: unknown }).str)
            : "",
        )
        .join(" ");
      parts.push(line);
    }
    return parts.join("\n").replace(/[ \t]+/g, " ").trim();
  } catch {
    throw new Error(`Couldn't extract text from this PDF (${file.name}).`);
  } finally {
    if (doc && typeof doc.destroy === "function") {
      await doc.destroy().catch(() => undefined);
    }
  }
}

/** Whatever the format, the backend receives plain text as resume_text. */
async function readResumeText(file: File, kind: ResumeKind): Promise<string> {
  if (kind === "PDF") return readPdfAsText(file);
  return readFileAsText(file);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABEL: Record<FileStatus, string> = {
  waiting: "Waiting",
  processing: "Processing",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
};

const STATUS_STYLES: Record<FileStatus, string> = {
  waiting: "bg-neutral-100 text-neutral-700",
  processing: "bg-neutral-900 text-white",
  completed: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-900",
  failed: "bg-red-100 text-red-800",
};

/** Conceptual stage ticker: advances while a resume is in flight, holds. */
const STAGE_TICK_MS = 1200;

export default function UploadForm() {
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [batchJdId, setBatchJdId] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runTokenRef = useRef(0);

  const isProcessing = phase === "processing";
  const isComplete = phase === "complete";
  const liveJdId = slugify(title);

  const completedCount = items.filter((i) => i.status === "completed").length;
  const partialCount = items.filter((i) => i.status === "partial").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const usableCount = completedCount + partialCount;

  const ctaLabel =
    items.length === 0
      ? "Select Resumes"
      : items.length === 1
        ? "Analyze 1 Candidate →"
        : `Analyze ${items.length} Candidates →`;

  function stopStageTicker() {
    if (stageTimerRef.current !== null) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }

  function startStageTicker() {
    stopStageTicker();
    setActiveStage(0);
    stageTimerRef.current = setInterval(() => {
      setActiveStage((prev) =>
        prev === null || prev >= PIPELINE_STAGES.length - 1 ? prev : prev + 1,
      );
    }, STAGE_TICK_MS);
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const supported: { file: File; kind: ResumeKind }[] = [];
    let rejected = 0;
    for (const file of incoming) {
      const kind = resumeKind(file);
      if (kind) supported.push({ file, kind });
      else rejected += 1;
    }
    setFileNotice(
      rejected > 0
        ? `${rejected} file${rejected === 1 ? " was" : "s were"} skipped — unsupported file type. Please upload PDF or TXT.`
        : null,
    );
    if (supported.length === 0) return;
    setItems((prev) => {
      const seen = new Set(
        prev.map((i) => `${i.file.name}|${i.file.size}|${i.file.lastModified}`),
      );
      const next = [...prev];
      for (const { file, kind } of supported) {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({
          candidateId: candidateIdFor(file.name, next.length),
          file,
          kind,
          status: "waiting",
        });
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, files: undefined }));
  }

  function removeFile(candidateId: string) {
    if (isProcessing) return;
    setItems((prev) => prev.filter((i) => i.candidateId !== candidateId));
  }

  function clearFiles() {
    if (isProcessing) return;
    setItems([]);
    setFileNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /** Reset run state for another batch; keeps title/JD/files for retry. */
  function resetRun() {
    runTokenRef.current += 1;
    stopStageTicker();
    setPhase("idle");
    setActiveIndex(null);
    setActiveStage(null);
    setResults([]);
    setBatchJdId("");
    setFatalError(null);
    setErrors({});
    setItems((prev) =>
      prev.map((i) => ({ ...i, status: "waiting", message: undefined })),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isProcessing || items.length === 0) return;

    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = "Enter the role title being screened.";
    if (!jd.trim()) nextErrors.jd = "Paste the job description for this role.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const jdId = slugify(title);
    if (!jdId) {
      setErrors({ title: "Use a title with at least one letter or number." });
      return;
    }

    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;
    const frozenJd = jd;
    setBatchJdId(jdId);
    setResults([]);
    setFatalError(null);
    setPhase("processing");

    // SEQUENTIAL loop: each resume finishes (ok / partial / error) before
    // the next one begins. Never Promise.all, never a batch request.
    for (let index = 0; index < items.length; index += 1) {
      if (runTokenRef.current !== runToken) return; // superseded by reset
      const item = items[index];
      setActiveIndex(index);
      setItems((prev) =>
        prev.map((i) =>
          i.candidateId === item.candidateId
            ? { ...i, status: "processing", message: undefined }
            : i,
        ),
      );
      startStageTicker();

      try {
        const resumeText = await readResumeText(item.file, item.kind);
        if (!resumeText.trim()) {
          if (item.kind === "PDF") {
            throw new Error(
              `No readable text was found in this PDF (${item.file.name}).`,
            );
          }
          throw new Error(`${item.file.name} appears to be empty.`);
        }
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jd: frozenJd,
            jd_id: jdId,
            resume_text: resumeText,
            candidate_id: item.candidateId,
          }),
        });
        if (!res.ok) {
          throw new Error(
            `Could not process ${item.file.name} (request failed). Processing continued with the remaining resumes.`,
          );
        }
        const data = (await res.json()) as Partial<IngestResponse>;
        if (data?.status === "ok") {
          setResults((prev) => [
            ...prev,
            {
              candidateId: item.candidateId,
              fileName: item.file.name,
              data: data as IngestResponse,
            },
          ]);
          setItems((prev) =>
            prev.map((i) =>
              i.candidateId === item.candidateId
                ? { ...i, status: "completed" }
                : i,
            ),
          );
        } else if (data?.status === "partial") {
          // Partial results are usable — record, warn visibly, continue.
          setResults((prev) => [
            ...prev,
            {
              candidateId: item.candidateId,
              fileName: item.file.name,
              data: data as IngestResponse,
            },
          ]);
          setItems((prev) =>
            prev.map((i) =>
              i.candidateId === item.candidateId
                ? {
                    ...i,
                    status: "partial",
                    message: "Partial result — usable for the shortlist.",
                  }
                : i,
            ),
          );
        } else {
          throw new Error(
            `Could not process ${item.file.name}. Processing continued with the remaining resumes.`,
          );
        }
      } catch (err) {
        // Technical detail goes to the console; the recruiter sees a
        // friendly message and the batch continues. Never rethrow here.
        console.error(`Ingest failed for ${item.file.name}:`, err);
        const message =
          err instanceof Error
            ? err.message
            : `Could not process ${item.file.name}. Processing continued with the remaining resumes.`;
        setItems((prev) =>
          prev.map((i) =>
            i.candidateId === item.candidateId
              ? { ...i, status: "failed", message }
              : i,
          ),
        );
      } finally {
        stopStageTicker();
      }
    }

    if (runTokenRef.current !== runToken) return;
    setActiveIndex(null);
    setActiveStage(null);
    setPhase("complete");
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Screen resumes for a role"
        className="flex flex-col gap-6"
      >
        {/* 1 — Role */}
        <section className="rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <label
            htmlFor="hireflow-title"
            className="block text-sm font-semibold text-neutral-900"
          >
            Role title
          </label>
          <input
            id="hireflow-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Backend Engineer"
            disabled={isProcessing}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "hireflow-title-error" : "hireflow-title-hint"}
            className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100"
          />
          {errors.title ? (
            <p id="hireflow-title-error" role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.title}
            </p>
          ) : (
            <p id="hireflow-title-hint" className="mt-1.5 text-sm text-neutral-500">
              Screening ID:{" "}
              <span className="font-mono text-neutral-700">
                {liveJdId || "—"}
              </span>{" "}
              · same ID is used for every resume in this batch
            </p>
          )}
        </section>

        {/* 2 — Job description */}
        <section className="rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <label
            htmlFor="hireflow-jd"
            className="block text-sm font-semibold text-neutral-900"
          >
            Job description
          </label>
          <textarea
            id="hireflow-jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder={"Paste the full job description here — responsibilities, required skills, years of experience…"}
            rows={10}
            disabled={isProcessing}
            aria-invalid={Boolean(errors.jd)}
            aria-describedby={errors.jd ? "hireflow-jd-error" : undefined}
            className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base leading-relaxed text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100"
          />
          {errors.jd && (
            <p id="hireflow-jd-error" role="alert" className="mt-1.5 text-sm font-medium text-red-700">
              {errors.jd}
            </p>
          )}
        </section>

        {/* 3 — Resumes */}
        <section
          aria-label="Resumes"
          className="rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
              Resumes{" "}
              <span className="font-normal text-neutral-500 normal-case">
                · {items.length} selected · PDF and TXT supported
              </span>
            </h2>
            {items.length > 0 && !isProcessing && !isComplete && (
              <button
                type="button"
                onClick={clearFiles}
                className="shrink-0 text-sm font-medium text-neutral-600 underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (isProcessing || isComplete) return;
              if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
            }}
            className={`mt-3 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
              dragActive
                ? "border-neutral-900 bg-neutral-100"
                : "border-neutral-300 bg-neutral-50 hover:border-neutral-400"
            }`}
          >
            <p className="text-lg font-semibold text-neutral-900">
              Drop resumes here
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              or browse files · multiple resumes supported · PDF and TXT supported
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              multiple
              disabled={isProcessing || isComplete}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
              aria-label="Choose PDF or TXT resumes"
              className="mx-auto mt-4 block text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-900 file:hover:bg-neutral-50 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-neutral-500">
              PDF text is extracted in your browser before screening — scanned,
              image-only PDFs without readable text will be flagged, not guessed.
            </p>
          </div>

          {fileNotice && (
            <p role="status" className="mt-2 text-sm font-medium text-amber-900">
              {fileNotice}
            </p>
          )}
          {errors.files && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {errors.files}
            </p>
          )}

          {items.length > 0 && (
            <>
              <p aria-live="polite" className="mt-3 text-sm font-medium text-neutral-700">
                {items.length} resume{items.length === 1 ? "" : "s"} ready
              </p>
              <ul
                aria-label="Selected resumes"
                className="mt-2 max-h-72 divide-y divide-neutral-200 overflow-y-auto rounded-md border border-neutral-200"
              >
                {items.map((item, index) => (
                  <li
                    key={item.candidateId}
                    className="flex items-center gap-3 bg-white px-3 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        item.kind === "PDF"
                          ? "border-neutral-300 bg-neutral-100 text-neutral-800"
                          : "border-neutral-200 bg-white text-neutral-600"
                      }`}
                    >
                      {item.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-900">
                        {index + 1}. {item.file.name}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {formatBytes(item.file.size)} · {item.candidateId}
                        {item.message ? ` · ${item.message}` : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                    {!isProcessing && !isComplete && (
                      <button
                        type="button"
                        onClick={() => removeFile(item.candidateId)}
                        aria-label={`Remove ${item.file.name} (${item.kind}, ${formatBytes(item.file.size)})`}
                        className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {fatalError && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-5 py-3 text-sm font-medium text-red-800">
            {fatalError}
          </p>
        )}

        {/* CTA */}
        {!isComplete && (
          <button
            type="submit"
            disabled={isProcessing || items.length === 0}
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-base font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-64"
          >
            {isProcessing ? "Screening in progress…" : ctaLabel}
          </button>
        )}
      </form>

      {/* Progress */}
      {(isProcessing || isComplete) && items.length > 0 && (
        <section
          aria-label="Batch progress"
          className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              AI screening pipeline
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-neutral-900">
              {isProcessing && activeIndex !== null
                ? `Processing ${activeIndex + 1} of ${items.length} — ${items[activeIndex]?.file.name}`
                : `Screening complete — ${items.length} resume${items.length === 1 ? "" : "s"}`}
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-neutral-600">
              {completedCount} completed · {partialCount} partial ·{" "}
              {failedCount} failed · {items.length} total
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={items.length}
              aria-valuenow={completedCount + partialCount + failedCount}
              aria-label="Resumes processed"
              className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200"
            >
              <div
                className="h-full rounded-full bg-neutral-900 transition-[width]"
                style={{
                  width: `${((completedCount + partialCount + failedCount) / items.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <PipelineStatus
            activeStage={isProcessing ? activeStage : null}
            isProcessing={isProcessing}
            currentFileName={
              isProcessing && activeIndex !== null
                ? items[activeIndex]?.file.name
                : undefined
            }
          />

          {isComplete && (
            <div
              aria-live="polite"
              className={`rounded-md border px-4 py-3 text-sm ${
                usableCount > 0
                  ? "border-neutral-300 bg-neutral-50 text-neutral-800"
                  : "border-red-300 bg-red-50 text-red-800"
              }`}
            >
              {usableCount > 0 ? (
                <>
                  <p className="font-semibold text-neutral-900">
                    Screening complete — {completedCount} successful
                    {partialCount > 0 ? `, ${partialCount} partial` : ""}
                    {failedCount > 0 ? `, ${failedCount} failed` : ""}.
                  </p>
                  <p className="mt-1 text-neutral-600">
                    {failedCount > 0
                      ? "Failed resumes are marked in the list above and were skipped. The shortlist below covers every resume HireFlow could screen."
                      : "Every resume was screened. Continue to the ranked shortlist."}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/results?jd_id=${encodeURIComponent(batchJdId)}`}
                      className="rounded-md bg-neutral-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-neutral-800"
                    >
                      View shortlist
                    </Link>
                    <button
                      type="button"
                      onClick={resetRun}
                      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                    >
                      Screen another batch
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    No candidates were successfully processed.
                  </p>
                  <p className="mt-1">
                    Nothing was sent to the shortlist. Check the failed files
                    above and try again — your role title, job description, and
                    selected resumes are kept.
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={resetRun}
                      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                    >
                      Try again
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Session results kept in memory: {results.length} usable screening
            {results.length === 1 ? "" : "s"} — persisted by the backend for the
            Results page.
          </p>
        </section>
      )}
    </div>
  );
}
