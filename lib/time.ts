// Zona operasional tim (kantor di Kalimantan Timur). scheduled_date/time
// disimpan sebagai wall-clock zona ini; autopublish membandingkan dgn +08:00.
export const TEAM_TZ = "Asia/Makassar";
export const TEAM_LABEL = "WITA";

export type WitaWall = { date: string; time: string };

// Timestamp IG Graph API (UTC, mis. 2026-09-22T18:41:00+0000) → wall-clock WITA.
// Jangan slice string mentah: itu jam UTC yg labelnya jadi salah 8 jam.
export function igTimestampToWita(iso: string): WitaWall | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return instantToWita(t);
}

export function nowWita(): WitaWall {
  return instantToWita(Date.now());
}

function instantToWita(t: number): WitaWall {
  const d = new Date(t);
  const date = d.toLocaleDateString("en-CA", { timeZone: TEAM_TZ });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: TEAM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    time: /^\d{2}:\d{2}$/.test(time) ? time : "",
  };
}

// Zona browser pengunjung (deteksi lokasi) — jatuh ke WITA bila tak terbaca.
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || TEAM_TZ;
  } catch {
    return TEAM_TZ;
  }
}

// Wall-clock WITA → instant absolut (ms). Null bila tanggal/jam tak valid.
export function witaInstant(date: string, time: string): number | null {
  const t = Date.parse(`${date}T${time.slice(0, 5)}:00+08:00`);
  return Number.isNaN(t) ? null : t;
}

// "24 September 2026 • 02:41" saat di rumah; jamnya otomatis jadi zona lokal
// pengunjung tanpa embel-embel label zona.
export function formatScheduleLocal(date: string, time: string, opts: { weekday?: boolean } = {}): string {
  const t = witaInstant(date, time);
  if (t === null) return [date, time].filter(Boolean).join(" • ");
  const tz = viewerTimeZone();
  const d = new Date(t);
  const dateStr = d.toLocaleDateString("id-ID", {
    timeZone: tz,
    ...(opts.weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d
    .toLocaleTimeString("id-ID", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
    .replace(/\./g, ":");
  return `${dateStr} • ${timeStr}`;
}

// Label relatif utk konten yg sudah lewat ("baru saja", "52 mnt lalu").
// Null utk jadwal masa depan / tanggal tak valid — panggil hanya utk published.
export function scheduleLalu(date: string, time: string): string | null {
  const t = witaInstant(date, time);
  if (t === null) return null;
  const diff = Date.now() - t;
  if (diff < 0 || diff > 30 * 24 * 3600_000) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
