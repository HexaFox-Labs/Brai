"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Archive, CalendarDays, Ellipsis, Flag, Maximize2, Plus, Tag } from "lucide-react";
import { cleanTitle, normalizeDescription, singleLineTitle } from "@/shared/activities/text";
import { Button } from "@/shared/ui/button";
import { cx, fitTextareaHeight } from "../appUtils";

const MOBILE_CREATE_TOOL_ICONS = [
  ["calendar", CalendarDays],
  ["flag", Flag],
  ["tag", Tag],
  ["archive", Archive],
  ["expand", Maximize2],
  ["more", Ellipsis],
] as const;

export function MobileCreateComposer({
  descriptionLabel,
  submitLabel,
  titleLabel,
  onCancel,
  onSubmit,
}: {
  descriptionLabel: string;
  submitLabel: string;
  titleLabel: string;
  onCancel: () => void;
  onSubmit: (title: string, descriptionMd: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionActive, setDescriptionActive] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const canSubmit = Boolean(cleanTitle(title));

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    fitTextareaHeight(titleRef.current);
    fitTextareaHeight(descriptionRef.current);
  }, [description, title]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = cleanTitle(title);
    if (!trimmed) return;
    await onSubmit(trimmed, normalizeDescription(description));
  }

  function onTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      descriptionRef.current?.focus();
    }
  }

  function onDescriptionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onCancel();
  }

  return (
    <form
      className="actions-mobile-editor flex max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_8px)] w-full flex-col overflow-hidden rounded-t-2xl bg-card px-6 pb-4 pt-6 shadow-xl"
      onClick={(event) => event.stopPropagation()}
      onSubmit={submit}
    >
      <div className="mobile-create-text min-h-[84px] min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <textarea
          ref={titleRef}
          className="actions-mobile-create-title block min-h-6 w-full min-w-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-base/6 font-normal tracking-normal text-foreground placeholder:text-muted-foreground/65 focus:outline-0"
          value={title}
          rows={1}
          enterKeyHint="enter"
          placeholder="Что бы вы хотели сделать?"
          aria-label={titleLabel}
          onChange={(event) => setTitle(singleLineTitle(event.target.value))}
          onKeyDown={onTitleKeyDown}
        />
        <textarea
          ref={descriptionRef}
          className="actions-mobile-create-description mt-2 block min-h-12 w-full min-w-0 resize-none overflow-hidden border-0 bg-transparent p-0 text-base/6 font-normal tracking-normal text-foreground placeholder:text-muted-foreground/65 focus:outline-0"
          value={description}
          rows={2}
          enterKeyHint="enter"
          placeholder={descriptionActive || description ? "Описание" : ""}
          aria-label={descriptionLabel}
          onFocus={() => setDescriptionActive(true)}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={onDescriptionKeyDown}
        />
      </div>
      <div className="mobile-create-toolbar mt-7 flex h-10 shrink-0 items-center justify-between gap-4 text-muted-foreground">
        <div className="flex min-w-0 items-center gap-4">
          {MOBILE_CREATE_TOOL_ICONS.map(([name, Icon]) => (
            <span key={name} className="mobile-create-tool-icon inline-grid size-6 place-items-center" aria-hidden="true">
              <Icon className="size-5" />
            </span>
          ))}
        </div>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          className={cx(
            "actions-add-submit rounded-full",
            canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-secondary text-muted-foreground",
          )}
          aria-label={submitLabel}
          title={submitLabel}
          disabled={!canSubmit}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
