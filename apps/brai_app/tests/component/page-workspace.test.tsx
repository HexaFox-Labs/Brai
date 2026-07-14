import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PAGE_WORKSPACE_REGISTRY, hasDesktopPageRail, hasMobilePageRail } from "@/features/app/appModel";
import { PageWorkspace } from "@/features/app/chrome/PageWorkspace";

describe("PageWorkspace", () => {
  it("centers a panel-free main column and gives an open panel a fixed half", () => {
    const view = render(<PageWorkspace main={<div>Главная</div>} />);

    expect(screen.getByText("Главная").parentElement).toHaveClass("max-w-3xl");
    expect(document.querySelector(".page-panel")).not.toBeInTheDocument();

    view.rerender(<PageWorkspace main={<div>Главная</div>} persistentPanel={<div>Постоянная</div>} />);
    expect(document.querySelector(".page-workspace")).toHaveClass("grid-cols-2", "has-panel");
    expect(screen.getByText("Постоянная")).toBeInTheDocument();
  });

  it("removes the centered maximum for an explicit full-bleed page", () => {
    render(<PageWorkspace fullBleed main={<div>Полный экран</div>} />);

    expect(screen.getByText("Полный экран").parentElement).toHaveClass("w-full", "max-w-none");
    expect(screen.getByText("Полный экран").parentElement).not.toHaveClass("max-w-3xl", "mx-auto");
  });

  it("temporarily replaces and then restores the persistent panel", () => {
    const view = render(
      <PageWorkspace
        main={<div>Главная</div>}
        persistentPanel={<div>Постоянная</div>}
        temporaryPanel={<div>Временная</div>}
      />,
    );

    expect(screen.getByText("Временная")).toBeInTheDocument();
    expect(screen.queryByText("Постоянная")).not.toBeInTheDocument();

    view.rerender(<PageWorkspace main={<div>Главная</div>} persistentPanel={<div>Постоянная</div>} />);
    expect(screen.getByText("Постоянная")).toBeInTheDocument();
  });
});

describe("page workspace registry", () => {
  it("keeps rail modes platform-specific", () => {
    expect(hasDesktopPageRail("actions")).toBe(true);
    expect(hasMobilePageRail("actions")).toBe(true);
    expect(hasDesktopPageRail("focus")).toBe(false);
    expect(hasMobilePageRail("focus", true)).toBe(false);
    expect(hasDesktopPageRail("brai-cmd")).toBe(false);
    expect(hasMobilePageRail("brai-cmd", false)).toBe(false);
    expect(hasMobilePageRail("brai-cmd", true)).toBe(true);
    expect(PAGE_WORKSPACE_REGISTRY.draws.fullscreenOverride).toBe(true);
    expect(PAGE_WORKSPACE_REGISTRY.focus.persistentPanels).toEqual(["goal", "history"]);
  });
});
