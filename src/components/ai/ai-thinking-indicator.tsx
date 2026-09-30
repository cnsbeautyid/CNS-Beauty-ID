/**
 * Shows that a reply is being prepared (and which controlled tool is running).
 * Never shows the model's reasoning. Dots are static under reduced motion.
 */
export function AIThinkingIndicator({ label }: { label: string | null }) {
  return (
    <div className="flex items-center gap-2 text-caption text-text-secondary">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 rounded-pill bg-ai-accent motion-safe:animate-pulse"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </span>
      <span>{label ?? "Sedang menyiapkan jawaban…"}</span>
    </div>
  );
}
