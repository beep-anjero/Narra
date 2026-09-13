import { demoNameSchema } from "@/features/demo/catalog";
import { filterRequestSchema } from "@/features/filters/contracts";
import { readUploadBody } from "@/features/upload/read-body";
import { UploadError } from "@/features/upload/contracts";
import { demoCsv, filterDemo } from "@/lib/api/demo";
import { isSameOrigin } from "@/lib/api/same-origin";
export const runtime = "nodejs";
export const maxDuration = 90;
type Context = { params: Promise<{ name: string }> };
export async function GET(_request: Request, { params }: Context) {
  const parsed = demoNameSchema.safeParse((await params).name);
  if (!parsed.success) return new Response("Unknown demo dataset", { status: 404 });
  return new Response(Uint8Array.from(await demoCsv(parsed.data)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parsed.data}.csv"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
export async function POST(request: Request, { params }: Context) {
  try {
    if (!isSameOrigin(request))
      throw new UploadError("invalid_origin", "Open the Narra demo to apply filters.", 403);
    const name = demoNameSchema.safeParse((await params).name);
    if (!name.success)
      throw new UploadError("demo_missing", "Choose an available sample dataset.", 404);
    const content = await readUploadBody(request, 65536);
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(content));
    } catch {
      throw new UploadError("invalid_filter", "The demo filters are unreadable.");
    }
    const filters = filterRequestSchema.safeParse(payload);
    if (!filters.success) throw new UploadError("invalid_filter", "Enter valid demo filters.");
    return Response.json(await filterDemo(name.data, filters.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure =
      error instanceof UploadError
        ? error
        : new UploadError(
            "demo_unavailable",
            "Demo filtering is unavailable. Please retry when the analytics service is running.",
            503,
          );
    return Response.json(
      { error: { code: failure.code, message: failure.message } },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
