export function GET() {
  return Response.json(
    { status: "ok", service: "narra-web" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
