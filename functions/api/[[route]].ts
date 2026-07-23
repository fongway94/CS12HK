/**
 * Cloudflare Pages Functions - API Router
 * Plug ready for D1/KV/Workers when DB provisioned
 * 
 * Current app uses LocalStorage adapter (client-side) for zero-backend dev.
 * When you provision D1, switch to D1Adapter and expose these routes.
 * 
 * Example: GET /api/products -> returns products from D1
 * Example: POST /api/orders -> creates order in D1
 */

export const onRequest: PagesFunction<{ DB: D1Database, SESSIONS: KVNamespace }> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const path = url.pathname.replace("/api/", "")

  // Placeholder responses – replace with real D1 queries
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }

  if (path.startsWith("products")) {
    return new Response(JSON.stringify({ message: "D1 not yet provisioned. Using localAdapter on frontend.", hint: "Run wrangler d1 create cs12_db and switch adapter in src/lib/db/index.ts" }), { headers })
  }

  if (path === "health") {
    return new Response(JSON.stringify({ status: "ok", env: ctx.env, timestamp: new Date().toISOString() }), { headers })
  }

  return new Response(JSON.stringify({ error: "Not implemented yet - DB not provisioned", path }), { status: 404, headers })
}
