// 開発用のプレースホルダー画像を SVG から生成する (実在人物の写真は使用しない)

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES: [number, number][] = [
  [280, 330],
  [220, 260],
  [330, 20],
  [200, 170],
  [30, 350],
  [250, 300],
  [180, 230],
  [10, 40],
];

function bokeh(r: () => number, w: number, h: number, n: number) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const cx = Math.round(r() * w);
    const cy = Math.round(r() * h * 0.8);
    const rad = Math.round(20 + r() * (w / 7));
    const op = (0.05 + r() * 0.18).toFixed(2);
    out += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#fff" opacity="${op}" filter="url(#blur)"/>`;
  }
  return out;
}

/** 顔の描かれない抽象的なシルエットポートレート (3:4) */
export function portraitSvg(seed: number, variant: number): string {
  const r = rng(seed * 31 + variant * 7);
  const [h1, h2] = PALETTES[seed % PALETTES.length];
  const w = 900;
  const h = 1200;
  const scale = [1, 1.25, 0.85, 1.1][variant % 4];
  const dx = [0, -90, 110, 40][variant % 4];
  const light = variant % 2 === 0 ? 62 : 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1},32%,${light - 30}%)"/>
      <stop offset="1" stop-color="hsl(${h2},38%,${light}%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="hsl(${h2},60%,85%)" stop-opacity="0.55"/>
      <stop offset="1" stop-color="hsl(${h2},60%,85%)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${h1},25%,16%)"/>
      <stop offset="1" stop-color="hsl(${h1},30%,8%)"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="hsl(${h2},70%,88%)" stop-opacity="0.5"/>
      <stop offset="0.25" stop-color="hsl(${h2},70%,88%)" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${bokeh(r, w, h, 14)}
  <g transform="translate(${w / 2 + dx} ${h * 0.46}) scale(${scale})" filter="url(#soft)">
    <path d="M-350 600 C-340 330 -190 215 0 210 C190 215 340 330 350 600 L350 900 L-350 900 Z" fill="url(#body)"/>
    <path d="M-52 100 L52 100 L64 230 L-64 230 Z" fill="url(#body)"/>
    <ellipse cx="0" cy="0" rx="118" ry="148" fill="url(#body)"/>
    <path d="M-140 -20 C-150 -170 -40 -215 20 -205 C120 -200 165 -120 145 -10 C120 -90 60 -120 -10 -110 C-80 -100 -120 -70 -140 -20 Z" fill="hsl(${h1},20%,6%)"/>
    <path d="M-350 600 C-340 330 -190 215 0 210 C190 215 340 330 350 600 L350 900 L-350 900 Z" fill="url(#rim)"/>
  </g>
  <rect width="${w}" height="${h}" fill="hsl(${h1},30%,10%)" opacity="0.08"/>
</svg>`;
}

/** 横長の抽象ビジュアル (バナー・特集・日記) */
export function sceneSvg(seed: number, w: number, h: number, kind: "night" | "dawn" | "cafe" = "night"): string {
  const r = rng(seed * 97 + 13);
  const [h1, h2] = PALETTES[seed % PALETTES.length];
  const top = kind === "dawn" ? `hsl(${h2},45%,78%)` : kind === "cafe" ? `hsl(30,35%,70%)` : `hsl(${h1},35%,14%)`;
  const bottom = kind === "dawn" ? `hsl(${h1},40%,55%)` : kind === "cafe" ? `hsl(20,30%,40%)` : `hsl(${h2},35%,38%)`;
  const moonX = Math.round(w * (0.6 + r() * 0.3));
  const moonY = Math.round(h * (0.2 + r() * 0.2));
  const moonR = Math.round(Math.min(w, h) * (0.08 + r() * 0.06));
  let lines = "";
  for (let i = 0; i < 5; i++) {
    const y = Math.round(h * (0.62 + i * 0.07));
    lines += `<path d="M0 ${y} Q ${w * 0.3} ${y - 30 - r() * 40} ${w * 0.6} ${y} T ${w} ${y - 10}" stroke="#fff" stroke-opacity="${(0.06 + i * 0.03).toFixed(2)}" stroke-width="2" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="moon"><stop offset="0" stop-color="#fff8ec"/><stop offset="1" stop-color="#f1d9b5"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="20"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${bokeh(r, w, h, 16)}
  <circle cx="${moonX}" cy="${moonY}" r="${moonR * 2.2}" fill="#fff3dc" opacity="0.18" filter="url(#blur)"/>
  <circle cx="${moonX}" cy="${moonY}" r="${moonR}" fill="url(#moon)" opacity="0.92"/>
  ${lines}
</svg>`;
}
