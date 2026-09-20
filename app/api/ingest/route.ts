import { ApiError, ingestCandidate } from "@/lib/api";
import type { IngestRequest } from "@/lib/types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Thin forwarder: browser -> /api/ingest -> n8n ingest webhook.
 * Accepts exactly ONE resume per call; batch looping lives in the
 * UploadForm component (Part 2), not here.
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { jd, jd_id, resume_text, candidate_id } = body as Partial<IngestRequest>;

  if (
    !isNonEmptyString(jd) ||
    !isNonEmptyString(jd_id) ||
    !isNonEmptyString(resume_text) ||
    !isNonEmptyString(candidate_id)
  ) {
    return Response.json(
      { error: "Required fields: jd, jd_id, resume_text, candidate_id." },
      { status: 400 },
    );
  }

  try {
    const data = await ingestCandidate({ jd, jd_id, resume_text, candidate_id });
    return Response.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return Response.json({ error: "Unexpected ingest failure." }, { status: 500 });
  }
}
