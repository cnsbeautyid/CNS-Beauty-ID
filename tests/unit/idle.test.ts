import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { scheduleAfterLoadIdle } from "@/lib/utils/idle";

function fakeDeps(loaded: boolean) {
  let loadListener: (() => void) | undefined;
  let idleCallback: (() => void) | undefined;
  return {
    deps: {
      isLoaded: () => loaded,
      onLoad: (callback: () => void) => {
        loadListener = callback;
        return () => {
          loadListener = undefined;
        };
      },
      whenIdle: (callback: () => void) => {
        idleCallback = callback;
        return () => {
          idleCallback = undefined;
        };
      },
    },
    fireLoad: () => loadListener?.(),
    fireIdle: () => idleCallback?.(),
  };
}

describe("scheduleAfterLoadIdle", () => {
  it("waits for the load event, then for idle", () => {
    const task = vi.fn();
    const { deps, fireLoad, fireIdle } = fakeDeps(false);
    scheduleAfterLoadIdle(task, deps);
    fireIdle();
    expect(task).not.toHaveBeenCalled();
    fireLoad();
    expect(task).not.toHaveBeenCalled();
    fireIdle();
    expect(task).toHaveBeenCalledOnce();
  });

  it("goes straight to idle when the page has already loaded", () => {
    const task = vi.fn();
    const { deps, fireIdle } = fakeDeps(true);
    scheduleAfterLoadIdle(task, deps);
    fireIdle();
    expect(task).toHaveBeenCalledOnce();
  });

  it("never runs after being cancelled, at either stage", () => {
    const task = vi.fn();
    const early = fakeDeps(false);
    scheduleAfterLoadIdle(task, early.deps)();
    early.fireLoad();
    early.fireIdle();

    const late = fakeDeps(true);
    scheduleAfterLoadIdle(task, late.deps)();
    late.fireIdle();
    expect(task).not.toHaveBeenCalled();
  });
});

describe("conversation session", () => {
  it("loads the Supabase browser client lazily, never at module load", () => {
    const source = readFileSync("src/features/ai/use-conversation-session.ts", "utf8");
    expect(source).not.toMatch(/^import .*from "@\/lib\/supabase\/client"/m);
    expect(source).toMatch(/import\("@\/lib\/supabase\/client"\)/);
    expect(source).toMatch(/scheduleAfterLoadIdle/);
  });
});
