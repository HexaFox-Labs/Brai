import type { ReactNode } from "react";
import { cx } from "../appUtils";

/** Shared responsive geometry for page main content and its optional panel. */
export function PageWorkspace({
  className,
  main,
  mainClassName,
  persistentPanel,
  temporaryPanel,
  panelClassName,
}: {
  className?: string;
  main: ReactNode;
  mainClassName?: string;
  persistentPanel?: ReactNode;
  temporaryPanel?: ReactNode;
  panelClassName?: string;
}) {
  const panel = temporaryPanel ?? persistentPanel;
  const split = panel != null;

  return (
    <div
      className={cx(
        "page-workspace grid h-full min-h-0 min-w-0 overflow-hidden max-[860px]:block",
        split ? "has-panel grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      <div
        className={cx(
          "page-main h-full min-h-0 min-w-0 overflow-auto overscroll-contain",
          !split && "mx-auto w-full max-w-5xl",
          mainClassName,
        )}
      >
        {main}
      </div>
      {split ? (
        <aside
          className={cx("page-panel h-full min-h-0 min-w-0 overflow-auto overscroll-contain max-[860px]:hidden", panelClassName)}
          data-nav-swipe-exclusion
        >
          {panel}
        </aside>
      ) : null}
    </div>
  );
}
