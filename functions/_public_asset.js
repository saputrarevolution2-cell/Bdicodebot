// PasTele public pretty-route asset router.
// Keeps the browser URL (/c/f/SLUG, /pf/SLUG, etc.) unchanged and serves
// the existing public HTML page internally. The page JavaScript then reads
// the original pathname and resolves the slug itself.
export async function servePublicAsset(context, assetPath) {
  const { request, env } = context;
  if (!env?.ASSETS?.fetch) {
    return new Response("Pages asset binding is unavailable.", { status: 500 });
  }

  const target = new URL(assetPath, request.url);
  // Keep the original query string (guest_token, etc.).
  target.search = new URL(request.url).search;

  return env.ASSETS.fetch(new Request(target.toString(), request));
}
