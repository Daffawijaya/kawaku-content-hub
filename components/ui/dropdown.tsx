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
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const CloseContext = createContext(() => {});

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-40",
  menuClassName,
  portal = false,
}: {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  menuClassName?: string;
  // true = menu dirender via portal (fixed) agar tak terpotong wadah
  // overflow (mis. di dalam modal). Default false = perilaku lama.
  portal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Menu dibalik ke atas bila ruang bawah tidak cukup (mis. baris terakhir tabel).
  const [up, setUp] = useState(false);
  const [pos, setPos] = useState<{
    left?: number;
    right?: number;
    width?: number;
    top?: number;
    bottom?: number;
    centered?: boolean;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function place() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const isUp = window.innerHeight - r.bottom < 220;
    setUp(isUp);
    if (portal) {
      const vertical = isUp
        ? { bottom: window.innerHeight - r.top + 6 }
        : { top: r.bottom + 6 };
      // w-full = selebar trigger (mis. select peran); lebar fix (w-48/dll)
      // biar diatur class agar tak sekecil tombol aksi.
      if (width === "w-full") {
        setPos({ left: r.left, width: r.width, ...vertical });
      } else if (align === "right") {
        setPos({ right: window.innerWidth - r.right, ...vertical });
      } else if (align === "center") {
        setPos({ left: r.left + r.width / 2, centered: true, ...vertical });
      } else {
        setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 8)), ...vertical });
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Menu portal menempel ke trigger walau halaman/modal di-scroll.
    if (portal) {
      window.addEventListener("resize", onScroll);
      document.addEventListener("scroll", onScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open ]);

  // Menu center di portal: geser titik tengah agar menu tak keluar viewport
  // (diukur dari lebar asli setelah mount; konvergen sekali jalan).
  useEffect(() => {
    if (!open || !portal || align !== "center" || !pos?.centered) return;
    const el = menuRef.current;
    if (!el) return;
    const half = el.offsetWidth / 2;
    const min = half + 8;
    const max = window.innerWidth - half - 8;
    if (min > max) return;
    const cur = pos.left ?? 0;
    const fixed = Math.max(min, Math.min(cur, max));
    if (fixed !== cur) setPos((p) => (p ? { ...p, left: fixed } : p));
  }, [open, portal, align, pos?.centered, pos?.left]);

  const menuCls =
    "max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-[#212121]";

  return (
    <CloseContext.Provider value={() => setOpen(false)}>
      <div ref={ref} className="relative">
        <div
          onClick={() => {
            if (!open) place();
            setOpen((v) => !v);
          }}
        >
          {trigger(open)}
        </div>
        {open &&
          (portal
            ? pos &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={menuRef}
                  role="menu"
                  style={{
                    position: "fixed",
                    zIndex: 100,
                    left: pos.left,
                    right: pos.right,
                    width: pos.width,
                    top: pos.top,
                    bottom: pos.bottom,
                    transform: pos.centered ? "translateX(-50%)" : undefined,
                  }}
                  className={cn(menuCls, width !== "w-full" && width, "max-w-[calc(100vw-1rem)]", menuClassName)}
                >
                  {children}
                </div>,
                document.body
              )
            : (
              <div
                role="menu"
                className={cn(
                  menuCls,
                  "absolute z-10",
                  align === "center"
                    ? "left-1/2 -translate-x-1/2"
                    : align === "right"
                      ? "right-0"
                      : "left-0",
                  up ? "bottom-full mb-1.5" : "top-full mt-1.5",
                  width,
                  menuClassName
                )}
              >
                {children}
              </div>
            ))}
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
