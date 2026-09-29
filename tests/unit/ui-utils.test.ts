import { describe, expect, it } from "vitest";

import { getActiveAnnouncement } from "@/components/layout/announcement-bar";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatIDR, formatRating } from "@/lib/utils/format";
import { isActivePath } from "@/lib/utils/nav";

describe("formatIDR", () => {
  it("formats whole rupiah with Indonesian grouping", () => {
    expect(formatIDR(150000)).toBe("Rp 150.000");
    expect(formatIDR(0)).toBe("Rp 0");
  });

  it("never shows decimals", () => {
    expect(formatIDR(99999.6)).toBe("Rp 100.000");
  });
});

describe("formatRating", () => {
  it("uses a comma decimal separator", () => {
    expect(formatRating(4.6)).toBe("4,6");
    expect(formatRating(5)).toBe("5,0");
  });
});

describe("formatDate", () => {
  it("formats in Indonesian, in Jakarta time", () => {
    expect(formatDate("2026-10-01T09:00:00+07:00")).toBe("1 Oktober 2026");
    // 20:00 UTC on 30 Sep is already 1 Oct in Jakarta.
    expect(formatDate("2026-09-30T20:00:00Z")).toBe("1 Oktober 2026");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("isActivePath", () => {
  it("matches home only on exact path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/produk", "/")).toBe(false);
  });

  it("matches sections and their children", () => {
    expect(isActivePath("/produk", "/produk")).toBe(true);
    expect(isActivePath("/produk/serum", "/produk")).toBe(true);
    expect(isActivePath("/produk-baru", "/produk")).toBe(false);
  });
});

describe("getActiveAnnouncement", () => {
  const now = new Date("2026-10-05T12:00:00+07:00");

  it("returns nothing when no announcement is configured", () => {
    expect(getActiveAnnouncement([], now)).toBeUndefined();
  });

  it("respects the start and end window", () => {
    const items = [
      { id: "past", message: "Past", endsAt: "2026-10-01T00:00:00+07:00" },
      { id: "future", message: "Future", startsAt: "2026-11-01T00:00:00+07:00" },
      { id: "live", message: "Live", startsAt: "2026-10-01T00:00:00+07:00", endsAt: "2026-10-31T00:00:00+07:00" },
    ];
    expect(getActiveAnnouncement(items, now)?.id).toBe("live");
  });
});
