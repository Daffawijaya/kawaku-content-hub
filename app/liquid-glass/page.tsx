import type { Metadata } from "next";

export const metadata: Metadata = { title: "Liquid Glass" };

// ponytail: demo lucasromerodb (varian dock saja) ditanam mentah via iframe
// srcDoc — tanpa porting, tanpa bocor ke CSS global. Upgrade path: port ke
// JSX+CSS module bila perlu interaksi dengan app.
const PEN = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Liquid Glass</title>
<style>
.liquidGlass-wrapper {
  position: relative;
  display: flex;
  font-weight: 600;
  overflow: hidden;
  box-shadow: 0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 2.2);
}
.liquidGlass-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  backdrop-filter: blur(3px);
  filter: url(#glass-distortion);
  overflow: hidden;
}
.liquidGlass-tint {
  z-index: 1;
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.50);
}
.liquidGlass-shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
    inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
}
.liquidGlass-text {
  z-index: 3;
  font-size: 2rem;
  color: black;
}
body {
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: url("https://media.istockphoto.com/id/1430511443/vector/christmas-mistletoe-foliage-and-berries-vector-seamless-pattern.jpg?s=612x612&w=0&k=20&c=oqxlH7ytgd5yjBQroACirJ1gH7Au1tq8gmsdeGd-Crk=") center center;
  background-size: 500px;
  font-family: sans-serif;
  font-weight: 300;
  animation: moveBackground 60s linear infinite;
}
a { text-decoration: none; }
.wrapper {
  display: flex;
  gap: 25px;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
}
.dock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 2rem;
  padding: 0.6rem;
}
.dock, .dock > div { border-radius: 2rem; }
.dock:hover { padding: 0.8rem; border-radius: 2.5rem; }
.dock:hover > div { border-radius: 2.5rem; }
.dock img {
  width: 75px;
  padding: 0;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 2.2);
  cursor: pointer;
}
.dock img:hover { transform: scale(0.95); transform-origin: center center; }
@keyframes moveBackground {
  from { background-position: 0% 0%; }
  to { background-position: 0% -1500%; }
}
</style>
</head>
<body>
<div class="wrapper">
  <div class="liquidGlass-wrapper dock">
    <div class="liquidGlass-effect"></div>
    <div class="liquidGlass-tint"></div>
    <div class="liquidGlass-shine"></div>
    <div class="liquidGlass-text">
      <div class="dock">
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/finder.png" alt="Finder" />
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/map.png" alt="Map" />
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/messages.png" alt="Messages" />
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/notes.png" alt="Notes" />
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/safari.png" alt="Safari" />
        <img src="https://raw.githubusercontent.com/lucasromerodb/liquid-glass-effect-macos/refs/heads/main/assets/books.png" alt="Books" />
      </div>
    </div>
  </div>
</div>
<svg style="display: none">
  <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
    <feComponentTransfer in="turbulence" result="mapped">
      <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
      <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
      <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
    </feComponentTransfer>
    <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
    <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight">
      <fePointLight x="-200" y="-200" z="300" />
    </feSpecularLighting>
    <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
    <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
</body>
</html>`;

export default function LiquidGlassPage() {
  return (
    <iframe
      title="Liquid Glass"
      srcDoc={PEN}
      className="h-[calc(100dvh-10rem)] min-h-[32rem] w-full rounded-2xl border border-zinc-200 dark:border-zinc-800"
    />
  );
}
