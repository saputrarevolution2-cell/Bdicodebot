export function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    service: "telecod-pages",
    environment: env.ENVIRONMENT || "production"
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
