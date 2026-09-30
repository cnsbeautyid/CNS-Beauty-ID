import { ButtonLink } from "@/components/ui/button";

/** Previous/next links for a paginated admin list (URL state `?halaman=`). */
export function Pager({ page, pageCount, href, label }: { page: number; pageCount: number; href: (page: number) => string; label: string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-4 text-body-s">
      {page > 1 ? (
        <ButtonLink href={href(page - 1)} variant="secondary" size="sm">
          Sebelumnya
        </ButtonLink>
      ) : (
        <span />
      )}
      <span className="text-text-secondary">
        Halaman {page} dari {pageCount}
      </span>
      {page < pageCount ? (
        <ButtonLink href={href(page + 1)} variant="secondary" size="sm">
          Berikutnya
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
