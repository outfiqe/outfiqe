export const dynamic = "force-dynamic";

const NEVER_CACHE_HEADERS = { "Cache-Control": "no-store" };

export const GET = () => Response.json({ status: "ok" }, { headers: NEVER_CACHE_HEADERS });
