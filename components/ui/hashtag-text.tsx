"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// Teks caption dgn hashtag berwarna ungu tema (kata berawalan #).
// Tanda baca di ujung tag (, . ! ? ;) tidak ikut diwarnai.
export function HashtagText({ text }: { text: string }) {
  const parts = text.split(/(#[^\s#.,!?;:()"']+)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-medium text-brand-700 dark:text-brand-400">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// Textarea dgn highlight hashtag live: backdrop tak terlihat meniru metrik
// textarea persis (padding/font/wrap), textarea sendiri dibuat transparan
// kecuali caret. Scroll vertikal disinkronkan.
export function HashtagTextarea({
  id,
  rows = 4,
  value,
  onChange,
  className,
  placeholder,
  disabled,
}: {
  id?: string;
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  function syncScroll() {
    if (areaRef.current && backRef.current) {
      backRef.current.scrollTop = areaRef.current.scrollTop;
    }
  }
  return (
    <div className="relative">
      <div
        ref={backRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent px-3 py-2 text-[16px] text-zinc-900 sm:text-sm dark:text-zinc-100"
      >
        <HashtagText text={value} />
        {value.endsWith("\n") ? " " : ""}
      </div>
      <textarea
        ref={areaRef}
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          syncScroll();
        }}
        onScroll={syncScroll}
        placeholder={placeholder}
        className={cn(className, "relative bg-transparent text-transparent caret-zinc-900 dark:text-transparent dark:caret-zinc-100")}
      />
    </div>
  );
}

// Input satu baris dgn highlight hashtag live (teknik sama, sumbu horizontal).
export function HashtagInput({
  id,
  value,
  onChange,
  onKeyDown,
  className,
  placeholder,
  disabled,
  inputRef,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  ariaLabel?: string;
}) {
  const backRef = useRef<HTMLDivElement>(null);
  function syncScroll(el: HTMLInputElement) {
    if (backRef.current) backRef.current.scrollLeft = el.scrollLeft;
  }
  return (
    <div className="relative w-full">
      <div
        ref={backRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre border border-transparent px-3 py-2 text-[16px] text-zinc-900 sm:text-sm dark:text-zinc-100"
      >
        <HashtagText text={value} />
      </div>
      <input
        ref={inputRef}
        id={id}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          syncScroll(e.currentTarget);
        }}
        onScroll={(e) => syncScroll(e.currentTarget)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(className, "relative bg-transparent text-transparent caret-zinc-900 dark:text-transparent dark:caret-zinc-100")}
      />
    </div>
  );
}
