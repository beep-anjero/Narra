// @vitest-environment node
import { expect, it } from "vitest";
import { isSameOrigin } from "@/lib/api/same-origin";
it("accepts the actual HTTP host when Next uses an internal hostname", () => {
  expect(
    isSameOrigin(
      new Request("http://localhost:3100/api", {
        headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      }),
    ),
  ).toBe(true);
  expect(
    isSameOrigin(
      new Request("http://internal/api", {
        headers: { host: "narra.example", origin: "https://narra.example" },
      }),
    ),
  ).toBe(true);
});
it("rejects cross-origin, malformed, missing origins and forged forwarding headers", () => {
  for (const origin of ["https://evil.example", "null", "https://narra.example/path", ""])
    expect(
      isSameOrigin(
        new Request("https://narra.example/api", {
          headers: { origin, "x-forwarded-host": "evil.example" },
        }),
      ),
    ).toBe(false);
});
