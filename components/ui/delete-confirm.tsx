"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { pillGlass } from "@/components/ui/button";

export type DeletePhase = "confirm" | "deleting" | "done";

// Tombol primer monokrom ala YouTube Studio (bukan merah).
const pillSolid =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900 px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100";

// Isi modal hapus bersama (konten + media): ikon netral besar di tengah,
// tiga fase — konfirmasi, menghapus, berhasil.
export function DeleteConfirmBody({
  phase,
  name,
  scope,
  extraConfirm,
}: {
  phase: DeletePhase;
  name: string;
  scope: "Konten" | "Media";
  // Catatan tambahan fase konfirmasi (mis. peringatan relasi media).
  extraConfirm?: ReactNode;
}) {
  if (phase === "done") {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <CheckCircle2 className="h-8 w-8 text-zinc-500" />
        </span>
        <p className="mt-3 text-sm font-semibold">{scope} dihapus</p>
        <p className="mt-1 text-xs text-zinc-500">“{name}” sudah dihapus.</p>
      </div>
    );
  }
  if (phase === "deleting") {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </span>
        <p className="mt-3 text-sm font-semibold">Menghapus…</p>
        <p className="mt-1 text-xs text-zinc-500">“{name}” sedang dihapus.</p>
      </div>
    );
  }
  return (
    <div className="py-2 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Trash2 className="h-8 w-8 text-zinc-500" />
      </span>
      <p className="mt-3 text-sm font-semibold">{name}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {scope} yang dihapus tidak bisa dikembalikan.
        {scope === "Konten" ? " File Drive yang tidak dipakai konten lain ikut dibersihkan." : ""}
      </p>
      {extraConfirm}
    </div>
  );
}

export function DeleteConfirmFooter({
  phase,
  onCancel,
  onConfirm,
}: {
  phase: DeletePhase;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Fase menghapus/berhasil tanpa tombol (modal menutup sendiri).
  if (phase !== "confirm") return null;
  return (
    <>
      <button type="button" onClick={onCancel} className={pillGlass}>
        Batal
      </button>
      <button type="button" onClick={onConfirm} className={pillSolid}>
        Ya, hapus
      </button>
    </>
  );
}
