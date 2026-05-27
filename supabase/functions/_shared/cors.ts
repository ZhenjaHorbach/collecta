// Browser fetch() to an edge function with Authorization / Content-Type:
// application/json / apikey headers triggers a CORS preflight (OPTIONS).
// The Supabase gateway forwards OPTIONS to the function as-is, so each
// function must answer the preflight AND include CORS headers on every
// real response. Without this, native works (no preflight) but web
// returns 405 on the preflight and the call never reaches the function.

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

/**
 * Return a preflight response if the request is OPTIONS, otherwise null.
 * Call at the top of `Deno.serve` before any auth or method checks.
 */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}

/**
 * Wrap a JSON response with CORS headers. Mirrors the inline `jsonResponse`
 * helpers each function already has — pass through status and body.
 */
export function jsonWithCors(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
