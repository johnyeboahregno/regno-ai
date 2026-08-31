<script lang="ts">
  // Full-screen animated "neural constellation" — an abstract CORTEX brain that
  // blends into the page. Neurons drift, synapses spark, and signal pulses race
  // along the connections. Theme-aware (reads --signal / --signal-2 / --signal-blue),
  // DPR-aware, mouse-interactive, and honours prefers-reduced-motion.

  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let canvas: HTMLCanvasElement;
  let mounted = false;

  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let reduced = false;

  let W = 0;
  let H = 0;

  // Theme colours, refreshed when data-theme changes.
  let cSignal: [number, number, number] = [108, 92, 231];
  let cSignal2: [number, number, number] = [141, 123, 255];
  let cBlue: [number, number, number] = [79, 141, 255];
  let cLine: [number, number, number] = [26, 30, 53];

  type Neuron = {
    x: number;
    y: number;
    bx: number;
    by: number;
    vx: number;
    vy: number;
    r: number;
    core: boolean;
    phase: number;
    freq: number;
    amp: number;
    hue: number; // 0 = signal, 1 = signal-2, 2 = blue
  };

  type Edge = [number, number];

  type Pulse = {
    e: number;
    t: number;
    speed: number;
    hue: number;
  };

  let neurons: Neuron[] = [];
  let edges: Edge[] = [];
  let pulses: Pulse[] = [];

  const CORE_COUNT = 22;
  const EDGE_MAX = 320;
  const MOUSE_R = 160;

  let mouse = { x: -9999, y: -9999 };

  function hexToRgb(hex: string): [number, number, number] {
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return [108, 92, 231];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(c: [number, number, number], a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function hueRgb(hue: number): [number, number, number] {
    return hue === 0 ? cSignal : hue === 1 ? cSignal2 : cBlue;
  }

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const signal = cs.getPropertyValue('--signal').trim();
    const signal2 = cs.getPropertyValue('--signal-2').trim();
    const blue = cs.getPropertyValue('--signal-blue').trim();
    const line = cs.getPropertyValue('--line-soft').trim();
    if (signal) cSignal = hexToRgb(signal);
    if (signal2) cSignal2 = hexToRgb(signal2);
    if (blue) cBlue = hexToRgb(blue);
    if (line) cLine = hexToRgb(line);
  }

  function build() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = w;
    H = h;

    // A dense "cortex lobe" sits up-right of the hero copy; the rest scatter wide.
    const coreX = w * 0.7;
    const coreY = h * 0.4;
    const count = Math.max(64, Math.min(150, Math.floor((w * h) / 13000)));
    const lobe = Math.max(120, Math.min(w, h) * 0.16);

    neurons = [];
    for (let i = 0; i < count; i++) {
      const isCore = i < CORE_COUNT;
      let x: number, y: number;
      if (isCore) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * lobe;
        x = coreX + Math.cos(ang) * rad * (0.4 + Math.random() * 0.8);
        y = coreY + Math.sin(ang) * rad * (0.35 + Math.random() * 0.75);
      } else {
        x = Math.random() * w;
        y = Math.random() * h;
      }
      neurons.push({
        x,
        y,
        bx: x,
        by: y,
        vx: 0,
        vy: 0,
        r: isCore ? 1.7 + Math.random() * 2 : 0.7 + Math.random() * 1.2,
        core: isCore,
        phase: Math.random() * Math.PI * 2,
        freq: 0.08 + Math.random() * 0.22,
        amp: isCore ? 5 + Math.random() * 6 : 12 + Math.random() * 26,
        hue: Math.random() < 0.42 ? 0 : Math.random() < 0.6 ? 1 : 2
      });
    }

    // Synapses: near pairs, plus nearest-2 so nothing is stranded.
    edges = [];
    const seen = new Set<string>();
    const key = (a: number, b: number) => (a < b ? a + '_' + b : b + '_' + a);
    const add = (a: number, b: number) => {
      const k = key(a, b);
      if (!seen.has(k)) {
        seen.add(k);
        edges.push([a, b]);
      }
    };

    const EDGE = Math.max(120, Math.min(w, h) * 0.14);
    const EDGE2 = EDGE * EDGE;
    for (let i = 0; i < count; i++) {
      const A = neurons[i];
      for (let j = i + 1; j < count; j++) {
        const B = neurons[j];
        const dx = B.bx - A.bx;
        const dy = B.by - A.by;
        const d = dx * dx + dy * dy;
        if (d < EDGE2) add(i, j);
      }
    }
    for (let i = 0; i < count; i++) {
      const A = neurons[i];
      let best: { j: number; d: number }[] = [];
      for (let j = 0; j < count; j++) {
        if (j === i) continue;
        const B = neurons[j];
        const dx = B.bx - A.bx;
        const dy = B.by - A.by;
        const d = dx * dx + dy * dy;
        if (best.length < 2) best.push({ j, d });
        else if (d < best[0].d || d < best[1].d) {
          best.sort((p, q) => p.d - q.d);
          best[1] = { j, d };
        }
      }
      for (const { j, d } of best) {
        if (d < EDGE_MAX * EDGE_MAX) add(i, j);
      }
    }

    // Signal pulses racing along synapses.
    pulses = [];
    const want = Math.min(56, edges.length);
    for (let i = 0; i < want; i++) {
      pulses.push({
        e: Math.floor(Math.random() * edges.length),
        t: Math.random(),
        speed: 0.0011 + Math.random() * 0.0024,
        hue: Math.random() < 0.6 ? 0 : Math.random() < 0.6 ? 1 : 2
      });
    }
  }

  function step(now: number) {
    const t = now / 1000;

    // ── update neurons ─────────────────────────────────────────────
    for (const n of neurons) {
      let tx = n.bx + Math.sin(t * n.freq * Math.PI + n.phase) * n.amp;
      let ty = n.by + Math.cos(t * n.freq * Math.PI * 0.9 + n.phase) * n.amp;

      const mdx = n.x - mouse.x;
      const mdy = n.y - mouse.y;
      const md = Math.hypot(mdx, mdy);
      if (md < MOUSE_R && md > 0.001) {
        const f = ((MOUSE_R - md) / MOUSE_R) * 26;
        tx += (mdx / md) * f;
        ty += (mdy / md) * f;
      }

      n.vx += (tx - n.x) * 0.018;
      n.vy += (ty - n.y) * 0.018;
      n.vx *= 0.9;
      n.vy *= 0.9;
      n.x += n.vx;
      n.y += n.vy;
    }

    // ── advance pulses ─────────────────────────────────────────────
    for (const p of pulses) {
      p.t += p.speed;
      if (p.t > 1) {
        p.e = Math.floor(Math.random() * edges.length);
        p.t = 0;
        p.speed = 0.0011 + Math.random() * 0.0024;
      }
    }

    draw();
    raf = requestAnimationFrame(step);
  }

  function draw() {
    const c = ctx!;
    c.clearRect(0, 0, W, H);

    // synapses
    for (const [a, b] of edges) {
      const A = neurons[a];
      const B = neurons[b];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const d = Math.hypot(dx, dy);
      const alpha = Math.max(0, 1 - d / EDGE_MAX);
      if (alpha <= 0.02) continue;
      const core = A.core || B.core;
      c.strokeStyle = rgba(cLine, alpha * (core ? 0.5 : 0.34));
      c.lineWidth = core ? 0.8 : 0.6;
      c.beginPath();
      c.moveTo(A.x, A.y);
      c.lineTo(B.x, B.y);
      c.stroke();
    }

    // pulses
    for (const p of pulses) {
      const e = edges[p.e];
      if (!e) continue;
      const A = neurons[e[0]];
      const B = neurons[e[1]];
      const x = A.x + (B.x - A.x) * p.t;
      const y = A.y + (B.y - A.y) * p.t;
      const col = hueRgb(p.hue);
      c.fillStyle = rgba(col, 0.16);
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = rgba(col, 0.95);
      c.beginPath();
      c.arc(x, y, 1.5, 0, Math.PI * 2);
      c.fill();
    }

    // neurons
    for (const n of neurons) {
      const col = hueRgb(n.hue);
      if (n.core) {
        const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
        g.addColorStop(0, rgba(col, 0.4));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = rgba(col, n.core ? 0.9 : 0.55);
      c.beginPath();
      c.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      c.fill();
    }
  }

  function onResize() {
    build();
    if (reduced) draw();
  }

  function onPointer(e: PointerEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onLeave() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  let mo: MutationObserver;

  onMount(() => {
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    readColors();
    build();
    mounted = true;

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    mo = new MutationObserver(() => {
      readColors();
      if (reduced) draw();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    if (reduced) {
      draw();
    } else {
      raf = requestAnimationFrame(step);
    }
  });

  onDestroy(() => {
    if (!browser) return;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerleave', onLeave);
    mo?.disconnect();
  });
</script>

<div class="bg" aria-hidden="true">
  <div class="aurora a1"></div>
  <div class="aurora a2"></div>
  <div class="aurora a3"></div>
  <div class="grid"></div>
  <canvas class="neural" class:on={mounted} bind:this={canvas}></canvas>
  <div class="vignette"></div>
</div>

<style>
  .bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .aurora {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.42;
    mix-blend-mode: screen;
    will-change: transform;
  }
  .a1 {
    width: 58vmax;
    height: 58vmax;
    left: -22vmax;
    top: -26vmax;
    background: radial-gradient(circle at center, var(--signal-blue), transparent 62%);
    animation: drift1 26s ease-in-out infinite alternate;
  }
  .a2 {
    width: 54vmax;
    height: 54vmax;
    right: -20vmax;
    top: 16%;
    background: radial-gradient(circle at center, var(--signal), transparent 62%);
    animation: drift2 34s ease-in-out infinite alternate;
  }
  .a3 {
    width: 46vmax;
    height: 46vmax;
    left: 28%;
    bottom: -24vmax;
    background: radial-gradient(circle at center, var(--signal-2), transparent 62%);
    animation: drift3 40s ease-in-out infinite alternate;
  }

  @keyframes drift1 {
    to { transform: translate(7vmax, 5vmax) scale(1.1); }
  }
  @keyframes drift2 {
    to { transform: translate(-6vmax, 7vmax) scale(1.12); }
  }
  @keyframes drift3 {
    to { transform: translate(5vmax, -6vmax) scale(1.08); }
  }

  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--line-soft) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
    background-size: 46px 46px;
    background-position: -1px -1px;
    opacity: 0.35;
    -webkit-mask-image: radial-gradient(ellipse at 50% 38%, rgba(0, 0, 0, 0.85), transparent 78%);
    mask-image: radial-gradient(ellipse at 50% 38%, rgba(0, 0, 0, 0.85), transparent 78%);
  }

  .neural {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 1.4s ease;
  }
  .neural.on { opacity: 1; }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, transparent 42%, var(--bg-deep) 100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .aurora { animation: none; }
  }
</style>
