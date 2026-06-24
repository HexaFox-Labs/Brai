import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";

describe("shadcn-compatible UI foundation", () => {
  it("merges conflicting Tailwind classes through cn", () => {
    expect(cn("px-4 text-sm", false, "px-7")).toBe("text-sm px-7");
  });

  it("renders source-owned primitives without wiring them into app screens", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Foundation</CardTitle>
          <CardDescription>Shared primitives</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="px-7">
            <a href="/focus">Фокус</a>
          </Button>
          <Input aria-label="Название" placeholder="Действие" />
          <Textarea aria-label="Описание" />
          <Label>
            <Switch />
            md просмотр
          </Label>
          <Badge variant="secondary">Готово</Badge>
        </CardContent>
      </Card>,
    );

    expect(screen.getByRole("link", { name: "Фокус" })).toHaveClass("px-7");
    expect(screen.getByRole("textbox", { name: "Название" })).toHaveAttribute("placeholder", "Действие");
    expect(screen.getByRole("textbox", { name: "Описание" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "md просмотр" })).toHaveAttribute("data-slot", "switch");
    expect(screen.getByText("Готово")).toHaveAttribute("data-slot", "badge");
  });

  it("renders reusable Markdown content without raw HTML", () => {
    const { container } = render(<MarkdownContent source={"## Заголовок\n\n**Важно** <b>сырой html</b>"} />);

    expect(screen.getByRole("heading", { name: "Заголовок", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Важно")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });
});
