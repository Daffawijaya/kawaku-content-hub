"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const CloseContext = createContext(() => {});

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-40",
  menuClassName,
}: {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  // Menu dibalik ke atas bila ruang bawah tidak cukup (mis. baris terakhir tabel).
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <CloseContext.Provider value={() => setOpen(false)}>
      <div ref={ref} className="relative">
        <div
          onClick={() => {
            if (!open && ref.current) {
              const r = ref.current.getBoundingClientRect();
              setUp(window.innerHeight - r.bottom < 220);
            }
            setOpen((v) => !v);
          }}
        >
          {trigger(open)}
        </div>
        {open && (
          <div
            role="menu"
            className={cn(
              "absolute z-10 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-[#212121]",
              align === "right" ? "right-0" : "left-0",
              up ? "bottom-full mb-1.5" : "top-full mt-1.5",
              width,
              menuClassName
            )}
          >
            {children}
          </div>
        )}
      </div>
    </CloseContext.Provider>
  );
}

export function DropdownItem({
  icon,
  children,
  onClick,
  href,
  external,
  danger,
  selected,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
  selected?: boolean;
}) {
  const close = useContext(CloseContext);
  const cls = cn(
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800",
    danger
      ? "font-medium text-rose-600 dark:text-rose-400"
      : selected
        ? "font-medium text-zinc-900 dark:text-white"
        : "text-zinc-500 dark:text-zinc-400"
  );
  const inner = (
    <>
      {icon}
      <span className="flex-1">{children}</span>
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
    </>
  );
  if (href) {
    if (external || /^https?:/.test(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          onClick={close}
          className={cls}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} role="menuitem" onClick={close} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick?.();
        close();
      }}
      className={cls}
    >
      {inner}
    </button>
  );
}
