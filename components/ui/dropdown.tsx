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
import styles from "./dropdown-glass.module.css";

const CloseContext = createContext(() => {});

// ponytail: def filter ikut dirender tiap menu yg terbuka (id duplikat bila
// >1 menu terbuka — visual identik). Upgrade path: pindah sekali ke layout.
function GlassFilter() {
  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
      <filter
        id="glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.01 0.01"
          numOctaves="1"
          seed="5"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="150"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

function GlassLayers({ children }: { children: ReactNode }) {
  return (
    <>
      <div className={styles.effect} aria-hidden="true" />
      <div className={styles.tint} aria-hidden="true" />
      <div className={styles.shine} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
      <GlassFilter />
    </>
  );
}

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
  align?: "left" | "right";
  width?: string;
  menuClassName?: string;
  // true = menu dirender via portal (fixed) agar tak terpotong wadah
  // overflow (mis. di dalam modal). Default false = perilaku lama.
  portal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Menu dibalik ke atas bila ruang bawah tidak cukup (mis. baris terakhir tabel).
  const [up, setUp] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function place() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const isUp = window.innerHeight - r.bottom < 220;
    setUp(isUp);
    if (portal) {
      setPos(
        isUp
          ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6 }
          : { left: r.left, width: r.width, top: r.bottom + 6 }
      );
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

  // Kulit = liquid-glass /liquid-glass; layout (posisi/struktur/spacing) tetap.
  const menuCls = cn(styles.menu, "overflow-hidden px-1 py-1");

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
                    width: pos.width,
                    top: pos.top,
                    bottom: pos.bottom,
                  }}
                  className={cn(menuCls, menuClassName)}
                >
                  <GlassLayers>{children}</GlassLayers>
                </div>,
                document.body
              )
            : (
              <div
                role="menu"
                className={cn(
                  menuCls,
                  "absolute z-10",
                  align === "right" ? "right-0" : "left-0",
                  up ? "bottom-full mb-1.5" : "top-full mt-1.5",
                  width,
                  menuClassName
                )}
              >
                <GlassLayers>{children}</GlassLayers>
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
    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-white/60 dark:hover:bg-white/15",
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
