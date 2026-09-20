import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar unik deterministik per username (DiceBear, tanpa key).
// Foto profil asli tak disediakan API IG — ini pengganti visualnya;
// <img> yg gagal load disembunyikan agar inisial di bawahnya tampil.
export function avatarFor(username: string) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(username.trim() || "ig")}`;
}
