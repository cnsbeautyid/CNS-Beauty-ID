"use client";

import { ChevronDown } from "lucide-react";
import Form from "next/form";
import { useId } from "react";

import { SORT_OPTIONS, type CatalogQuery } from "@/services/catalog/query";

type SortSelectProps = { basePath: string; query: CatalogQuery };

/**
 * GET form, so sorting works without JavaScript (the visually hidden submit
 * button). With JS, choosing an option submits immediately and next/form
 * navigates client-side.
 */
export function SortSelect({ basePath, query }: SortSelectProps) {
  const id = useId();
  const kept = (["q", "kebutuhan", "kulit", "harga"] as const).filter((key) => query[key]);

  return (
    <Form action={basePath} scroll={false} className="flex items-center gap-2">
      {kept.map((key) => (
        <input key={key} type="hidden" name={key} value={query[key]} />
      ))}
      <label htmlFor={id} className="text-body-s text-text-secondary">
        Urutkan
      </label>
      <div className="relative">
        <select
          id={id}
          name="urut"
          defaultValue={query.urut}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-9 appearance-none rounded-md border border-border bg-background pr-9 pl-3 text-body-s text-text-primary hover:border-text-secondary"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
        />
      </div>
      <button type="submit" className="sr-only focus:not-sr-only focus:text-body-s">
        Terapkan
      </button>
    </Form>
  );
}
