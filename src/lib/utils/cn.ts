type ClassValue = string | false | null | undefined;

/**
 * Joins class names, skipping falsy values. No conflict merging is done, so a
 * caller's `className` must never conflict with a component's own utilities
 * (e.g. passing `hidden` to something that sets `inline-flex`): which one wins
 * depends on Tailwind's CSS order. Add a variant prop or wrap in an element.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
