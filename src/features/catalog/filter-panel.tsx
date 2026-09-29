import { Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import type { CatalogFacets } from "@/services/catalog/products";
import { buildCatalogHref, PRICE_RANGES, type CatalogQuery, type CatalogQueryPatch } from "@/services/catalog/query";

type FilterPanelProps = {
  basePath: string;
  query: CatalogQuery;
  facets: CatalogFacets;
  idPrefix: string;
};

type Option = { value: string; label: string };

/** Filter groups as plain links: crawlable, work without JavaScript. */
export function FilterPanel({ basePath, query, facets, idPrefix }: FilterPanelProps) {
  const groups: { key: "kebutuhan" | "kulit" | "harga"; title: string; options: Option[] }[] = [
    { key: "kebutuhan", title: "Kebutuhan kulit", options: facets.concerns.map((c) => ({ value: c.slug, label: c.name })) },
    { key: "kulit", title: "Jenis kulit", options: facets.skinTypes.map((s) => ({ value: s.slug, label: s.name })) },
    { key: "harga", title: "Harga", options: PRICE_RANGES.map((r) => ({ value: r.id, label: r.label })) },
  ];

  return (
    <div className="flex flex-col gap-8">
      {groups
        .filter((group) => group.options.length > 0)
        .map((group) => {
          const headingId = `${idPrefix}-${group.key}`;
          return (
            <div key={group.key} role="group" aria-labelledby={headingId}>
              <h2 id={headingId} className="font-body text-caption font-medium tracking-eyebrow text-text-primary uppercase">
                {group.title}
              </h2>
              <ul className="mt-3 flex flex-col">
                {group.options.map((option) => {
                  const selected = query[group.key] === option.value;
                  // Choosing the selected option again clears that filter.
                  const patch: CatalogQueryPatch = { [group.key]: selected ? undefined : option.value };
                  return (
                    <li key={option.value}>
                      <Link
                        href={buildCatalogHref(basePath, query, patch)}
                        aria-current={selected ? "true" : undefined}
                        scroll={false}
                        className={cn(
                          "flex min-h-10 items-center gap-2 text-body-s transition-colors duration-(--duration-base)",
                          selected ? "font-medium text-brand-cocoa" : "text-text-secondary hover:text-text-primary",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                            selected ? "border-brand-cocoa bg-brand-cocoa text-on-primary" : "border-border",
                          )}
                        >
                          {selected && <Check className="size-3" strokeWidth={2.5} />}
                        </span>
                        {option.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
    </div>
  );
}
