"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, CheckCircle2, Loader2 } from "lucide-react";
import { ContentForm, type ContentFormValues, type SaveMode } from "@/components/content-form";
import { ModalShell } from "@/components/ui/modal";
import { pillGlass } from "@/components/ui/button";
import { createContent, setContentMedia } from "@/lib/content-db";
import { markMediaWarning, markSaved } from "@/lib/ui-flags";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Phase = "form" | "confirm" | "saving" | "done";

// Modal create (isi persis /content/create versi compact).
// Alur fasepol modal hapus: scheduled → konfirmasi → menyimpan → berhasil;
// stok/draft → langsung menyimpan → berhasil. Selalu ter-mount; form
// di-reset tiap selesai animasi tutup.
export function CreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [snap, setSnap] = useState<{ title: string; date: string; time: string } | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [savedStatus, setSavedStatus] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Penjaga janji konfirmasi: form menunggu jawaban modal kecil.
  const confirmRef = useRef<{ resolve: (v: boolean) => void } | null>(null);
  // Tutup form sungguhan (bukan pindah fase) → reset form saat animasi selesai.
  const realClose = useRef(false);

  function closeForm() {
    realClose.current = true;
    onClose();
  }

  async function doSave(values: ContentFormValues, mode: SaveMode) {
    setPhase("saving");
    setPhaseError(null);
    try {
      const status = mode === "submit" ? "scheduled" : mode === "bank" ? "idea" : "draft";
      const id = await createContent({
        title: values.title.trim(),
        type: values.type,
        status,
        scheduledDate: values.date || null,
        scheduledTime: values.time || null,
        pic: values.pics.join(", "),
        initials: values.pics.map(initialsOf).join(", "),
        caption: values.caption,
        hashtags: values.hashtags,
        category: values.category,
        notes: values.notes,
        slides: values.type === "carousel" ? values.slides.length : undefined,
      });
      markSaved(id);
      try {
        await setContentMedia(id, values.mediaIds);
      } catch (e) {
        markMediaWarning(`Konten tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      setSavedTitle(values.title.trim() || "Konten");
      setSavedStatus(mode === "submit" ? "Scheduled" : mode === "bank" ? "Stok" : "Draft");
      setSavedId(id);
      setPhase("done");
      timer.current = setTimeout(() => finish(id), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat konten.";
      if (mode === "submit") {
        // Gagal = kembali ke konfirmasi + error inline.
        setPhaseError(msg);
        setPhase("confirm");
      } else {
        setError(msg);
        setPhase("form");
      }
    }
  }

  function finish(id: string | null) {
    if (timer.current) clearTimeout(timer.current);
    if (!id) return;
    setCycle((c) => c + 1);
    setSnap(null);
    setPhaseError(null);
    onCreated(id);
  }

  // Gerbang form: dipanggil SEBELUM upload. Scheduled → konfirmasi dulu;
  // stok/draft → langsung fase menyimpan agar modal menutupi seluruh proses.
  async function handleAskConfirm(
    s: { title: string; date: string; time: string },
    mode: SaveMode
  ): Promise<boolean> {
    if (mode !== "submit") {
      setPhase("saving");
      return true;
    }
    setSnap(s);
    setPhaseError(null);
    setPhase("confirm");
    return new Promise<boolean>((resolve) => {
      confirmRef.current = { resolve };
    });
  }

  function answerConfirm(yes: boolean) {
    confirmRef.current?.resolve(yes);
    confirmRef.current = null;
    if (yes) {
      // Upload + simpan berjalan di balik modal fase menyimpan.
      setPhase("saving");
    } else {
      setSnap(null);
      setPhase("form");
    }
  }

  return (
    <>
      <ContentForm
        key={cycle}
        layout="modal"
        modalOpen={open && phase === "form"}
        modalTitle="Create Content"
        modalOnClose={closeForm}
        modalOnExitComplete={() => {
          if (!realClose.current) return;
          realClose.current = false;
          setCycle((c) => c + 1);
          setError(null);
        }}
        cancelHref="/content"
        onCancel={closeForm}
        submitLabel="Jadwalkan"
        compact
        alert={
          error ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </p>
          ) : null
        }
        onSubmit={(v, m) => void doSave(v, m)}
        askConfirm={handleAskConfirm}
        onUploadError={() => setPhase("form")}
      />

      {/* Fase kecil di atas form: konfirmasi → menyimpan → berhasil */}
      <ModalShell
        open={open && phase !== "form"}
        label="Status pembuatan konten"
        title={phase === "confirm" ? "Jadwalkan konten" : phase === "saving" ? "Menyimpan" : "Berhasil"}
        size="sm"
        onClose={() => {
          if (phase === "saving") return;
          if (phase === "done") finish(savedId);
          else answerConfirm(false);
        }}
        onExitComplete={() => {
          if (timer.current) clearTimeout(timer.current);
          confirmRef.current = null;
          setSnap(null);
          setPhaseError(null);
          setSavedId(null);
          setPhase("form");
        }}
        footer={
          phase === "confirm" ? (
            <>
              <button type="button" onClick={() => answerConfirm(false)} className={pillGlass}>
                Batal
              </button>
              <button
                type="button"
                onClick={() => answerConfirm(true)}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900 px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Ya, jadwalkan
              </button>
            </>
          ) : null
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.18 } }}
            exit={{ opacity: 0, scale: 0.97, transition: { ease: "easeIn", duration: 0.15 } }}
          >
            {phase === "done" ? (
              <div className="py-2 text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <CheckCircle2 className="h-8 w-8 text-zinc-500" />
                </span>
                <p className="mt-3 text-sm font-semibold">Konten tersimpan</p>
                <p className="mt-1 text-xs text-zinc-500">“{savedTitle}” masuk {savedStatus}.</p>
              </div>
            ) : phase === "saving" ? (
              <div className="py-2 text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </span>
                <p className="mt-3 text-sm font-semibold">Menyimpan…</p>
                <p className="mt-1 text-xs text-zinc-500">Mohon tunggu sebentar.</p>
              </div>
            ) : (
              <div className="py-2 text-center">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <CalendarCheck className="h-8 w-8 text-zinc-500" />
                </span>
                <p className="mt-3 text-sm font-semibold">Jadwalkan “{snap?.title.trim() || "konten"}”?</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {snap?.date} • {snap?.time} WITA. Pastikan jadwal dan media sudah benar.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {phaseError && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {phaseError}
          </p>
        )}
      </ModalShell>
    </>
  );
}
