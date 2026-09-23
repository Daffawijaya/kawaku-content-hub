// Hirarki role tunggal — satu-satunya sumber kebenaran untuk hak akses.
// Hanya 2 role: superadmin (penuh + kelola tim) dan admin (penuh kecuali tim read-only).
import type { AppRole } from "./supabase/types";

export const ACCESS_ROLES: AppRole[] = ["superadmin", "admin"];

export const SUPERADMIN_EMAIL = "ta.naikkelas@gmail.com";

export function isSuperadmin(role: AppRole | string | null | undefined): boolean {
  return role === "superadmin";
}

// Admin dalam arti luas: admin biasa maupun superadmin.
// Dipakai untuk semua fitur kecuali manajemen tim.
export function isAdminOrAbove(role: AppRole | string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

// Alias: seluruh kode lama yang cek `role === "admin"` harus pakai ini
// agar superadmin ikut lolos.
export const isAdmin = isAdminOrAbove;

// Hanya superadmin yang boleh CRUD tim (tambah/ubah/hapus/password/role).
export function canManageTeam(role: AppRole | string | null | undefined): boolean {
  return role === "superadmin";
}

// Konten/media/analytics/IG: superadmin dan admin persis sama (CRUD).
export function canEditContent(role: AppRole | string | null | undefined): boolean {
  return isAdminOrAbove(role);
}
