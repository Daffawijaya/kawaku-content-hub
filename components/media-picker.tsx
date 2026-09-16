"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Image as ImageIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaKind } from "@/lib/mock";

export type PickerAsset = {
  id: string;
  name: string;
  kind: MediaKind;
  tone: string;
  driveFileId: string;
};

// API bila Drive+login siap ([] bila gagal — tanpa fallback palsu).
export async function fetchPickerAssets(): Promise<{ assets: PickerAsset[]; drive: boolean }> {
  try {
    const res = await fetch("/api/drive/list");
    if (!res.ok) throw new Error();
    const json = (await res.json()) as { assets: PickerAsset[] };
    return { assets: json.assets ?? [], drive: true };
  } catch {
    return { drive: false, assets: [] };
  }
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (a: PickerAsset) => void;
}) {
  const [assets, setAssets] = useState<PickerAsset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPickerAssets()
      .then((r) => setAssets(r.assets))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [open ]);

  if (!open) return null;
  const q = query.trim().toLowerCase();
  const filtered = q ? assets.filter((a) => a.name.toLowerCase().includes(q)) : assets;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih dari Media Library"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 p-4 pb-2">
          <h3 className="text-sm font-semibold">Pilih dari Media Library</h3>
          <button aria-label="Close picker" onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file…"
              className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-4 pt-2">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Tidak ada media. Upload dulu di Media Library.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      onSelect(a);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-zinc-200 p-2 text-left hover:border-brand-500 dark:border-zinc-800"
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br", a.tone || "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900")}>
                      {a.kind === "video" ? <Clapperboard className="h-4 w-4 text-zinc-500" /> : <ImageIcon className="h-4 w-4 text-zinc-500" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="block text-xs text-zinc-500">
                        {a.kind === "video" ? "Video" : "Image"}
                        {a.driveFileId ? " • Drive" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end border-t border-zinc-100 p-3 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
