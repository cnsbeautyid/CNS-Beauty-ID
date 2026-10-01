// Defers non-critical work until the page has loaded and the browser is idle,
// so it never competes with first paint or hydration (Phase 20).

export type IdleDeps = {
  isLoaded(): boolean;
  onLoad(callback: () => void): () => void;
  whenIdle(callback: () => void): () => void;
};

const IDLE_FALLBACK_MS = 1500;

function browserDeps(): IdleDeps {
  return {
    isLoaded: () => document.readyState === "complete",
    onLoad: (callback) => {
      window.addEventListener("load", callback, { once: true });
      return () => window.removeEventListener("load", callback);
    },
    whenIdle: (callback) => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(() => callback(), { timeout: IDLE_FALLBACK_MS });
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(callback, IDLE_FALLBACK_MS);
      return () => window.clearTimeout(id);
    },
  };
}

/** Runs `task` once, after `load` and then idle. The returned function cancels it. */
export function scheduleAfterLoadIdle(task: () => void, deps: IdleDeps = browserDeps()): () => void {
  let cancelIdle: (() => void) | undefined;
  let cancelLoad: (() => void) | undefined;
  let cancelled = false;
  const toIdle = () => {
    if (cancelled) return;
    cancelIdle = deps.whenIdle(() => {
      if (!cancelled) task();
    });
  };
  if (deps.isLoaded()) toIdle();
  else cancelLoad = deps.onLoad(toIdle);
  return () => {
    cancelled = true;
    cancelLoad?.();
    cancelIdle?.();
  };
}
