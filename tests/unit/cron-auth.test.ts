import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authorized } from "@/lib/auth/cron";

describe("authorized (cron bearer check)", () => {
  it("accepts exactly Bearer <secret>", () => {
    expect(authorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it.each([
    ["missing", null],
    ["wrong secret", "Bearer nope!!"],
    ["different length", "Bearer s3cret-and-more"],
    ["no scheme", "s3cret"],
    ["lowercase scheme", "bearer s3cret"],
  ])("rejects %s", (_label, header) => {
    expect(authorized(header, "s3cret")).toBe(false);
  });
});
