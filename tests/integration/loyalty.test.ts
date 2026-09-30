import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ getSessionUser: vi.fn(), redeemReward: vi.fn(), revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/services/loyalty/loyalty", () => ({ redeemReward: mocks.redeemReward }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { redeemRewardAction } = await import("@/features/loyalty/actions");

const REWARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "a@b.c" });
});

describe("redeemRewardAction", () => {
  it("requires sign-in and a valid reward id", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    expect(await redeemRewardAction(REWARD)).toMatchObject({ ok: false, code: "unauthenticated" });
    mocks.getSessionUser.mockResolvedValue({ id: "user-1" });
    expect(await redeemRewardAction("x")).toMatchObject({ ok: false, code: "error" });
    expect(mocks.redeemReward).not.toHaveBeenCalled();
  });

  it("redeems for the session user and returns the voucher code", async () => {
    mocks.redeemReward.mockResolvedValue({ status: "ok", couponCode: "RWABCD1234" });
    expect(await redeemRewardAction(REWARD)).toEqual({ ok: true, couponCode: "RWABCD1234", message: "Berhasil! Kode voucher kamu: RWABCD1234" });
    expect(mocks.redeemReward).toHaveBeenCalledWith("user-1", REWARD);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/loyalty");
  });

  it("explains ledger rejections without guessing", async () => {
    mocks.redeemReward.mockResolvedValue({ status: "rejected", reason: "points_insufficient", balance: 1200 });
    expect(await redeemRewardAction(REWARD)).toMatchObject({ ok: false, message: "Poin belum cukup (saldo 1.200 poin)." });
    mocks.redeemReward.mockResolvedValue({ status: "rejected", reason: "reward_out_of_stock" });
    expect(await redeemRewardAction(REWARD)).toMatchObject({ ok: false, message: "Stok hadiah ini sudah habis." });
    mocks.redeemReward.mockResolvedValue({ status: "unavailable" });
    expect(await redeemRewardAction(REWARD)).toMatchObject({ ok: false, message: "Penukaran poin belum tersedia saat ini." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
