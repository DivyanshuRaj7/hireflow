import { ApiError, fetchShortlist } from "@/lib/api";

/** Thin forwarder: browser -> /api/shortlist -> n8n shortlist webhook. */
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { jd_id } = body as { jd_id?: unknown };

  if (typeof jd_id !== "string" || jd_id.length === 0) {
    return Response.json({ error: "Required field: jd_id." }, { status: 400 });
  }

  try {
    const data = await fetchShortlist(jd_id);
    return Response.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return Response.json({ error: "Unexpected shortlist failure." }, { status: 500 });
  }
}
