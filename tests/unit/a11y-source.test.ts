import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// While a route streams, its loading.tsx skeleton and the hidden streamed page
// coexist briefly. Only the real page may carry id="main-content", or the skip
// link would focus the skeleton and lose focus when React swaps it out.
describe("loading skeletons", () => {
  it.each(["src/app/(storefront)/cart/loading.tsx", "src/app/(storefront)/checkout/loading.tsx", "src/app/(storefront)/produk/(listing)/loading.tsx"])(
    "%s does not reuse id=main-content",
    (file) => {
      expect(readFileSync(file, "utf8")).not.toMatch(/id="main-content"/);
    },
  );
});
