import { cx } from "@/features/app/appUtils";

export function BraiBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="197 854 368 368"
      className={cx("block size-5 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <image href="/brand/brai-logo-transparent.svg" x="197" y="854" width="779" height="368" />
    </svg>
  );
}
