"use client";

import type { MouseEvent } from "react";

const TARGET_ID = "main-content";

/**
 * "Langsung ke konten utama". Moves focus (not just the scroll position) to
 * <main id="main-content"> so keyboard and screen-reader users continue from
 * the content. Without JavaScript it is still a plain in-page anchor.
 */
export function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById(TARGET_ID);
    if (!main) return;
    event.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  };

  return (
    <a
      href={`#${TARGET_ID}`}
      onClick={skip}
      className="sr-only rounded-md bg-primary px-4 py-2 text-body-s text-on-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
    >
      Langsung ke konten utama
    </a>
  );
}
