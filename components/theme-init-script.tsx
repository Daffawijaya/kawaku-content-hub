"use client";

import { useServerInsertedHTML } from "next/navigation";

// Skrip anti-flash tema: jalan sebelum paint via SSR HTML stream.
// Disuntik lewat useServerInsertedHTML (di luar React tree) agar React 19
// tidak melempar warning "script tag while rendering component" seperti
// saat memakai next/Script. Isi sama persis dengan sebelumnya.
const THEME_INIT = `(function(){try{var t=localStorage.getItem("kawaku-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})()`;

export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script id="kawaku-theme" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
  ));
  return null;
}
