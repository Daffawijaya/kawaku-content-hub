import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — KAWAKU Content Hub",
  description: "Kebijakan privasi KAWAKU Content Hub.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-zinc-500">KAWAKU Content Hub</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Kebijakan Privasi</h1>
      <p className="mt-1 text-xs text-zinc-500">Berlaku sejak 14 September 2026.</p>

      <Card className="mt-6 space-y-4 p-5 text-sm leading-relaxed sm:p-6">
        <section>
          <h2 className="font-semibold">1. Data yang kami akses</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-300">
            <li>
              File Google Drive yang <strong>dibuat oleh aplikasi ini</strong> (izin{" "}
              <code>drive.file</code>): mengunggah, melihat, dan memindahkan ke sampah
              aset foto/video konten. Aplikasi tidak dapat melihat file Drive lain milik Anda.
            </li>
            <li>
              Identitas dasar akun Google (nama dan alamat email) untuk login melalui Supabase Auth.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">2. Penggunaan data</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Data hanya dipakai untuk mengelola konten KAWAKU: menyimpan aset media ke folder
            Google Drive Anda, menampilkannya kembali di aplikasi, dan mencatat siapa pengunggahnya.
            Data tidak dijual, tidak dibagikan ke pihak ketiga, dan tidak dipakai untuk iklan.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">3. Penyimpanan</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Token akses Google disimpan di sisi server (environment aplikasi) dan tidak pernah
            dikirim ke browser atau di-commit ke kode sumber. Akses dapat dicabut kapan saja dari
            pengaturan Akun Google Anda.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">4. Penghapusan</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Menghapus konten/media di aplikasi akan memindahkan file terkait ke sampah Google Drive
            dan menghapus catatannya dari database. File di sampah dapat dipulihkan atau dihapus
            permanen dari Google Drive Anda.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">5. Kontak</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Pertanyaan soal privasi: <span className="font-medium">ta.naikkelas@gmail.com</span>.
          </p>
        </section>

        <Link href="/login" className="inline-block text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
          Kembali ke login
        </Link>
      </Card>
    </div>
  );
}
