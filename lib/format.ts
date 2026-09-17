// Formatter tanggal Indonesia bersama (dipakai list + board).
// "2026-09-16" → "16 September 2026".
export function formatDateFull(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
