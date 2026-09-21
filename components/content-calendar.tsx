"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Eye,
  Images,
  LayoutGrid,
  Loader2,
  Pencil,
  Smartphone,
  Tag,
  User,
  X,
} from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { changeStatus, listContentsPage, saveContent, usesSupabase } from "@/lib/content-db";
import { listTeamNames } from "@/lib/team-db";

// ---------- tiny date helpers (no deps) ----------
const pad = (n: number) => String(n).padStart(2, "0");
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseYMD(s: string) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
}
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00–23 penuh: event di luar jam kerja tetap tampil, tak ada yg hilang diam-diam

type View = "month" | "week" | "day";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
  story: Smartphone,
};

// Blok warna penuh per jenis konten utk chip (ala Jira).
// Dark mode diredupkan: solid di light, translusen pastel di dark.
const typeBlock: Record<ContentType, string> = {
  feed: "bg-amber-500 dark:bg-amber-500/20",
  carousel: "bg-green-500 dark:bg-green-500/20",
  reels: "bg-rose-500 dark:bg-rose-500/20",
  story: "bg-sky-500 dark:bg-sky-500/20",
};

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function fmtLong(ymdStr: string, time: string) {
  const d = parseYMD(ymdStr);
  const date = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${date} • ${time} WITA`;
}

export function ContentCalendar() {
  const [today] = useState(() => ymd(new Date()));
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [selTypes, setSelTypes] = useState<ContentType[]>([]);
  const [selPics, setSelPics] = useState<string[]>([]);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Event = isi bulan tampil (fetch per bulan, bukan seluruh tabel);
  // stok = seluruh idea (tak bertanggal, tak terpengaruh bulan).
  const [events, setEvents] = useState<ManagedContent[]>([]);
  const [stock, setStock] = useState<ManagedContent[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const calReq = useRef(0);

  const cursorDate = parseYMD(cursor);
  // Baris secukupnya: 5 minggu bila muat (mis. Sep 2026 = 31 Agu–4 Okt),
  // 6 minggu bila tidak — tanpa baris bulan-depan yg mubazir.
  const monthCells = useMemo(() => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = mondayOf(first);
    const daysInMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0).getDate();
    const lead = Math.round((first.getTime() - start.getTime()) / 86400000);
    const cells = lead + daysInMonth <= 35 ? 35 : 42;
    return Array.from({ length: cells }, (_, i) => addDays(start, i));
  }, [cursor]);
  const weekDays = useMemo(() => {
    const mon = mondayOf(cursorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [cursor]);
  // Rentang tampil = sel grid bulan (termasuk hari bulan tetangga).
  // Minggu/hari selalu di dalamnya, jadi satu fetch per bulan cukup.
  const rangeKey = `${ymd(monthCells[0])}/${ymd(monthCells[monthCells.length - 1])}`;

  const byId = useMemo(
    () => new Map([...events, ...stock].map((c) => [c.id, c])),
    [events, stock]
  );

  const byDate = useMemo(() => {
    const m = new Map<string, ManagedContent[]>();
    for (const c of events) {
      const list = m.get(c.scheduledDate) ?? [];
      list.push(c);
      m.set(c.scheduledDate, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return m;
  }, [events]);

  // ponytail: limit 500/bln & stok 500; bagi per status/bulan bila 1000+ konten.
  const reloadCal = useCallback(async () => {
    const my = ++calReq.current;
    setLoadingCal(true);
    try {
      const [from, to] = rangeKey.split("/");
      const [ev, st] = await Promise.all([
        listContentsPage({
          page: 1,
          limit: 500,
          types: selTypes,
          statuses: ["draft", "review", "revision", "approved", "scheduled", "published"],
          q: "",
          pics: selPics,
          from,
          to,
        }),
        listContentsPage({
          page: 1,
          limit: 500,
          types: selTypes,
          statuses: ["idea"],
          q: "",
          pics: selPics,
        }),
      ]);
      if (my !== calReq.current) return;
      setEvents(ev.items);
      setStock(st.items);
    } finally {
      if (my === calReq.current) setLoadingCal(false);
    }
  }, [rangeKey, selTypes, selPics]);

  useEffect(() => {
    // reloadCal me-reset state sync (pola yg sama dipakai di /content & board).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadCal().catch(() => {
      setEvents([]);
      setStock([]);
      setNotice("Gagal memuat konten.");
    });
  }, [reloadCal]);

  useEffect(() => {
    listTeamNames().then((names) => {
      if (names.length > 0) setPicOptions(names);
    });
  }, []);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function nav(dir: 1 | -1) {
    if (view === "month") setCursor(ymd(addMonths(cursorDate, dir)));
    else if (view === "week") setCursor(ymd(addDays(cursorDate, dir * 7)));
    else setCursor(ymd(addDays(cursorDate, dir)));
  }
  function goToDay(dateStr: string) {
    setCursor(dateStr);
    setView("day");
  }

  // --- drag & drop (HTML5 only, tanpa lib) ---
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  // Simpan hasil geser ke backend (mode mock: cukup state lokal).
  // Gagal simpan → muat ulang agar tampilan tidak beda dengan database.
  async function persistMove(id: string, patch: { date?: string; time?: string; toStatus?: ContentStatus }) {
    if (!usesSupabase()) return;
    try {
      if (patch.date !== undefined || patch.time !== undefined) {
        const cur = byId.get(id);
        await saveContent(id, {
          scheduledDate: patch.date ?? cur?.scheduledDate,
          scheduledTime: patch.time ?? cur?.scheduledTime,
        });
      }
      if (patch.toStatus) await changeStatus(id, patch.toStatus);
    } catch {
      setNotice("Gagal menyimpan hasil geseran — memuat ulang.");
      try {
        await reloadCal();
      } catch {
        /* biarkan tampilan apa adanya */
      }
    }
  }

  function onDrop(e: React.DragEvent, date: string, hour?: number) {
    e.preventDefault();
    setDropTarget(null);
    setNotice(null);
    const id = e.dataTransfer.getData("text/plain");
    const cur = byId.get(id);
    if (!cur) return;
    // Rule view bulan utk Stok → tanggal: hari ini = 1 jam dari sekarang
    // (mis. jam 10 → 11:00), selain hari ini default 08:00. Item terjadwal
    // yg digeser antar tanggal tetap membawa jamnya sendiri.
    let time: string;
    if (hour === undefined) {
      if (cur.status === "idea") {
        if (date !== today) {
          time = "08:00";
        } else {
          const h = new Date().getHours();
          time = h >= 23 ? "23:59" : `${pad(h + 1)}:00`;
        }
      } else {
        time = cur.scheduledTime;
      }
    } else {
      time = `${pad(hour)}:${cur.scheduledTime.slice(3) || "00"}`;
    }
    const toStatus = cur.status === "idea" ? ("scheduled" as const) : undefined;
    const next = {
      ...cur,
      scheduledDate: date,
      scheduledTime: time,
      ...(toStatus ? { status: toStatus } : {}),
    };
    if (toStatus) {
      setStock((s) => s.filter((c) => c.id !== id));
      setEvents((e) => [...e, next]);
    } else {
      setEvents((e) => e.map((c) => (c.id === id ? next : c)));
    }
    void persistMove(id, { date, time, toStatus });
  }

  // Kembalikan event ke Stok (status idea) — tanggal & jam ikut hilang.
  function onDropTray(e: React.DragEvent) {
    e.preventDefault();
    setDropTarget(null);
    setNotice(null);
    const id = e.dataTransfer.getData("text/plain");
    const cur = byId.get(id);
    if (!cur || cur.status === "idea") return;
    const back = { ...cur, status: "idea" as const, scheduledDate: "", scheduledTime: "" };
    setEvents((e) => e.filter((c) => c.id !== id));
    setStock((s) => [back, ...s]);
    void persistMove(id, { toStatus: "idea" });
  }

  const title =
    view === "month"
      ? cursorDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : view === "week"
        ? `${weekDays[0].toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
        : cursorDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const hasFilter = selTypes.length + selPics.length > 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Sebelumnya" onClick={() => nav(-1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-36 text-center text-sm font-semibold capitalize sm:text-base">{title}</h2>
          <Button variant="outline" size="icon" aria-label="Berikutnya" onClick={() => nav(1)} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(today)} className="ml-1">
            Hari ini
          </Button>
          {loadingCal && <Loader2 aria-label="Memuat kalender" className="h-4 w-4 animate-spin text-zinc-400" />}
        </div>
        <div className="ml-auto flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
          {(
            [
              { v: "month", label: "Bulan" },
              { v: "week", label: "Minggu" },
              { v: "day", label: "Hari" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                view === v
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters: sebaris — tipe + PIC */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(Object.keys(typeMeta) as ContentType[]).map((t) => (
          <button key={t} onClick={() => setSelTypes((p) => toggle(p, t))} className={pill(selTypes.includes(t))}>
            {typeMeta[t].label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
        {picOptions.map((n) => (
          <button key={n} onClick={() => setSelPics((p) => toggle(p, n))} className={pill(selPics.includes(n))}>
            {n.split(" ")[0]}
          </button>
        ))}
        {hasFilter && (
          <button
            onClick={() => {
              setSelTypes([]);
              setSelPics([]);
            }}
            className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Atur ulang
          </button>
        )}
      </div>

      {/* Baki Stok: panel berbingkai ala Top Content — seret ke tanggal = jadwalkan */}
      <section className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-[#212121]">
        <button onClick={() => setTrayOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left" aria-expanded={trayOpen}>
          <span className="text-sm font-semibold">Stok ({stock.length})</span>
          <span className="hidden text-xs text-zinc-500 sm:block">Seret ke tanggal untuk menjadwalkan • seret konten ke sini untuk mengembalikan</span>
          <ChevronDown className={cn("ml-auto h-4 w-4 text-zinc-500 transition-transform", !trayOpen && "-rotate-90")} />
        </button>
        {/* Buka-tutup via animasi grid-rows (smooth slide) */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            trayOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget("tray");
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={onDropTray}
              className={cn(
                "mx-4 mb-4 flex min-h-16 flex-wrap content-start gap-2 rounded-lg border border-dashed p-3",
                dropTarget === "tray"
                  ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                  : "border-zinc-300 dark:border-zinc-700"
              )}
            >
              {loadingCal && stock.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                ))
              ) : stock.length === 0 ? (
                <p className="text-xs text-zinc-500">Stok kosong — tambah via tab Stok di form konten.</p>
              ) : (
                stock.map((c) => {
                  const Icon = typeIcons[c.type];
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, c.id)}
                      className="flex cursor-grab items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="max-w-44 truncate font-medium">{c.title}</span>
                      <TypeBadge type={c.type} className="shrink-0 px-1.5 py-0 text-[10px]" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
      {notice && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {notice}
        </p>
      )}

      {/* Views: muat pertama = skeleton; pindah bulan = data lama dipertahankan + redup */}
      {loadingCal && events.length === 0 && view === "month" ? (
        <div aria-hidden="true">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <div key={d} className="py-1.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d) => (
              <div key={ymd(d)} className="min-h-16 animate-pulse rounded-lg bg-zinc-100 sm:min-h-28 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : (
      <div className={cn("transition-opacity", loadingCal && events.length > 0 && "pointer-events-none opacity-60")}>
      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
              <div key={d} className="py-1.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d) => {
              const key = ymd(d);
              const events = byDate.get(key) ?? [];
              const inMonth = d.getMonth() === cursorDate.getMonth();
              const isToday = key === today;
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget(key);
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                  onDrop={(e) => onDrop(e, key)}
                  className={cn(
                    "min-h-16 rounded-lg border p-1 text-xs sm:min-h-28 sm:p-1.5",
                    dropTarget === key
                      ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                      : "border-zinc-100 dark:border-zinc-800",
                    !inMonth && "bg-zinc-50/60 dark:bg-zinc-900/40"
                  )}
                >
                  <button
                    onClick={() => goToDay(key)}
                    aria-label={`Buka ${key}`}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold sm:h-6 sm:w-6 sm:text-xs",
                      isToday
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : inMonth
                          ? "hover:bg-zinc-900/5 dark:hover:bg-white/10"
                          : "text-zinc-400"
                    )}
                  >
                    {d.getDate()}
                  </button>
                  <div className="mt-1 space-y-1">
                    {events.slice(0, 2).map((ev) => {
                      return (
                        <button
                          key={ev.id}
                          draggable={ev.status !== "published"}
                          onDragStart={(e) => onDragStart(e, ev.id)}
                          onClick={() => setSelectedId(ev.id)}
                          title={`${ev.scheduledTime} • ${ev.title}`}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition hover:brightness-95",
                            typeBlock[ev.type],
                            ev.status === "published" ? "cursor-default" : "cursor-grab",
                            // Published = arsip yg sudah lewat: diredupkan agar
                            // scheduled yg butuh aksi tetap menonjol.
                            ev.status === "published" && "opacity-50",
                            // Di luar bulan tampil: full abu (grayscale + redup), tanpa warna.
                            !inMonth && "opacity-60 grayscale"
                          )}
                        >
                          <span className="shrink-0 tabular-nums opacity-80">{ev.scheduledTime}</span>
                          <span className="truncate">{ev.title}</span>
                        </button>
                      );
                    })}
                    {events.length > 2 && (
                      <button
                        onClick={() => goToDay(key)}
                        className="w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        +{events.length - 2} lainnya
                      </button>
                    )}
                    {events.length > 0 && events.length <= 2 && (
                      <span className="block h-1.5 sm:hidden" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-1">
              <div />
              {weekDays.map((d) => {
                const key = ymd(d);
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    onClick={() => goToDay(key)}
                    className={cn(
                      "rounded-lg py-1.5 text-center hover:bg-zinc-900/5 dark:hover:bg-white/10",
                      isToday && "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    )}
                  >
                    <p className="text-[11px] opacity-80">
                      {d.toLocaleDateString("id-ID", { weekday: "short" })}
                    </p>
                    <p className="text-sm font-semibold">
                      {d.getDate()}
                    </p>
                  </button>
                );
              })}
              {HOURS.map((h) => (
                <Fragment key={`week-${h}`}>
                  <p className="pt-1 text-right text-[11px] text-zinc-400">
                    {pad(h)}:00
                  </p>
                  {weekDays.map((d) => {
                    const key = ymd(d);
                    const slotKey = `${key}-${h}`;
                    const events = (byDate.get(key) ?? []).filter(
                      (c) => Number(c.scheduledTime.slice(0, 2)) === h
                    );
                    return (
                      <div
                        key={slotKey}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropTarget(slotKey);
                        }}
                        onDragLeave={() => setDropTarget((t) => (t === slotKey ? null : t))}
                        onDrop={(e) => onDrop(e, key, h)}
                        className={cn(
                          "min-h-10 space-y-1 rounded-md border-t border-zinc-100 p-1 dark:border-zinc-800",
                          dropTarget === slotKey && "bg-brand-50 dark:bg-brand-950/30"
                        )}
                      >
                        {events.map((ev) => {
                          return (
                            <button
                              key={ev.id}
                              draggable={ev.status !== "published"}
                              onDragStart={(e) => onDragStart(e, ev.id)}
                              onClick={() => setSelectedId(ev.id)}
                              title={`${ev.scheduledTime} • ${ev.title}`}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-medium text-white transition hover:brightness-95",
                                typeBlock[ev.type],
                                ev.status === "published" ? "cursor-default" : "cursor-grab",
                                ev.status === "published" && "opacity-50"
                              )}
                            >
                              <span className="shrink-0 tabular-nums opacity-80">{ev.scheduledTime}</span>
                              <span className="truncate">{ev.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "day" && (
        <div>
          <div className="grid grid-cols-[3rem_1fr] gap-x-2">
            {HOURS.map((h) => {
              const events = (byDate.get(cursor) ?? []).filter(
                (c) => Number(c.scheduledTime.slice(0, 2)) === h
              );
              const slotKey = `${cursor}-${h}`;
              return (
                <Fragment key={`day-${h}`}>
                  <p className="pt-2 text-right text-xs text-zinc-400">
                    {pad(h)}:00
                  </p>
                  <div
                    key={slotKey}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget(slotKey);
                    }}
                    onDragLeave={() => setDropTarget((t) => (t === slotKey ? null : t))}
                    onDrop={(e) => onDrop(e, cursor, h)}
                    className={cn(
                      "min-h-12 space-y-1.5 rounded-md border-t border-zinc-100 py-1.5 pl-1 dark:border-zinc-800",
                      dropTarget === slotKey && "bg-brand-50 dark:bg-brand-950/30"
                    )}
                  >
                    {events.map((ev) => {
                      return (
                        <button
                          key={ev.id}
                          draggable={ev.status !== "published"}
                          onDragStart={(e) => onDragStart(e, ev.id)}
                          onClick={() => setSelectedId(ev.id)}
                          title={`${ev.scheduledTime} • ${ev.title}`}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-white transition hover:brightness-95",
                            typeBlock[ev.type],
                            ev.status === "published" ? "cursor-default" : "cursor-grab",
                            ev.status === "published" && "opacity-50"
                          )}
                        >
                          <span className="shrink-0 tabular-nums opacity-80">{ev.scheduledTime}</span>
                          <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </Fragment>
              );
            })}
          </div>
          {(byDate.get(cursor) ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-500">
              Tidak ada konten pada tanggal ini.
            </p>
          )}
        </div>
      )}
      </div>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        Tips: seret konten ke tanggal/jam lain untuk menjadwalkan ulang (tersimpan otomatis).
      </p>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl dark:bg-zinc-950"
          >
            <div className={cn("flex h-32 items-center justify-center bg-gradient-to-br", selected.tone)}>
              {(() => {
                const Icon = typeIcons[selected.type];
                return <Icon className="h-8 w-8 text-zinc-400" />;
              })()}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold tracking-tight">{selected.title}</h3>
                <button
                  aria-label="Tutup detail"
                  onClick={() => setSelectedId(null)}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TypeBadge type={selected.type} />
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{selected.caption}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
                  {fmtLong(selected.scheduledDate, selected.scheduledTime)}
                </div>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <User className="h-4 w-4 shrink-0 text-zinc-400" />
                  {selected.pic}
                </div>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Tag className="h-4 w-4 shrink-0 text-zinc-400" />
                  {selected.category}
                </div>
              </dl>
              <div className="mt-5 flex justify-end gap-2">
                <Link href={`/content/${selected.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5" /> Ubah
                  </Button>
                </Link>
                <Link href={`/content/${selected.id}`}>
                  <Button size="sm">
                    <Eye className="h-3.5 w-3.5" /> Lihat Konten
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
