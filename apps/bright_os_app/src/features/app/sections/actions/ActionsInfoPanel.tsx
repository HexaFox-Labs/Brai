"use client";

import { X } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cx } from "../../appUtils";

export function ActionsInfoPanel({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  return (
    <aside
      className={cx(
        "actions-info-panel grid min-w-0 gap-3",
        mobile
          ? "py-1"
          : "desktop h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden pl-7 max-[860px]:hidden",
      )}
      aria-label="Информация о действиях"
      data-nav-swipe-exclusion
    >
      {!mobile && onClose ? (
        <header className="flex min-h-9 justify-end">
          <button
            type="button"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-border bg-secondary text-xl leading-none text-foreground"
            aria-label="Закрыть информацию о действиях"
            title="Закрыть"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
      ) : null}
      {mobile ? (
        <Card className="min-h-40 p-5">
          <p className="m-0 text-sm font-normal text-muted-foreground">Панель информации</p>
        </Card>
      ) : (
        <ScrollArea className="min-h-0">
          <Card className="min-h-40 p-5">
            <p className="m-0 text-sm font-normal text-muted-foreground">Панель информации</p>
          </Card>
        </ScrollArea>
      )}
    </aside>
  );
}
