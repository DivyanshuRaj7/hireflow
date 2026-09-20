/**
 * Typed server-side helpers for the live n8n webhooks.
 *
 * These run on the server (Next.js route handlers) and read the webhook URLs
 * from process.env, so the URLs are never hard-coded or shipped to the browser.
 * Browser code must call the thin /api/* routes instead of importing this module.
 *
 * Only the ingest and shortlist endpoints exist. There are deliberately NO
 * helpers for NL-query or interview-notes — those backends are not built yet.
 */

import type {
  IngestRequest,
  IngestResponse,
  ShortlistResponse,
} from "@/lib/types";

/** Thrown when a webhook call cannot be completed. Never swallowed:
 * route handlers convert this into a visible error response. */
export class ApiError extends Error {
  readonly httpStatus?: number;
  readonly endpoint: "ingest" | "shortlist";

  constructor(
    message: string,
    endpoint: "ingest" | "shortlist",
    httpStatus?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.endpoint = endpoint;
    this.httpStatus = httpStatus;
  }
}

function requireWebhookUrl(
  value: string | undefined,
  envName: "N8N_INGEST_WEBHOOK_URL" | "N8N_SHORTLIST_WEBHOOK_URL",
  endpoint: "ingest" | "shortlist",
): string {
  if (!value) {
    throw new ApiError(
      `Missing ${envName}. Set it in .env.local (see env.local.example).`,
      endpoint,
    );
  }
  return value;
}

async function postJson<T>(
  url: string,
  body: unknown,
  endpoint: "ingest" | "shortlist",
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(
      `Could not reach the ${endpoint} webhook: ${err instanceof Error ? err.message : String(err)}`,
      endpoint,
    );
  }

  if (!res.ok) {
    const excerpt = (await res.text()).slice(0, 500);
    throw new ApiError(
      `${endpoint} webhook returned HTTP ${res.status}: ${excerpt}`,
      endpoint,
      res.status,
    );
  }

  return (await res.json()) as T;
}

/**
 * Send ONE resume to the ingest webhook. Call once per resume file,
 * reusing the same `jd` and `jd_id` for every call in a batch.
 */
export async function ingestCandidate(
  req: IngestRequest,
): Promise<IngestResponse> {
  const url = requireWebhookUrl(
    process.env.N8N_INGEST_WEBHOOK_URL,
    "N8N_INGEST_WEBHOOK_URL",
    "ingest",
  );
  return postJson<IngestResponse>(url, req, "ingest");
}

/** Fetch the ranked shortlist of stored candidates for one JD. */
export async function fetchShortlist(
  jdId: string,
): Promise<ShortlistResponse> {
  const url = requireWebhookUrl(
    process.env.N8N_SHORTLIST_WEBHOOK_URL,
    "N8N_SHORTLIST_WEBHOOK_URL",
    "shortlist",
  );
  return postJson<ShortlistResponse>(url, { jd_id: jdId }, "shortlist");
}
